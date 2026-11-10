# Known limitations — step 9

The browser sign-in flow works against a local fixture; live Net-Twin pilot deployment and verification are pending. Retrieval, sending and chat actions are not connected. Attachment metadata is recognised, but private media is not loaded or transferred. See the [upgrade audit](sngine-5-upgrade.md).

| Feature | Status |
| --- | --- |
| Launcher, collapse, dragging, resize, saved position | Implemented; candidate requires manual Windows acceptance |
| Initial position | Centre of primary work area unless a valid saved placement exists |
| Hide/show; confirmed exit | Ctrl+Shift+F; Ctrl+Shift+Q |
| Ctrl+Shift+E interaction | Not implemented; settings say so |
| Escape | Collapses while message input has focus; not global |
| Channels, DMs, emoji | Local/in-memory prototype and sample data |
| Members, profiles, squads | Demo data; squad invite only local feedback |
| Images | Local preview only, no delivery/storage |
| Net-Twin text chat | Installed API found, not connected to FanVault |
| Net-Twin sign-in | Local client/server flow verified; live pilot not deployed |
| Search, invitations, guild rights | Not integrated |
| Live audio | Not implemented; no paid provider configured by this step |
| API address | Required to activate sign-in; production origin restricted to net-twin.de |
| Production mode | Demo transport disabled; live chat unavailable |

The separate Node server has broad CORS and no real authentication/persistence. The embedded service may reuse an occupied development port. Neither is a secure community backend. CI does not prove Windows/game compatibility, full security or licence compliance.
