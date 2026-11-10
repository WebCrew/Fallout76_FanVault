<?php
declare(strict_types=1);

namespace FanVault;

final class AuthHttp
{
    public function __construct(
        private readonly DeviceAuthorization $auth,
        private readonly NetTwinIdentity $identity,
        private readonly string $origin,
        private readonly ?MemberSearch $members = null
    ) {}

    /** Input comes from a bounded HTTP request and a server-validated browser identity. */
    public function handle(
        string $method, string $action, string $origin, string $type, string $body,
        array $form, string $authorization, string $client, ?array $browser, string $csrf, bool $signedIn = false
    ): array {
        if ($origin !== '' && $origin !== $this->origin) return self::json(403, ['error' => 'invalid_origin']);
        if ($action === 'approve') return $this->approval($method, $origin, $form, $browser, $csrf, $signedIn);
        if (!in_array($action, ['device', 'exchange', 'me', 'logout', 'member-search'], true)) return self::json(404, ['error' => 'not_found']);
        if ($method !== ($action === 'me' ? 'GET' : 'POST')) return self::json(405, ['error' => 'invalid_method']);
        if (!$this->auth->allow($action . ':' . $client, in_array($action, ['device', 'member-search'], true) ? 20 : 120)) {
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
        if ($action === 'member-search') {
            $session = $this->auth->session($token);
            if ($session === null) return self::json(401, ['error' => 'unauthorized']);
            if ($this->members === null) return self::json(503, ['error' => 'search_unavailable']);
            if (!$this->auth->allow('member-search:account:' . $session['subject'], 20)) {
                return self::json(429, ['error' => 'slow_down']);
            }
            [$status, $result] = $this->members->lookup($session['subject'], $data);
            return self::json($status, $result);
        }
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

    private function approval(string $method, string $origin, array $form, ?array $browser, string $csrf, bool $signedIn): array
    {
        if ($browser === null) {
            if ($method !== 'GET') return self::json(401, ['error' => 'login_required']);
            if ($signedIn) {
                return self::page(403, '<h2>Diese Net-Twin-Sitzung ist nicht für den Test freigegeben</h2>'
                    . '<p>Öffne diese FanVault-Seite in einem privaten Browserfenster oder melde dich im Browser um. '
                    . 'Verwende das vereinbarte Testkonto. Danach kannst du hier den App-Code eingeben.</p>'
                    . self::continueLink());
            }
            return self::page(200, '<h2>Bei Net-Twin anmelden</h2><ol>'
                . '<li>Melde dich zuerst bei Net-Twin mit dem vereinbarten Testkonto an.'
                . '<p><a class="button" href="/signin" target="_blank" rel="noopener noreferrer">Net-Twin-Anmeldung öffnen (neuer Tab)</a></p></li>'
                . '<li>Kehre danach zu diesem Tab zurück und öffne das Eingabefeld für den Code aus FanVault.'
                . self::continueLink() . '</li></ol>');
        }
        if ($csrf === '') return self::json(503, ['error' => 'service_unavailable']);
        if ($method === 'GET') {
            return self::page(200, '<h2>App-Code eingeben</h2><p>Angemeldet als <strong>' . self::html($browser['display_name']) . '</strong>.</p>'
                . '<p id="code-help">Gib nur den Code ein, den deine eigene FanVault-App gerade anzeigt.</p>'
                . '<form method="post" action="?action=approve"><label for="app-code">Bestätigungscode (Enter-Code)</label>'
                . '<input id="app-code" name="user_code" maxlength="11" required autocomplete="off" spellcheck="false" aria-describedby="code-help">'
                . '<input type="hidden" name="csrf" value="' . self::html($csrf) . '">'
                . '<p class="actions"><button class="button" name="decision" value="approve">FanVault anmelden</button> '
                . '<button class="button secondary" name="decision" value="deny">Ablehnen</button></p></form>');
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
        if (!$ok) return self::page(400, '<p>Der Code ist ungültig, abgelaufen oder bereits verwendet. Starte bei Bedarf eine neue Anmeldung in FanVault.</p>'
            . self::continueLink());
        return self::page(200, $decision === 'approve'
            ? '<p>FanVault wurde freigegeben. Du kannst zu deiner App zurückkehren.</p>'
            : '<p>Die Anmeldung wurde abgelehnt. Du kannst dieses Fenster schließen.</p>');
    }

    public static function headers(): array
    {
        return [
            'Cache-Control' => 'no-store',
            'Content-Security-Policy' => "default-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'; style-src 'sha256-"
                . base64_encode(hash('sha256', str_replace("\r\n", "\n", self::PAGE_STYLE), true)) . "'",
            'Referrer-Policy' => 'same-origin',
            'X-Content-Type-Options' => 'nosniff'
        ];
    }

    public static function json(int $status, array $data): array
    {
        return [$status, 'application/json; charset=utf-8', json_encode($data, JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE)];
    }

    private static function html(string $value): string { return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

    private const PAGE_STYLE = <<<'CSS'
        * { box-sizing: border-box }
        body { margin: 0; padding: clamp(1rem, 6vw, 4rem) 1rem; color: #eff5fb; background: #101822; font: 1rem/1.55 system-ui, sans-serif }
        main { width: min(100%, 36rem); margin: auto; padding: clamp(1.25rem, 5vw, 2.5rem); background: #192736; border: 1px solid #3c5266; border-radius: 1rem; box-shadow: 0 1rem 3rem #080d1480 }
        .brand { color: #ffd369; font-weight: 800; letter-spacing: .12em; text-transform: uppercase }
        h1 { margin: .35rem 0 1.25rem; font-size: clamp(1.65rem, 5vw, 2.25rem); line-height: 1.2 }
        h2 { font-size: 1.15rem; margin: 0 }
        p { margin: .75rem 0 }
        ol { padding-inline-start: 1.5rem }
        li + li { margin-top: 1.2rem }
        label { display: block; font-weight: 700; margin: 1.25rem 0 .45rem }
        input { width: min(100%, 18rem); padding: .75rem; border: 1px solid #859cb0; border-radius: .5rem; background: #101822; color: #fff; font: 1.3rem ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase }
        .actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.25rem }
        .button { display: inline-block; padding: .6rem .9rem; border: 1px solid transparent; border-radius: .5rem; background: #ffd369; color: #15191d; font: inherit; font-weight: 700; text-decoration: none; cursor: pointer }
        .secondary { border-color: #859cb0; background: transparent; color: #eff5fb }
        :focus-visible { outline: 3px solid #fff; outline-offset: 4px }
        CSS;

    private static function continueLink(): string
    {
        return '<p><a class="button secondary" href="?action=approve">Weiter zur Code-Eingabe</a></p>';
    }

    private static function page(int $status, string $content): array
    {
        return [$status, 'text/html; charset=utf-8',
            '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            . '<title>FanVault mit Net-Twin verbinden</title><style>' . self::PAGE_STYLE . '</style></head><body>'
            . '<main><div class="brand">FanVault · Net-Twin</div><h1>FanVault mit Net-Twin verbinden</h1>' . $content . '</main></body></html>'];
    }
}
