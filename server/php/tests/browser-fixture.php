<?php
declare(strict_types=1);

// Local test fixture only. The real Net-Twin browser identity adapter is not installed.
$key = getenv('FANVAULT_FIXTURE_KEY') ?: '';
$origin = getenv('FANVAULT_FIXTURE_ORIGIN') ?: '';
if (PHP_SAPI !== 'cli-server' || ($_SERVER['REMOTE_ADDR'] ?? '') !== '127.0.0.1'
    || !preg_match('/^[a-f0-9]{64}$/D', $key)
    || !preg_match('#^http://127\.0\.0\.1:[0-9]+$#D', $origin)) {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../DeviceAuthorization.php';
require __DIR__ . '/../NetTwinIdentity.php';
require __DIR__ . '/../AuthHttp.php';
require __DIR__ . '/../MemberSearch.php';
require __DIR__ . '/../WebMemberSearch.php';
require __DIR__ . '/../GuildDirectory.php';
use FanVault\DeviceAuthorization;
use FanVault\NetTwinIdentity;
use FanVault\AuthHttp;
use FanVault\MemberSearch;
use FanVault\WebMemberSearch;
use FanVault\GuildDirectory;

foreach (AuthHttp::headers() as $name => $value) header($name . ': ' . $value);
$binding = hash('sha256', $key);
$database = getenv('FANVAULT_FIXTURE_DB');
$identity = new NetTwinIdentity(static fn(string $id, string $ref): ?string =>
    !is_file($database . '.revoked') && $id === '42' && hash_equals($binding, $ref) ? 'Test Player' : null);
$auth = new DeviceAuthorization(new PDO('sqlite:' . $database), $identity->isActive(...));
$user = (object) [
    '_logged_in' => isset($_COOKIE['xs']) && is_string($_COOKIE['xs']) && hash_equals($key, $_COOKIE['xs']),
    '_login_as' => isset($_COOKIE['test_impersonation']),
    '_is_banned' => false, '_data' => ['user_id' => '42', 'active_session_token' => $key]
];
$browser = $identity->browser($user, $_COOKIE);
$csrf = $browser === null ? '' : hash_hmac('sha256', 'browser-confirmation', $key);
$members = new MemberSearch(['fallout76' => ['PC' => 99]],
    static function (string $viewer, array $fields, string $platform, string $tag) use ($database): array {
        if (is_file($database . '.no-tag')) return [403, ['error' => 'gamertag_required']];
        $matches = $viewer === '42' && $fields[$platform] === 99 && strcasecmp($tag, 'Fixture Player#1234') === 0;
        return [200, ['players' => $matches ? [
            ['user_id' => '43', 'username' => 'fixture-player', 'gamertag' => 'Fixture Player#1234']
        ] : []]];
    });
if (parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) === '/players.php') {
    $webCsrf = $browser === null ? '' : hash_hmac('sha256', 'players:' . $browser['session_ref'], $key);
    [$status, $type, $body] = (new WebMemberSearch($members, $auth))->handle(
        $_SERVER['REQUEST_METHOD'], $_POST, $browser, $webCsrf, 'loopback-fixture'
    );
    http_response_code($status);
    header('Content-Type: ' . $type);
    exit($body);
}
$guilds = new GuildDirectory(new PDO('sqlite:' . $database), $origin,
    static function (string $viewer, ?string $slug) use ($database): array {
        if ($viewer !== '42' || is_file($database . '.left-guild')) return [];
        $groups = [
            ['id' => '7', 'name' => 'fixture-guild', 'title' => 'Fixture Guild', 'can_manage' => true],
            ['id' => '8', 'name' => 'other-guild', 'title' => 'Other Guild', 'can_manage' => false]
        ];
        return $slug === null ? $groups : array_values(array_filter($groups, static fn(array $group): bool => $group['name'] === $slug));
    },
    static fn(string $viewer, string $group, string $after): ?array =>
        $viewer === '42' && $group === '7' && !is_file($database . '.left-guild')
            ? ($after === '0' ? [['id' => '42', 'username' => 'fixture-leader'], ['id' => '43', 'username' => 'fixture-player']] : [])
            : null
);
$http = new AuthHttp($auth, $identity, $origin, $members, $guilds);
[$status, $type, $body] = $http->handle($_SERVER['REQUEST_METHOD'], $_GET['action'] ?? '',
    $_SERVER['HTTP_ORIGIN'] ?? '', $_SERVER['CONTENT_TYPE'] ?? '',
    file_get_contents('php://input', false, null, 0, 1025) ?: '', $_POST,
    $_SERVER['HTTP_AUTHORIZATION'] ?? '', 'loopback-fixture', $browser, $csrf, $user->_logged_in);
http_response_code($status);
header('Content-Type: ' . $type);
echo $body;
