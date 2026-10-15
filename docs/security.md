# Security and privacy

Local chat trusts supplied names and is an unauthenticated demo. Do not expose it to a network, use private messages or deploy the legacy Node server. Production mode disables the embedded transport; that does not fix all prototype limitations.

The future API must authenticate the player, enforce conversation/guild rights on the server, honour privacy and blocking, and reject invalid/revoked sessions. Global Sngine API secrets stay on the server, never in Electron, GitHub, screenshots, logs or fixtures. A generic API key is not a user's permission to read messages.

System-browser login is planned. Public developer OAuth and the installed PHP app API are different mechanisms; JWT support does not prove PKCE, refresh or revocation compatibility. Future desktop credentials need suitable OS-backed storage, not localStorage.

Return only approved profile fields, not an entire Net-Twin user response. Gamertags are self-reported and visibility remains to be decided. Successful search does not override message privacy settings.

Local image extension/size checks are not a safe upload pipeline. Media, navigation/link policy, rate limits and abuse controls need further work. No end-to-end encryption or completed security review is claimed.

Keep local deployment credentials outside this repository. If needed, SQL credentials go only in the agreed local project location and protected server configuration. Ignore patterns supplement staged-file inspection. Sngine vendor code is not distributed here.
