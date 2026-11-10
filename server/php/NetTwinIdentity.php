<?php
declare(strict_types=1);

namespace FanVault;

use Closure;

final class NetTwinIdentity
{
    private readonly Closure $findSession;

    /** @param callable(string,string): ?string $findSession Current username for the eligible user and session digest. */
    public function __construct(callable $findSession)
    {
        $this->findSession = Closure::fromCallable($findSession);
    }

    public static function fromSngine(\mysqli $db, array $system, array $pilotUsers): self
    {
        return new self(static function (string $userId, string $digest) use ($db, $system, $pilotUsers): ?string {
            if (empty($system['system_live']) || !empty($system['viewer_ip_banned'])) return null;
            // Sngine stores these flags as ENUM labels; numeric comparisons use their positions.
            $sql = "SELECT u.user_name FROM users_sessions s JOIN users u ON u.user_id = s.user_id
                    WHERE s.user_id = ? AND SHA2(s.session_token, 256) = ? AND u.user_banned = '0'";
            if (!empty($system['activation_enabled'])) $sql .= " AND u.user_activated = '1'";
            if (!empty($system['users_approval_enabled'])) $sql .= " AND u.user_approved = '1'";
            $stmt = $db->prepare($sql . ' LIMIT 1');
            try {
                $stmt->bind_param('ss', $userId, $digest);
                $stmt->execute();
                $stmt->bind_result($username);
                return $stmt->fetch() === true && is_string($username) && in_array($username, $pilotUsers, true)
                    ? $username : null;
            } finally {
                $stmt->close();
            }
        });
    }

    public function browser(object $user, array $cookies): ?array
    {
        $data = $user->_data ?? [];
        $id = (string) ($data['user_id'] ?? '');
        $token = $data['active_session_token'] ?? null;
        $cookie = $cookies['xs'] ?? null;
        if (($user->_logged_in ?? false) !== true || ($user->_login_as ?? true) !== false
            || !empty($user->_is_banned) || !preg_match('/^[1-9][0-9]{0,19}$/D', $id)
            || !is_string($cookies['c_user'] ?? null) || !hash_equals($id, $cookies['c_user'])
            || !is_string($cookie) || !is_string($token) || $token === '' || !hash_equals($token, $cookie)) return null;
        $ref = hash('sha256', $token);
        $name = ($this->findSession)($id, $ref);
        return $name === null ? null : ['id' => $id, 'session_ref' => $ref, 'display_name' => $name];
    }

    public function isActive(string $id, string $ref): bool
    {
        return $this->displayName($id, $ref) !== null;
    }

    public function displayName(string $id, string $ref): ?string
    {
        return ($this->findSession)($id, $ref);
    }
}
