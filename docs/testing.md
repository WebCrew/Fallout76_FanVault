# Testing and acceptance

CI checks JavaScript syntax, config boundaries and the existing embedded-service message/occupied-port test. The Windows workflow builds the portable EXE. Neither authenticates against Net-Twin or proves game compatibility.

## Manual Windows checklist — step 7

- Start without development tools or a console. Opened panel clearly labels demo data and no Net-Twin connection.
- With a fresh app profile, confirm the icon starts near the primary work area's centre. Do not delete an existing layout to test this; existing placement must be retained.
- Open/collapse; drag icon and panel separately; resize; collapse/reopen/restart to verify placement and size.
- Try display edges, taskbars, a second monitor and Windows scaling.
- Check hide/show, confirmed exit, single-instance behaviour and occupied-port handling.
- Check demo channel/DM interaction, emoji and local image preview; no claim of Net-Twin delivery.
- In Fallout 76 windowed/borderless mode, place the panel around the HUD. Record exclusive-fullscreen results separately.
- Start with `FANVAULT_ENV=production`: local chat does not start, sending is disabled, overlay still operates. An API address must not enable any connection.

Record candidate version and Windows/display/game mode before acceptance. Earlier EXE tests do not count for this candidate. Preserve accepted builds as versioned ZIPs after approval.

## First real chat test — later milestone

Two designated test accounts exchange app message/website reply and retrieve the same history after restart. An uninvited third test identity must be denied. Check blocking, privacy, invalid/revoked sessions, group departure and removed membership. Exclude paid-message recipients; never use real private conversations as fixtures.
