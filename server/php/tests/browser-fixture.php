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
use FanVault\DeviceAuthorization;
use FanVault\NetTwinIdentity;
use FanVault\AuthHttp;

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
$http = new AuthHttp($auth, $identity, $origin);
[$status, $type, $body] = $http->handle($_SERVER['REQUEST_METHOD'], $_GET['action'] ?? '',
    $_SERVER['HTTP_ORIGIN'] ?? '', $_SERVER['CONTENT_TYPE'] ?? '',
    file_get_contents('php://input', false, null, 0, 1025) ?: '', $_POST,
    $_SERVER['HTTP_AUTHORIZATION'] ?? '', 'loopback-fixture', $browser, $csrf, $user->_logged_in);
http_response_code($status);
header('Content-Type: ' . $type);
echo $body;
