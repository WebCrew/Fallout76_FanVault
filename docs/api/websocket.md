# Legacy local WebSocket protocol

Demo only: `ws://127.0.0.1:3001`, started by Electron in development/test, disabled in production.

| Type | Fields | Behaviour |
| --- | --- | --- |
| `register` | `from`, `clientId` | Claimed display name, not authenticated identity |
| `chat` | `channel`, `from`, `text` | Local broadcast; no enforced guild/channel boundary |
| `dm` | `from`, `to`, `text` | Echo and named-recipient delivery; not secure private messaging |

No persistence, receipt guarantee, secure identity, reconnection contract or moderation. Do not expose the port or treat names as Net-Twin users. Production text chat can use authenticated HTTP polling; the legacy WebSocket is not a hosting requirement.
