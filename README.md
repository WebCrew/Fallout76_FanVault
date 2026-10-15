# FanVault — Fallout 76 Clan Companion

Windows overlay prototype, **v0.5.0-step7**. This step prepares configuration and documentation for Net-Twin integration. It does not connect to Net-Twin yet.

On first launch, a small icon appears near the centre of the primary display's work area. Click to open the chat interface, drag the icon or the panel title to reposition it, and resize using the lower-right grip. Position and size are saved; existing placement takes precedence over the first-run centre position.

## Current build

- Transparent Electron overlay, always on top, movable, resizable and constrained to display work areas.
- Local demo chat, sample members/profiles/channels, emoji and local image previews.
- **No real account login, remote community chat, persistent messages, squads, live audio or published FanVault API yet.** Sample content is labelled as demo data.

The intended service requires a Net-Twin account and relevant self-reported game/platform gamertag in profile settings. Search and invitations will use Net-Twin's authorised directory. A guild's Net-Twin page/group is optional for ordinary use.

## Windows prototype

Download the FanVault-Windows-portable artifact from the relevant [Windows build](https://github.com/WebCrew/Fallout76_FanVault/actions), extract it and run the EXE. No separate Node.js installation is required. PR artifacts are test candidates, not accepted releases. See the [player guide](docs/player-guide.md) and [Windows test checklist](docs/testing.md).

## Development

With Node.js 24, open client/ and run:

```sh
npm ci
npm run test:config
npm run test:local-server
npm start
```

Default configuration runs the local demo. Production disables its unauthenticated transport; setting an API address does not implement login or enable a remote connection. See [configuration and builds](docs/developer-guide.md).

## Direction

Reuse Net-Twin text chat behind a server-side FanVault API. Finish Fallout 76 first, keeping common logic and game configuration separate. The backend must fit existing shared hosting; no paid services are approved. Audio is a separate feasibility task.

See the [documentation index](docs/README.md), [architecture](docs/architecture.md), [limitations](docs/known-limitations.md) and [changelog](docs/releases/changelog.md). Repository licence: GPL-3.0. Sngine vendor code and credentials are not distributed here; third-party integration and asset rights require review before release. FanVault is independent and does not verify Bethesda game accounts.
