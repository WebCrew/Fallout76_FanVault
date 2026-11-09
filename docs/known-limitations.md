# Known limitations — step 7

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
| Login, search, invitations, guild rights | Not integrated |
| Live audio | Not implemented; no paid provider configured by this step |
| Future API address | Validated but unused |
| Production mode | Chat unavailable, demo display remains; not a production release |

The separate Node server has broad CORS and no real authentication/persistence. The embedded service may reuse an occupied development port. Neither is a secure community backend. CI does not prove Windows/game compatibility, full security or licence compliance.
