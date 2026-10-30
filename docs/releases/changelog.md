# Changelog

## 0.5.0-step8 — Sngine 5.0 compatibility candidate

- Verified the installed Sngine 5.0 chat/API against the owner's original package.
- Add a credential-free message adapter and safe shared renderer for original text, replies, attachment metadata, reactions and call history.
- Prepare cursor/offset handling and overlap-safe history merging; account for missing top-level cursors in installed API responses.
- Keep page identities distinct and redact protected content; do not load media sources automatically.
- Open web links externally and prevent remote navigation inside the overlay.
- Add compatibility/rendering tests and update architecture, limitations and Windows acceptance instructions.

No live login/chat transport or new remote actions yet. Net-Twin's production files, database and existing security hooks are unchanged. The step-8 candidate supersedes the unaccepted step-7 test build; previous test ZIPs are retained.

## 0.5.0-step7 — candidate

- Separate runtime settings and Fallout 76 channel/demo configuration.
- Add development/test/production modes and optional future API address. Production disables unauthenticated local chat.
- Label demo data and local connections; correct the unimplemented interaction shortcut in settings.
- Centre the initial icon while retaining saved layout, dragging and resizing.
- Replace stale documentation with current guides, architecture, limitations and acceptance checks.
- Add config tests to CI and package new runtime modules.

No production Net-Twin changes, API deployment, SQL database, paid audio service or dependency upgrades. Windows/game acceptance is required before merge and versioned backup.

## 0.4.0-step6 — main baseline

Existing local overlay, remembered layout, chat prototype and Windows build workflow. This records the baseline, not new manual acceptance.
