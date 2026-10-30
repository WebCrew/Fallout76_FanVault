# Squad voice: agreed scope

Decision recorded 2026-10-31. This is an implementation specification, not an available feature in the current candidate.

## Product behaviour

- One optional voice room per in-game squad, with at most **four participants**.
- Players explicitly join and leave; there is no ringing, individual call or call-acceptance flow.
- Microphone mute and push-to-talk; microphone capture only after deliberate voice-room entry and permission.
- No whole-guild audio conference, recording or video feature in this scope. Larger guilds use separate squads.

## Architecture and budget

Use direct WebRTC audio between the participating desktop clients. At four participants, each client has up to three peer connections, six pairs in the room. The existing shared-hosting API manages authenticated room membership, authorization and temporary connection-negotiation messages. It does not receive or redistribute the audio stream.

Do not deploy a dedicated media server, self-hosted TURN server or paid audio provider for this scope. No automatic upgrade, subscription or fallback to a paid service. A permitted zero-cost STUN configuration may assist address discovery; its provider and operating terms still need verification. STUN does not relay audio or solve every network restriction.

Direct connections may fail behind some routers, firewalls or mobile networks. Without a TURN relay, universal connectivity cannot be guaranteed. Show a clear per-peer connection failure and allow retry/leave; do not display a successful voice connection merely because room membership succeeded. Do not solve connectivity failures by silently changing the agreed budget or exposing extra server ports.

## Required boundaries

- Net-Twin account and valid FanVault session are prerequisites, as for the rest of the intended service.
- Enforce squad access and the four-user room limit on the API, including simultaneous joins; client-side limits alone are insufficient.
- Bind negotiation messages to the authenticated sender and current room participants. Membership in a Net-Twin text conversation alone does not grant voice-room access.
- Expire temporary signalling records and departed participants; exact timings remain part of the implementation design.
- Stop microphone tracks and close peer connections on leave, logout, removed membership or app exit.
- Do not store audio in Net-Twin chat history. Text chat continues to use the existing Net-Twin integration plan.

## First feasibility test

After secure login and room authorization exist, start with two test players on different Internet connections, then expand to four. Verify joining/leaving, device selection, mute, push-to-talk, reconnect, network failure feedback and Windows/game behaviour. Check a fifth simultaneous join is denied, and removed members cannot exchange room signals. Measure client and shared-hosting load before declaring this suitable for wider use.

No promise of zero-cost universal connectivity follows from the four-person limit. The selected direction is a bounded direct-audio implementation without a dedicated audio server.
