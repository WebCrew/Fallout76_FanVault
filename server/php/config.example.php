<?php
declare(strict_types=1);

// Copy to config.php in fanvault-private, outside the document root.
return [
    'origin' => 'https://net-twin.de',
    'sngine_bootstrap' => '/absolute/path/to/net-twin/bootstrap.php',
    // Generate locally on the host with bin2hex(random_bytes(32)); never commit it.
    'rate_key' => '',
    // Exact existing Net-Twin usernames approved for the pilot; empty disables service.
    'pilot_users' => []
];
