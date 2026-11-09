<?php
declare(strict_types=1);

namespace FanVault;

final class AuthHttp
{
    public function __construct(
        private readonly DeviceAuthorization $auth,
        private readonly NetTwinIdentity $identity,
        private readonly string $origin
    ) {}

    /** Input comes from a bounded HTTP request and a server-validated browser identity. */
    public function handle(
        string $method, string $action, string $origin, string $type, string $body,
        array $form, string $authorization, string $client, ?array $browser, string $csrf
    ): array {
        if ($origin !== '' && $origin !== $this->origin) return self::json(403, ['error' => 'invalid_origin']);
        if ($action === 'approve') return $this->approval($method, $origin, $form, $browser, $csrf);
        if (!in_array($action, ['device', 'exchange', 'me', 'logout'], true)) return self::json(404, ['error' => 'not_found']);
        if ($method !== ($action === 'me' ? 'GET' : 'POST')) return self::json(405, ['error' => 'invalid_method']);
        if (!$this->auth->allow($action . ':' . $client, $action === 'device' ? 20 : 120)) {
            return self::json(429, ['error' => 'slow_down', 'interval' => 10]);
        }
        $token = preg_match('/^Bearer ([A-Za-z0-9_-]{43})$/D', $authorization, $match) ? $match[1] : '';
        if ($action === 'me') {
            $session = $this->auth->session($token);
            $name = $session === null ? null : $this->identity->displayName($session['subject'], $session['session_ref']);
            return $name === null ? self::json(401, ['error' => 'unauthorized'])
                : self::json(200, ['user_id' => $session['subject'], 'display_name' => $name]);
        }
        if (strlen($body) > 1024 || strtolower(trim(explode(';', $type)[0])) !== 'application/json') {
            return self::json(415, ['error' => 'invalid_request']);
        }
        $data = json_decode($body, true);
        if (!is_array($data)) return self::json(400, ['error' => 'invalid_request']);
        if ($action === 'device') {
            if (!$this->auth->allow('global:device', 120)) return self::json(429, ['error' => 'slow_down']);
            $result = $this->auth->start();
            return self::json(isset($result['error']) ? 503 : 200, $result);
        }
        if ($action === 'logout') {
            $this->auth->revoke($token);
            return self::json(200, ['status' => 'revoked']);
        }
        $device = $data['device_code'] ?? null;
        if (!is_string($device)) return self::json(400, ['error' => 'invalid_grant']);
        $result = $this->auth->exchange($device);
        return self::json(isset($result['error']) ? 400 : 200, $result);
    }

    private function approval(string $method, string $origin, array $form, ?array $browser, string $csrf): array
    {
        if ($browser === null) {
            if ($method !== 'GET') return self::json(401, ['error' => 'login_required']);
            return self::page(200, '<p>Melde dich zuerst bei Net-Twin an. Lade danach diese Seite neu.</p>'
                . '<p><a href="/signin" target="_blank" rel="noopener noreferrer">Net-Twin-Anmeldung öffnen</a></p>');
        }
        if ($csrf === '') return self::json(503, ['error' => 'service_unavailable']);
        if ($method === 'GET') {
            return self::page(200, '<p>Angemeldet als <strong>' . self::html($browser['display_name']) . '</strong>.</p>'
                . '<p>Gib nur den Code ein, den deine eigene FanVault-App gerade anzeigt. Verwende keinen Code, den dir jemand zugeschickt hat.</p>'
                . '<form method="post"><label>Bestätigungscode <input name="user_code" maxlength="11" required autocomplete="off"></label>'
                . '<input type="hidden" name="csrf" value="' . self::html($csrf) . '">'
                . '<p><button name="decision" value="approve">FanVault anmelden</button> '
                . '<button name="decision" value="deny">Ablehnen</button></p></form>');
        }
        if ($method !== 'POST' || $origin !== $this->origin
            || !is_string($form['csrf'] ?? null) || !hash_equals($csrf, $form['csrf'])) {
            return self::json(403, ['error' => 'invalid_browser_action']);
        }
        if (!$this->auth->allow('approve:' . $browser['id'], 8)) {
            return self::page(429, '<p>Zu viele Versuche. Bitte warte eine Minute.</p>');
        }
        $code = $form['user_code'] ?? null;
        $decision = $form['decision'] ?? null;
        if (!is_string($code) || strlen($code) > 16 || !in_array($decision, ['approve', 'deny'], true)) {
            return self::page(400, '<p>Ungültige Anfrage. Öffne die Freigabeseite erneut aus FanVault.</p>');
        }
        $ok = $decision === 'approve' ? $this->auth->approve($code, $browser['id'], $browser['session_ref']) : $this->auth->deny($code);
        if (!$ok) return self::page(400, '<p>Der Code ist ungültig, abgelaufen oder bereits verwendet. Starte bei Bedarf eine neue Anmeldung in FanVault.</p>');
        return self::page(200, $decision === 'approve'
            ? '<p>FanVault wurde freigegeben. Du kannst zu deiner App zurückkehren.</p>'
            : '<p>Die Anmeldung wurde abgelehnt. Du kannst dieses Fenster schließen.</p>');
    }

    public static function headers(): array
    {
        return [
            'Cache-Control' => 'no-store',
            'Content-Security-Policy' => "default-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
            'Referrer-Policy' => 'same-origin',
            'X-Content-Type-Options' => 'nosniff'
        ];
    }

    public static function json(int $status, array $data): array
    {
        return [$status, 'application/json; charset=utf-8', json_encode($data, JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE)];
    }

    private static function html(string $value): string { return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

    private static function page(int $status, string $content): array
    {
        return [$status, 'text/html; charset=utf-8',
            '<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            . '<title>FanVault mit Net-Twin verbinden</title><main><h1>FanVault mit Net-Twin verbinden</h1>' . $content . '</main></html>'];
    }
}
