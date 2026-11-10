<?php
declare(strict_types=1);

namespace FanVault;

use Closure;

final class MemberSearch
{
    /** @param array<string, array<string, int>> $fields Gamertag field IDs by game and platform. */
    public function __construct(private readonly array $fields, private readonly Closure $find) {}

    public function lookup(string $viewer, array $request): array
    {
        $game = $request['game'] ?? null;
        $platform = $request['platform'] ?? null;
        $tag = $request['tag'] ?? null;
        if (!is_string($game) || !is_string($platform) || !is_string($tag)
            || !preg_match('/^[^\p{C}]{1,64}$/uD', trim($tag))) {
            return [400, ['error' => 'invalid_search']];
        }
        $fields = $this->fields[$game] ?? null;
        if ($fields === null) return [503, ['error' => 'search_unavailable']];
        if (!isset($fields[$platform])) return [400, ['error' => 'invalid_search']];
        return ($this->find)($viewer, $fields, $platform, trim($tag));
    }

    public static function fromSngine(\mysqli $db, array $system, array $configured): self
    {
        $fields = [];
        foreach ($configured as $game => $platforms) {
            if (!is_string($game) || !is_array($platforms) || $platforms === []) continue;
            foreach ($platforms as $platform => $id) {
                if (is_string($platform) && is_int($id) && $id > 0) $fields[$game][$platform] = $id;
            }
        }
        return new self($fields, static function (string $viewer, array $gameFields, string $platform, string $tag) use ($db, $system): array {
            // IDs come from private configuration and are validated integers.
            $ids = implode(',', $gameFields);
            $tagFields = "JOIN custom_fields f ON f.field_id = v.field_id AND f.field_for = 'user'
                          AND f.type = 'textbox' AND f.in_search = '1'";
            $stmt = $db->prepare("SELECT f.field_id, EXISTS(
                    SELECT 1 FROM custom_fields_values own
                    JOIN custom_fields own_field ON own_field.field_id = own.field_id
                    WHERE own.node_type = 'user' AND own.node_id = ? AND own.field_id IN ($ids)
                        AND own_field.field_for = 'user' AND own_field.type = 'textbox' AND TRIM(own.value) <> ''
                ) AS has_tag
                FROM custom_fields f WHERE f.field_id = ? AND f.field_for = 'user' AND f.type = 'textbox' AND f.in_search = '1'");
            try {
                $stmt->execute([$viewer, $gameFields[$platform]]);
                $stmt->bind_result($fieldId, $hasTag);
                if ($stmt->fetch() !== true) return [503, ['error' => 'search_unavailable']];
                if (!$hasTag) return [403, ['error' => 'gamertag_required']];
            } finally {
                $stmt->close();
            }

            $sql = "SELECT DISTINCT u.user_id, u.user_name, TRIM(v.value) AS tag
                    FROM custom_fields_values v $tagFields
                    JOIN users u ON u.user_id = v.node_id
                    WHERE v.node_type = 'user' AND v.field_id = ? AND u.user_id <> ?
                        AND BINARY LOWER(TRIM(v.value)) = BINARY LOWER(?)
                        AND u.user_banned = '0' AND u.user_incognito_enabled = '0'
                        AND u.user_suggestions_hidden = '0'
                        AND NOT EXISTS (SELECT 1 FROM users_blocks b WHERE
                            (b.user_id = ? AND b.blocked_id = u.user_id)
                            OR (b.user_id = u.user_id AND b.blocked_id = ?))";
            if (!empty($system['activation_enabled'])) $sql .= " AND u.user_activated = '1'";
            if (!empty($system['users_approval_enabled'])) $sql .= " AND u.user_approved = '1'";
            $stmt = $db->prepare($sql . ' ORDER BY u.user_id, tag LIMIT 8');
            try {
                // Match Sngine's profile-field storage encoding. Parameters still bind separately.
                $stmt->execute([$fieldId, $viewer, htmlentities($tag, ENT_QUOTES, 'UTF-8'), $viewer, $viewer]);
                $stmt->bind_result($id, $username, $storedTag);
                $players = [];
                while ($stmt->fetch() === true) {
                    $players[(string)$id] = ['user_id' => (string)$id, 'username' => $username,
                        'gamertag' => html_entity_decode($storedTag, ENT_QUOTES, 'UTF-8')];
                }
                return [200, ['players' => array_values($players)]];
            } finally {
                $stmt->close();
            }
        });
    }
}
