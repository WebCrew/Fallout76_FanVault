<?php
declare(strict_types=1);

namespace FanVault;

use Closure;
use PDO;
use RuntimeException;
use Throwable;

/**
 * Private server-side store. Do not route HTTP requests directly to these methods.
 * approve/deny require an already authenticated browser action with CSRF validation.
 */
final class DeviceAuthorization
{
    public const FLOW_LIFETIME = 300;
    public const SESSION_LIFETIME = 28800;
    public const POLL_INTERVAL = 3;

    private readonly Closure $clock;
    private readonly Closure $sessionIsActive;

    /** @param callable(string, string): bool $sessionIsActive Check the current Net-Twin session on every use. */
    public function __construct(private readonly PDO $db, callable $sessionIsActive, ?callable $clock = null)
    {
        if ($db->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'sqlite') {
            throw new RuntimeException('This prototype needs PDO SQLite.');
        }
        $this->sessionIsActive = Closure::fromCallable($sessionIsActive);
        $this->clock = $clock === null ? static fn(): int => time() : Closure::fromCallable($clock);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->exec('PRAGMA busy_timeout = 2000');
        $db->exec(
            'CREATE TABLE IF NOT EXISTS fv_device_flows (
                device_hash TEXT PRIMARY KEY, user_code TEXT UNIQUE NOT NULL,
                expires INTEGER NOT NULL, last_poll INTEGER, status TEXT NOT NULL,
                subject TEXT, session_ref TEXT
            );
            CREATE INDEX IF NOT EXISTS fv_device_expiry ON fv_device_flows(expires);
            CREATE TABLE IF NOT EXISTS fv_sessions (
                token_hash TEXT PRIMARY KEY, subject TEXT NOT NULL, session_ref TEXT NOT NULL,
                expires INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS fv_session_expiry ON fv_sessions(expires);
            CREATE TABLE IF NOT EXISTS fv_rate (
                bucket TEXT PRIMARY KEY, expires INTEGER NOT NULL, attempts INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS fv_rate_expiry ON fv_rate(expires);'
        );
    }

    public function start(): array
    {
        return $this->write(function (): array {
            $now = $this->now();
            $this->query('DELETE FROM fv_device_flows WHERE expires <= ?', [$now]);
            $this->query('DELETE FROM fv_sessions WHERE expires <= ?', [$now]);
            // Resource bound only; a real endpoint also needs client/IP request limits.
            if ((int) $this->db->query('SELECT COUNT(*) FROM fv_device_flows')->fetchColumn() >= 256) {
                return ['error' => 'temporarily_unavailable'];
            }
            $device = self::token();
            do {
                $code = strtoupper(bin2hex(random_bytes(5)));
            } while ($this->query('SELECT 1 FROM fv_device_flows WHERE user_code = ?', [$code])->fetchColumn());
            $this->query('INSERT INTO fv_device_flows (device_hash, user_code, expires, status) VALUES (?, ?, ?, ?)',
                [self::digest($device), $code, $now + self::FLOW_LIFETIME, 'pending']);
            return ['device_code' => $device, 'user_code' => substr($code, 0, 5) . '-' . substr($code, 5),
                'expires_in' => self::FLOW_LIFETIME, 'interval' => self::POLL_INTERVAL];
        });
    }

    public function approve(string $code, string $subject, string $sessionRef): bool
    {
        $code = self::userCode($code);
        if ($code === null || !preg_match('/^[1-9][0-9]{0,19}$/D', $subject)
            || !preg_match('/^[a-f0-9]{64}$/D', $sessionRef)
            || !($this->sessionIsActive)($subject, $sessionRef)) {
            return false;
        }
        return $this->query(
            "UPDATE fv_device_flows SET status = 'approved', subject = ?, session_ref = ?
             WHERE user_code = ? AND expires > ? AND status = 'pending'",
            [$subject, $sessionRef, $code, $this->now()]
        )->rowCount() === 1;
    }

    public function deny(string $code): bool
    {
        $code = self::userCode($code);
        return $code !== null && $this->query(
            "UPDATE fv_device_flows SET status = 'denied' WHERE user_code = ? AND expires > ? AND status = 'pending'",
            [$code, $this->now()]
        )->rowCount() === 1;
    }

    public function exchange(string $deviceCode): array
    {
        if (!self::validToken($deviceCode)) return ['error' => 'invalid_grant'];
        return $this->write(function () use ($deviceCode): array {
            $now = $this->now();
            $hash = self::digest($deviceCode);
            $row = $this->query('SELECT * FROM fv_device_flows WHERE device_hash = ?', [$hash])->fetch(PDO::FETCH_ASSOC);
            if (!$row) return ['error' => 'invalid_grant'];
            if ((int) $row['expires'] <= $now) {
                $this->query('DELETE FROM fv_device_flows WHERE device_hash = ?', [$hash]);
                return ['error' => 'expired_token'];
            }
            if ($row['status'] === 'denied') {
                $this->query('DELETE FROM fv_device_flows WHERE device_hash = ?', [$hash]);
                return ['error' => 'access_denied'];
            }
            if ($row['last_poll'] !== null && $now - (int) $row['last_poll'] < self::POLL_INTERVAL) {
                return ['error' => 'slow_down', 'interval' => self::POLL_INTERVAL];
            }
            if ($row['status'] === 'pending') {
                $this->query('UPDATE fv_device_flows SET last_poll = ? WHERE device_hash = ?', [$now, $hash]);
                return ['error' => 'authorization_pending'];
            }
            $this->query('DELETE FROM fv_device_flows WHERE device_hash = ?', [$hash]);
            if (!($this->sessionIsActive)($row['subject'], $row['session_ref'])) {
                return ['error' => 'access_denied'];
            }
            $token = self::token();
            $this->query('INSERT INTO fv_sessions VALUES (?, ?, ?, ?)',
                [self::digest($token), $row['subject'], $row['session_ref'], $now + self::SESSION_LIFETIME]);
            return ['access_token' => $token, 'token_type' => 'Bearer', 'expires_in' => self::SESSION_LIFETIME];
        });
    }

    public function subject(string $token): ?string
    {
        return $this->session($token)['subject'] ?? null;
    }

    public function session(string $token): ?array
    {
        if (!self::validToken($token)) return null;
        $hash = self::digest($token);
        $row = $this->query('SELECT subject, session_ref, expires FROM fv_sessions WHERE token_hash = ?', [$hash])
            ->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        if ((int) $row['expires'] <= $this->now() || !($this->sessionIsActive)($row['subject'], $row['session_ref'])) {
            $this->revoke($token);
            return null;
        }
        return $row;
    }

    public function revoke(string $token): void
    {
        if (self::validToken($token)) $this->query('DELETE FROM fv_sessions WHERE token_hash = ?', [self::digest($token)]);
    }

    public function allow(string $key, int $limit, int $seconds = 60): bool
    {
        return $this->write(function () use ($key, $limit, $seconds): bool {
            $now = $this->now();
            $this->query('DELETE FROM fv_rate WHERE expires <= ?', [$now]);
            $bucket = hash('sha256', $key);
            $attempts = $this->query('SELECT attempts FROM fv_rate WHERE bucket = ?', [$bucket])->fetchColumn();
            if ($attempts !== false && (int) $attempts >= $limit) return false;
            $this->query(
                'INSERT INTO fv_rate VALUES (?, ?, 1) ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1',
                [$bucket, $now + $seconds]
            );
            return true;
        });
    }

    private function now(): int { return ($this->clock)(); }
    private static function token(): string { return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '='); }
    private static function digest(string $token): string { return hash('sha256', $token); }
    private static function validToken(string $token): bool { return (bool) preg_match('/^[A-Za-z0-9_-]{43}$/D', $token); }

    private static function userCode(string $code): ?string
    {
        $code = strtoupper(trim($code));
        if (!preg_match('/^[A-F0-9]{5}-?[A-F0-9]{5}$/D', $code)) return null;
        return str_replace('-', '', $code);
    }

    private function query(string $sql, array $args): \PDOStatement
    {
        $query = $this->db->prepare($sql);
        $query->execute($args);
        return $query;
    }

    private function write(callable $operation): mixed
    {
        // SQLite must acquire the write lock before reading a consumable grant.
        $this->db->exec('BEGIN IMMEDIATE');
        try {
            $value = $operation();
            $this->db->exec('COMMIT');
            return $value;
        } catch (Throwable $error) {
            $this->db->exec('ROLLBACK');
            throw $error;
        }
    }
}
