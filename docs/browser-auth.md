# Browser sign-in — local prototype

This development branch adds a PHP authorization store and a loopback-only HTTP test fixture. It does not change the Step 8 executable, enable live login or deploy anything to Net-Twin.

## Flow

1. The future desktop client asks for a short-lived sign-in request. It keeps a random device secret in the main process and displays a separate confirmation code.
2. The player opens the system browser, signs in at Net-Twin and enters the confirmation code shown in their own app. No password is typed into FanVault.
3. A same-origin, CSRF-checked browser submission binds the pending request to the authenticated Net-Twin user/session. Browser code alone cannot obtain a desktop session.
4. The desktop exchanges its device secret once for an expiring FanVault session. The server stores token digests and validates the underlying Net-Twin session on use. Sign-out revokes the app token.

This design is informed by [RFC 8628](https://www.rfc-editor.org/rfc/rfc8628.html) and the external-browser guidance in [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252.html). It is not a claim that Sngine implements either protocol or that these private endpoints are a public OAuth standard.

## Why an adapter is needed

The licensed Sngine 5 package's developer endpoint exchanges an auth key using an app secret and returns a developer access token. This does not establish a valid session for the separate PHP chat API. Do not forward that token as a chat session or ship a global app secret in the EXE. The production adapter must use the already authenticated same-origin Net-Twin browser session and bind FanVault authorization to its current validity.

## Run locally

Requires PHP 8.4 with PDO SQLite enabled for the prototype, plus Node.js 24. From the repository root:

```sh
php server/php/tests/device-authorization.php
node --test server/php/tests/browser-flow.test.js
```

If the installed PHP needs temporary CLI options, supply them as a JSON array via `FANVAULT_TEST_PHP_ARGS`. The test runner may select a PHP executable with `FANVAULT_TEST_PHP`. No host configuration needs to change for these tests.

The HTTP fixture requires the PHP development server, loopback access and a random synthetic test key. The test starts it in a temporary directory and exercises the approval form and API through separate HTTP requests. It uses no real accounts, cookies, credentials or chat messages.

## Before deployment

- Implement the Net-Twin browser identity and session-revocation adapter against verified Sngine 5 behavior. Do not accept user IDs or session assertions from the form/client.
- Choose and verify storage on the actual hosting; SQLite support on the live tariff has not been established. Keep state outside publicly served files.
- Build production request limits, same-origin/CSRF checks, TLS, session/error handling and logging controls. Do not deploy the synthetic fixture.
- Add the Electron sign-in UI and keep session material in the main process; any persistent storage needs OS-backed protection.
- Test with the designated Net-Twin accounts in an approved environment, then enforce the required Fallout 76 gamertag before protected chat, search or groups become accessible.
