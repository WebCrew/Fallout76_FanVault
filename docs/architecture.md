# Architecture and decisions

## Current candidate: 0.5.0-step7

Electron main controls windows, placement, resizing and native image selection. The context-isolated preload exposes a limited IPC bridge. The renderer reads public runtime configuration through that bridge. `client/core/runtime-config.js` validates settings; `client/games/fallout76.js` supplies Fallout 76 labels, channels and sample messages. Some Fallout-specific HTML and sample members remain; this is a small configuration boundary, not a finished plugin platform.

Development/test start the unauthenticated embedded demo on `127.0.0.1:3001`. Production starts no embedded server and opens no prototype WebSocket. The separate `server/` service is legacy experimental code, not a deployment target.

## Agreed target — not implemented

```text
Windows overlay -> FanVault API -> Net-Twin identity, gamertags and existing text chat
                                      -> existing Net-Twin message storage
```

- Real service requires a Net-Twin account and the relevant game/platform gamertag. Current demo does not enforce this yet.
- Net-Twin remains the identity/tag source. No Bethesda database access; self-reported tags are not verified game accounts.
- App and website search should use the same authorised directory. Existing platform/tag fields still need a game mapping and verified search behaviour.
- Leaders may maintain a Net-Twin page/group. Ordinary players need not create one. Group roles must not confer global FanVault administration.
- No API keys for ordinary players/leaders. Later developer apps/bots may receive separately scoped, revocable access. Global Sngine secrets stay server-side.
- GitHub hosts source, docs and Windows downloads. The running API must fit the existing shared hosting, in the reserved `fanvault` directory. PHP and bounded polling are proposed; capacity/deployment remain to be validated.
- Reuse existing message storage. A separate FanVault SQL database is conditional on session/metadata needs; none is created by this step.
- No additional paid services. Reliable audio remains a separate feasibility task. Finish Fallout 76 before implementing another game.

## Installed integration evidence — source inspection, 2026-10-15

The PHP app API contains conversations, messages, contacts, typing and seen-status routes using the existing chat logic. API signatures and JWT/session checks differ from the public developer OAuth flow; a safe system-browser login bridge still needs design/testing.

Message reads check conversation participation. Sending applies privacy/block checks. Multi-recipient chats and group/event chatboxes exist; group posting checks approved membership. Complete join/leave handling, removed-member read access and page-to-chat mapping remain unproven. Internal helpers must not be exposed without access checks. No test messages or user changes were made during inspection.

## Delivery sequence

1. This candidate: configuration, demo labelling, centred initial icon and documentation.
2. Secure login/session bridge and constrained FanVault API, with secrets kept on the server.
3. Two-account app/website chat exchange, shared history and denied outsider access.
4. Gamertag search, invitations, guild membership/roles and persistent features.
5. Media/moderation, audio feasibility, then other-game integration after Fallout 76 is stable.

Open decisions: tag visibility, detailed guild mapping, retention/deletion, session exchange, hosting capacity, audio and distribution/asset licensing. Configuration defaults do not resolve these decisions.
