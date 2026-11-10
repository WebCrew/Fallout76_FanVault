<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../DeviceAuthorization.php';

use FanVault\DeviceAuthorization;

$now = 1000;
$active = true;
$database = new PDO('sqlite::memory:');
$binding = hash('sha256', 'synthetic-browser-session');
$auth = new DeviceAuthorization(
    $database,
    static function (string $id, string $ref) use (&$active, $binding): bool {
        return $active && $id === '42' && hash_equals($binding, $ref);
    },
    static function () use (&$now): int { return $now; }
);

function check(bool $ok, string $case): void {
    if (!$ok) throw new RuntimeException($case);
    echo "PASS $case\n";
}

$flow = $auth->start();
check($auth->exchange($flow['user_code'])['error'] === 'invalid_grant', 'browser code is not a desktop credential');
check($auth->exchange($flow['device_code'])['error'] === 'authorization_pending', 'unapproved request cannot sign in');
check($auth->exchange($flow['device_code'])['error'] === 'slow_down', 'rapid polls are throttled');
check(!$auth->approve($flow['user_code'], '43', $binding), 'unknown browser identity cannot approve');
check($auth->approve(strtolower($flow['user_code']), '42', $binding), 'authenticated browser can approve');
check(!$auth->approve($flow['user_code'], '42', $binding), 'approval is not repeatable');
$now += DeviceAuthorization::POLL_INTERVAL;
$session = $auth->exchange($flow['device_code']);
$token = $session['access_token'];
check($auth->subject($token) === '42', 'session is bound to approved identity');
check($auth->exchange($flow['device_code'])['error'] === 'invalid_grant', 'device grant is single-use');
check($database->query('SELECT token_hash FROM fv_sessions')->fetchColumn() === hash('sha256', $token), 'only token digest is stored');
$auth->revoke($token);
check($auth->subject($token) === null, 'logout revokes access');

$denied = $auth->start();
check($auth->deny($denied['user_code']), 'browser can deny');
check($auth->exchange($denied['device_code'])['error'] === 'access_denied', 'denied flow cannot mint a token');

$expired = $auth->start();
$now += DeviceAuthorization::FLOW_LIFETIME;
check(!$auth->approve($expired['user_code'], '42', $binding), 'expired browser approval rejected');
check($auth->exchange($expired['device_code'])['error'] === 'expired_token', 'expired desktop exchange rejected');

$lost = $auth->start();
$auth->approve($lost['user_code'], '42', $binding);
$active = false;
check($auth->exchange($lost['device_code'])['error'] === 'access_denied', 'browser logout before exchange invalidates grant');
$active = true;
$fresh = $auth->start();
$auth->approve($fresh['user_code'], '42', $binding);
$freshToken = $auth->exchange($fresh['device_code'])['access_token'];
$active = false;
check($auth->subject($freshToken) === null, 'browser session revocation invalidates issued token');
$active = true;
check($auth->subject($freshToken) === null, 'revoked token cannot regain access');
$timeout = $auth->start();
$auth->approve($timeout['user_code'], '42', $binding);
$timeoutToken = $auth->exchange($timeout['device_code'])['access_token'];
$now += DeviceAuthorization::SESSION_LIFETIME;
check($auth->subject($timeoutToken) === null, 'session expires without refresh');
