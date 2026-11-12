<?php
declare(strict_types=1);

namespace FanVault;

use Closure;
use PDO;

final class GuildDirectory
{
    private const ROSTER_PAGE_SIZE = 30;

    public function __construct(
        private readonly PDO $state,
        private readonly string $origin,
        private readonly Closure $groups,
        private readonly Closure $members
    ) {
        $state->exec('CREATE TABLE IF NOT EXISTS fv_guild_homes (group_id TEXT PRIMARY KEY)');
    }

    public static function fromSngine(PDO $state, string $origin, \mysqli $db): self
    {
        $groups = static function (string $viewer, ?string $slug) use ($db): array {
            $sql = "SELECT g.group_id, g.group_name, g.group_title,
                           EXISTS(SELECT 1 FROM groups_admins a WHERE a.group_id = g.group_id AND a.user_id = ?) AS can_manage
                    FROM groups_members m JOIN `groups` g ON g.group_id = m.group_id
                    WHERE m.user_id = ? AND m.approved = '1'";
            $args = [$viewer, $viewer];
            if ($slug !== null) {
                $sql .= ' AND g.group_name = ?';
                $args[] = $slug;
            }
            $stmt = $db->prepare($sql . ' ORDER BY g.group_title, g.group_id');
            try {
                $stmt->execute($args);
                $stmt->bind_result($id, $name, $title, $canManage);
                $rows = [];
                while ($stmt->fetch() === true) {
                    $rows[] = ['id' => (string)$id, 'name' => $name,
                        'title' => html_entity_decode($title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                        'can_manage' => (bool)$canManage];
                }
                return $rows;
            } finally {
                $stmt->close();
            }
        };
        $members = static function (string $viewer, string $groupId, string $after) use ($db): ?array {
            $stmt = $db->prepare("SELECT gm.user_id, gm.user_name
                FROM groups_members viewer
                LEFT JOIN (SELECT m.group_id, m.user_id, u.user_name
                    FROM groups_members m JOIN users u ON u.user_id = m.user_id AND u.user_banned = '0'
                    WHERE m.approved = '1') gm ON gm.group_id = viewer.group_id AND gm.user_id > ?
                WHERE viewer.user_id = ? AND viewer.group_id = ? AND viewer.approved = '1'
                ORDER BY gm.user_id LIMIT " . (self::ROSTER_PAGE_SIZE + 1));
            try {
                $stmt->execute([$after, $viewer, $groupId]);
                $stmt->bind_result($id, $username);
                if ($stmt->fetch() !== true) return null;
                $rows = [];
                do {
                    if ($id !== null) $rows[] = ['id' => (string)$id, 'username' => $username];
                } while ($stmt->fetch() === true);
                return $rows;
            } finally {
                $stmt->close();
            }
        };
        return new self($state, $origin, $groups, $members);
    }

    public function handle(string $viewer, array $input): array
    {
        return match ($input['operation'] ?? null) {
            'list' => $this->list($viewer),
            'link' => $this->link($viewer, $input['url'] ?? null),
            'members' => $this->roster($viewer, $input['group_id'] ?? null, $input['after'] ?? '0'),
            default => [400, ['error' => 'invalid_guild_request']]
        };
    }

    private function list(string $viewer): array
    {
        $linked = $this->state->query('SELECT group_id FROM fv_guild_homes')->fetchAll(PDO::FETCH_COLUMN);
        $linked = array_fill_keys($linked, true);
        $result = [];
        foreach (($this->groups)($viewer, null) as $group) {
            if (isset($linked[$group['id']])) $result[] = $this->profile($group);
        }
        return [200, ['guilds' => $result]];
    }

    private function link(string $viewer, mixed $url): array
    {
        if (!is_string($url) || !preg_match('~^' . preg_quote($this->origin, '~')
                . '/groups/([a-zA-Z0-9_.-]+)/?$~D', trim($url), $match)
            || in_array($match[1], ['.', '..'], true)) {
            return [400, ['error' => 'invalid_guild_home']];
        }
        $group = ($this->groups)($viewer, $match[1])[0] ?? null;
        if ($group === null || !$group['can_manage']) return [403, ['error' => 'guild_manager_required']];
        $stmt = $this->state->prepare('INSERT OR IGNORE INTO fv_guild_homes (group_id) VALUES (?)');
        $stmt->execute([$group['id']]);
        return [200, ['guild' => $this->profile($group)]];
    }

    private function roster(string $viewer, mixed $id, mixed $after): array
    {
        if (!is_string($id) || !is_string($after)
            || !preg_match('/^[1-9][0-9]{0,19}$/D', $id)
            || !preg_match('/^(?:0|[1-9][0-9]{0,19})$/D', $after)) {
            return [400, ['error' => 'invalid_guild_request']];
        }
        $stmt = $this->state->prepare('SELECT 1 FROM fv_guild_homes WHERE group_id = ?');
        $stmt->execute([$id]);
        $rows = $stmt->fetchColumn() ? ($this->members)($viewer, $id, $after) : null;
        if ($rows === null) return [403, ['error' => 'guild_membership_required']];
        $page = array_slice($rows, 0, self::ROSTER_PAGE_SIZE);
        return [200, ['members' => $page, 'next' => count($rows) > self::ROSTER_PAGE_SIZE ? end($page)['id'] : null]];
    }

    private function profile(array $group): array
    {
        return ['id' => $group['id'], 'title' => $group['title'],
            'url' => $this->origin . '/groups/' . rawurlencode($group['name'])];
    }
}
