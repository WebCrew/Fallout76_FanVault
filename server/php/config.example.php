<?php
declare(strict_types=1);

// Copy to config.php in fanvault-private, outside the document root.
return [
    'origin' => 'https://net-twin.de',
    'sngine_bootstrap' => '/absolute/path/to/net-twin/bootstrap.php',
    // Generate locally on the host with bin2hex(random_bytes(32)); never commit it.
    'rate_key' => '',
    // Exact existing Net-Twin usernames approved for the pilot; empty disables service.
    'pilot_users' => [],
    // Map each game and platform to its dedicated searchable Sngine textbox field ID.
    // Keep empty until the Net-Twin field mappings and visibility have been reviewed.
    'member_search_fields' => [],
    // Serve the website form to eligible, signed-in Net-Twin users.
    'web_member_search_enabled' => false
];
