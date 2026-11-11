<?php
declare(strict_types=1);

namespace FanVault;

final class WebMemberSearch
{
    public function __construct(private readonly MemberSearch $members, private readonly DeviceAuthorization $limits) {}

    public function handle(string $method, array $form, ?array $browser, string $csrf, string $client): array
    {
        $title = 'Fallout-76-Spieler finden';
        if (!in_array($method, ['GET', 'POST'], true)) {
            return AuthHttp::page(405, '<p>Diese Anfrage wird nicht unterstützt.</p>', $title);
        }
        if ($browser === null) {
            return AuthHttp::page(401, '<p>Melde dich bei Net-Twin an und rufe diese Suche erneut auf.</p>'
                . '<p><a class="button" href="/signin">Bei Net-Twin anmelden</a></p>', $title);
        }
        if ($csrf === '') return AuthHttp::page(503, '<p>Die Suche ist gerade nicht verfügbar.</p>', $title);

        $status = 200;
        $tag = '';
        $results = '';
        if ($method === 'POST') {
            if (!is_string($form['csrf'] ?? null) || !hash_equals($csrf, $form['csrf'])) {
                return AuthHttp::page(403, '<p>Öffne die Suche erneut und versuche es noch einmal.</p>', $title);
            }
            if (!$this->limits->allow('web-member-search:account:' . $browser['id'], 20)
                || !$this->limits->allow('web-member-search:client:' . $client, 60)) {
                return AuthHttp::page(429, '<p>Zu viele Suchen. Versuche es in einer Minute erneut.</p>', $title);
            }
            $tag = is_string($form['tag'] ?? null) ? trim($form['tag']) : '';
            [$status, $payload] = $this->members->lookup($browser['id'], [
                'game' => 'fallout76', 'platform' => 'PC', 'tag' => $tag
            ]);
            $results = $status === 200 ? self::results($payload['players']) : match ($payload['error']) {
                'invalid_search' => '<p role="status">Gib einen vollständigen Gamertag mit bis zu 64 Zeichen ein.</p>',
                'gamertag_required' => '<p role="status">Hinterlege zuerst deinen eigenen PC-Gamertag. '
                    . '<a class="button secondary" href="/settings/profile">Profileinstellungen öffnen</a></p>',
                default => '<p role="status">Die Suche ist gerade nicht verfügbar.</p>'
            };
        }

        return AuthHttp::page($status, '<form method="post">'
            . '<label for="tag">Vollständiger Fallout-76-Gamertag (PC)</label>'
            . '<input id="tag" name="tag" value="' . AuthHttp::html($status === 400 ? '' : $tag)
            . '" maxlength="64" autocomplete="off" spellcheck="false" required>'
            . '<input type="hidden" name="csrf" value="' . AuthHttp::html($csrf) . '">'
            . '<p>Gib auch den Zusatz mit # ein, falls er zum Namen gehört.</p>'
            . '<p><button class="button" type="submit">Spieler suchen</button></p></form>'
            . $results, $title);
    }

    private static function results(array $players): string
    {
        if ($players === []) return '<p role="status">Keine passenden Spieler gefunden.</p>';
        $items = '';
        foreach ($players as $player) {
            $username = $player['username'];
            $profile = AuthHttp::html('@' . $username);
            if (preg_match('/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,159}$/D', $username)) {
                $profile = '<a class="button secondary" href="/' . rawurlencode($username) . '">' . $profile . '</a>';
            }
            $items .= '<li>' . AuthHttp::html($player['gamertag']) . ' · ' . $profile . '</li>';
        }
        return '<section aria-label="Suchergebnisse"><h2>Suchergebnisse</h2>'
            . '<p>Gamertags sind selbst angegeben.</p><ul>' . $items . '</ul></section>';
    }
}
