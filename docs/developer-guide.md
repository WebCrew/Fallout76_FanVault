# Developer guide

Use Node.js 24. In `client/`: `npm ci`, `npm run test:config`, `npm run test:local-server`, then `npm start`. `npm run build:win` creates a portable EXE in `client/dist`. PR workflows run checks and a Windows build. Dependencies remain locked; review their updates separately.

## Public configuration

Process environment variables are read on launch. No `.env` loader or in-app production switch exists.

| Variable | Default | Meaning |
| --- | --- | --- |
| `FANVAULT_ENV` | `development` | Exactly `development`, `test`, or `production` |
| `FANVAULT_GAME` | `fallout76` | Only implemented game configuration |
| `FANVAULT_API_BASE_URL` | unset | Optional future address; no API requests are made yet |

Development/test enable loopback demo chat. Production disables the embedded service and transport; it does not activate an API client. Sample content remains labelled in all modes. Packaged test builds also default to development. A packaged build is not automatically production-ready.

URLs must use HTTPS. Development/test additionally permit HTTP on `localhost`, `127.0.0.1` and `::1`. Credentials, queries, fragments and other protocols are rejected. Unset stays unset; no live endpoint is invented.

PowerShell example (quit the app before changing environment):

```powershell
$env:FANVAULT_ENV = 'production'
npm start
Remove-Item Env:FANVAULT_ENV
```

## Boundaries and delivery

Common settings live in `client/core`; game data in `client/games/fallout76.js`. IPC returns only the constructed public config, never the entire environment or secrets. Update the builder's runtime file allowlist for new modules.

Development candidates use `major.minor.patch-stepN`; step 7 is `0.5.0-step7`. Align package and lockfile metadata. API versioning is a separate future contract.

Each milestone uses a branch/PR, local checks, CI, Windows build and manual Windows/game acceptance. Merge only with explicit acceptance. Afterwards preserve a versioned Windows ZIP in the local backup folder; do not overwrite/delete older backups. Client builds do not deploy to Net-Twin.
