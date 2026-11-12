<?php
declare(strict_types=1);

// Public entry point. All code and session storage live in a private sibling directory.
ini_set('display_errors', '0');
header('Cache-Control: no-store');
try {
    $root = realpath($_SERVER['DOCUMENT_ROOT'] ?? '');
    if ($root === false) throw new RuntimeException('Missing document root');
    $private = realpath(getenv('FANVAULT_PRIVATE_DIR') ?: dirname($root) . '/fanvault-private');
    if ($private === false || $private === $root || str_starts_with($private, $root . DIRECTORY_SEPARATOR)) {
        throw new RuntimeException('Private state is not configured');
    }
    $config = require $private . '/config.php';
    $origin = $config['origin'];
    $rateKey = $config['rate_key'];
    $pilotUsers = $config['pilot_users'] ?? [];
    $action = $_GET['action'] ?? '';
    $webSearch = $action === 'players';
    if (!is_string($origin) || !preg_match('#^https://[a-z0-9.-]+(?::[0-9]+)?$#D', $origin)
        || !is_string($rateKey) || !preg_match('/^[a-f0-9]{64}$/D', $rateKey)
        || (!$webSearch && (!is_array($pilotUsers) || $pilotUsers === []))
        || !in_array(strtolower($_SERVER['HTTPS'] ?? ''), ['on', '1'], true)
        || strtolower($_SERVER['HTTP_HOST'] ?? '') !== substr($origin, 8)) {
        throw new RuntimeException('Invalid HTTPS or server configuration');
    }
    require $private . '/DeviceAuthorization.php';
    require $private . '/NetTwinIdentity.php';
    require $private . '/AuthHttp.php';
    foreach (\FanVault\AuthHttp::headers() as $key => $value) header($key . ': ' . $value);
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (!in_array($action, ['approve', 'device', 'exchange', 'me', 'logout', 'member-search', 'players'], true)
        || ($webSearch && ($config['web_member_search_enabled'] ?? false) !== true)) {
        http_response_code(404);
        exit;
    }
    if (isset($_SERVER['HTTP_X_AUTH_TOKEN']) || ($requestOrigin !== '' && $requestOrigin !== $origin)) {
        http_response_code(403);
        exit;
    }
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 2048) {
        http_response_code(413);
        exit;
    }
    // Use the original Sngine bootstrap so its account and site restrictions still apply.
    $bootstrap = realpath($config['sngine_bootstrap'] ?? '');
    if ($bootstrap !== $root . DIRECTORY_SEPARATOR . 'bootstrap.php') throw new RuntimeException('Invalid Sngine bootstrap');
    require $bootstrap;
    ini_set('display_errors', '0');
    if (!defined('SYS_VER') || SYS_VER !== '5.0') throw new RuntimeException('Sngine version not verified');
    foreach (\FanVault\AuthHttp::headers() as $key => $value) header($key . ': ' . $value);
    $identity = \FanVault\NetTwinIdentity::fromSngine($db, $system, $webSearch ? null : $pilotUsers);
    $browser = $webSearch || $action === 'approve' ? $identity->browser($user, $_COOKIE) : null;
    $csrf = '';
    if ($browser !== null && session_status() === PHP_SESSION_ACTIVE) {
        if (!isset($_SESSION['fanvault_csrf'])) $_SESSION['fanvault_csrf'] = bin2hex(random_bytes(32));
        $csrfInput = $webSearch ? 'players:' . $browser['session_ref'] : $browser['session_ref'];
        $csrf = hash_hmac('sha256', $csrfInput, $_SESSION['fanvault_csrf']);
    }
    if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
    $state = $private . '/sessions.sqlite';
    if (is_link($state)) throw new RuntimeException('Invalid session storage');
    $mask = umask(0077);
    try {
        $pdo = new PDO('sqlite:' . $state);
    } finally {
        umask($mask);
    }
    $auth = new \FanVault\DeviceAuthorization($pdo, $identity->isActive(...));
    $client = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $rateKey);
    $members = null;
    if ($webSearch || ($action === 'member-search' && !empty($config['member_search_fields']))) {
        require $private . '/MemberSearch.php';
        $members = \FanVault\MemberSearch::fromSngine($db, $system, $config['member_search_fields'] ?? []);
    }
    if ($webSearch) {
        require $private . '/WebMemberSearch.php';
        [$status, $type, $body] = (new \FanVault\WebMemberSearch($members, $auth))->handle($method, $_POST, $browser, $csrf, $client);
    } else {
        $http = new \FanVault\AuthHttp($auth, $identity, $origin, $members);
        [$status, $type, $body] = $http->handle($method, $action, $requestOrigin,
            $_SERVER['CONTENT_TYPE'] ?? '', file_get_contents('php://input', false, null, 0, 1025) ?: '',
            $_POST, $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '',
            $client, $browser, $csrf, ($user->_logged_in ?? false) === true);
    }
    http_response_code($status);
    header('Content-Type: ' . $type);
    echo $body;
} catch (Throwable) {
    // Do not log credentials, query values, absolute paths or account data.
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"error":"service_unavailable"}';
}
