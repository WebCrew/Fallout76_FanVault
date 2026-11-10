# Browser sign-in — Step 9 pilot

Step 9 connects the desktop sign-in controls, PHP HTTP handlers and an adapter for the installed Sngine 5.0 browser session. The full flow has been tested locally with a synthetic identity.

On 10 November 2026 the login endpoint went live on Net-Twin for one designated test account. The production checks confirmed that HTTPS and the private SQLite store work, an unauthenticated visitor sees the browser approval page, foreign origins are rejected, and a device request cannot obtain an app session before approval. Sign-in and sign-out with the real test account are pending.

## Flow

1. The desktop client asks for a short-lived sign-in request. It keeps a random device secret in the main process and displays a separate confirmation code.
2. The player signs in at Net-Twin in a separate tab, then selects **Weiter zur Code-Eingabe** on the original FanVault browser page. Already eligible users see the code form immediately. An existing session outside the pilot receives a separate message to switch to the designated account. The password is entered only on Net-Twin's sign-in page.
3. A same-origin, CSRF-checked browser submission binds the pending request to the authenticated Net-Twin user/session. Browser code alone cannot obtain a desktop session.
4. The desktop exchanges its device secret once for an expiring FanVault session. The server stores token digests and validates the underlying Net-Twin session on use. Sign-out revokes the app token.

This design is informed by [RFC 8628](https://www.rfc-editor.org/rfc/rfc8628.html) and the external-browser guidance in [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252.html). It is not a claim that Sngine implements either protocol or that these private endpoints are a public OAuth standard.

## Why an adapter is needed

The licensed Sngine 5 package's developer endpoint returns a developer access token, not a demonstrated chat session. The adapter uses Sngine's original bootstrap and matches the browser cookies to the actual Sngine session. It rejects impersonation, checks the active session and account restrictions, and limits the pilot to configured usernames. Only the account ID and username reach the overlay. No global Sngine API secret or Net-Twin password is used by the EXE.

## Run locally

Requires PHP 8.4 with PDO SQLite enabled for the prototype, plus Node.js 24. From the repository root:

```sh
php server/php/tests/device-authorization.php
node --test server/php/tests/browser-flow.test.js
```

If the installed PHP needs temporary CLI options, supply them as a JSON array via `FANVAULT_TEST_PHP_ARGS`. The test runner may select a PHP executable with `FANVAULT_TEST_PHP`. No host configuration needs to change for these tests.

The loopback HTTP fixture exercises the desktop sign-in module, browser form, application endpoints and session store with a synthetic Sngine identity. It checks foreign origins, invalid CSRF, impersonation, sign-out and revoked browser sessions. It uses no actual Net-Twin accounts or cookies.

## Pilot installation (requires production approval)

1. Verify the installed PHP has PDO SQLite, the HTTPS request is marked secure at PHP, and Apache/FastCGI passes Authorization to PHP. Verify a PHP-writable directory **outside every public domain root**. Public tariff listings do not establish these properties for the existing account.
2. Place `DeviceAuthorization.php`, `NetTwinIdentity.php`, `AuthHttp.php` and a private `config.php` outside the document root in the sibling directory `fanvault-private` (or set the server-only `FANVAULT_PRIVATE_DIR`). Configure the absolute Sngine bootstrap path, generate a random rate-limit key on the host and enter only approved pilot usernames. Do not deploy any test fixture. The endpoint is disabled when the pilot list is empty.
3. Upload only `server/php/public/index.php` as `/nettwin/fanvault/index.php`. No Sngine file or Sngine database schema changes are required. The login endpoint creates its own private SQLite session store. Check HTTPS, origin/CSRF, session revocation, request-rate limits and absence of public access to private files before using a real account.
4. Start the Step 9 app with `FANVAULT_ENV=production` and `FANVAULT_API_BASE_URL=https://net-twin.de/fanvault`. Open Settings → Sign in with Net-Twin. Confirm the displayed code in the system browser. The app stores its session only in memory; restarting it requires signing in again. Text chat, uploads, groups and search stay disabled at this stage.
5. Test with the designated Net-Twin account and verify that an account outside the pilot cannot authorize. Test logout and revoked browser sessions. Before exposing protected game features, add the Fallout 76 gamertag gate and the approved search visibility rules.

### Authorization forwarding on Net-Twin

The shared hosting needed a rule in the FanVault directory's own `.htaccess` to pass the Authorization header to PHP. The following rule was verified on Net-Twin. The site-wide configuration was unchanged.

```apache
RewriteEngine On
RewriteRule ^index\.php$ - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
```

Verify forwarding at the new endpoint before enabling it. The rule uses Apache's [rewrite environment variable flag](https://httpd.apache.org/docs/2.4/rewrite/flags.html#flag_e). It is only needed on hosts that omit the Authorization header from the PHP request.

To roll back the pilot, take its own `index.php` out of service. Keep any private state for controlled cleanup; do not alter Sngine files or users.
