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
use FanVault\DeviceAuthorization;

header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; form-action 'self'");
header('X-Content-Type-Options: nosniff');
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
$binding = hash('sha256', $key);
$auth = new DeviceAuthorization(new PDO('sqlite:' . getenv('FANVAULT_FIXTURE_DB')),
    static fn(string $id, string $ref): bool => $id === '42' && hash_equals($binding, $ref));

function answer(int $status, array $data): never {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_THROW_ON_ERROR);
    exit;
}

if ($path === '/approve') {
    $cookie = $_COOKIE['fv_fixture'] ?? '';
    if (!is_string($cookie) || !hash_equals($key, $cookie)) answer(401, ['error' => 'login_required']);
    $csrf = hash_hmac('sha256', 'browser-confirmation', $key);
    if ($method === 'GET') {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><title>FanVault test approval</title><h1>Confirm sign-in as Test Player</h1>'
            . '<form method="post"><label>Code shown in the app <input name="user_code" required></label>'
            . '<input type="hidden" name="csrf" value="' . $csrf . '"><button>Approve</button></form>';
        exit;
    }
    if ($method !== 'POST' || ($_SERVER['HTTP_ORIGIN'] ?? '') !== $origin
        || !is_string($_POST['csrf'] ?? null) || !hash_equals($csrf, $_POST['csrf'])) {
        answer(403, ['error' => 'invalid_browser_action']);
    }
    $code = $_POST['user_code'] ?? null;
    if (!is_string($code) || !$auth->approve($code, '42', $binding)) answer(400, ['error' => 'invalid_code']);
    answer(200, ['status' => 'approved']);
}

if ($path === '/device' && $method === 'POST') {
    if (($_SERVER['CONTENT_TYPE'] ?? '') !== 'application/json') answer(415, ['error' => 'invalid_content_type']);
    answer(200, $auth->start());
}
if ($path === '/exchange' && $method === 'POST') {
    if (($_SERVER['CONTENT_TYPE'] ?? '') !== 'application/json') answer(415, ['error' => 'invalid_content_type']);
    $body = json_decode(file_get_contents('php://input', false, null, 0, 512), true);
    $code = $body['device_code'] ?? null;
    if (!is_string($code)) answer(400, ['error' => 'invalid_grant']);
    $result = $auth->exchange($code);
    answer(isset($result['error']) ? 400 : 200, $result);
}
$bearer = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = str_starts_with($bearer, 'Bearer ') ? substr($bearer, 7) : '';
if ($path === '/me' && $method === 'GET') {
    $subject = $auth->subject($token);
    if ($subject === null) answer(401, ['error' => 'unauthorized']);
    answer(200, ['user_id' => $subject, 'display_name' => 'Test Player']);
}
if ($path === '/logout' && $method === 'POST') {
    $auth->revoke($token);
    answer(200, ['status' => 'revoked']);
}
answer(404, ['error' => 'not_found']);
