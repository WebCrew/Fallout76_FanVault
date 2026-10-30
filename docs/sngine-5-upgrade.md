# Sngine 5.0 compatibility — inspected 2026-10-30

## Evidence and scope

The installed Net-Twin version reports **5.0**. SHA-256 comparison against the owner's original package confirms matching version, chat/call traits, user class, main/system functions, PHP chat router/controller, response helper and authentication controller. The API entry point contains the existing Net-Twin Behavior Shield hook in addition to vendor code. Inspection was read-only; no messages or user changes were made. Vendor code and real user data are not included in this repository.

The [official changelog](https://zamblek.com/products/sngine/changelog) describes replies, pinning, multiple attachments, participant management, page inboxes and revised calling controls. Their installed API behaviour, rather than the advertised UI alone, determines FanVault compatibility.

## Data and API changes

| Area | Installed format | FanVault handling |
| --- | --- | --- |
| Text | `message_orginal_decoded`, separate from parsed rich HTML | Use original text, never insert vendor HTML |
| Replies | `reply`: author, snippet, unavailable flag | Plain-text quote; unavailable-original notice |
| Attachments | `media.items`, `media.files`, `media.audio` | Typed metadata only; no automatic private-source loading |
| Protected content | `needs_payment`, `can_get_details` | Redact; never recover sources from legacy fields |
| Page messages | Separate page identity and privileged sender details | Keep page/user IDs distinct; omit replying administrator details |
| Call records | Audio/video, status, duration | History display only; not live calling |
| Reactions | Per-kind counts | Known types only; no fake working action buttons |
| Message pagination | Cursor inside `data`, or page offset | Preserve cursor, merge overlapping pages by string IDs |
| Conversation pagination | Controller supplies cursor; response helper drops it | Explicit offset fallback |

The response helper also drops the page controller's extra top-level unread count. Do not rely on those missing fields or patch production implicitly. For history, omit `last_message_id` entirely: an empty string selects the incremental branch in the installed implementation. Preserve IDs beyond JavaScript's safe integer range as strings.

## Groups and pages

New rename/add/remove routes act on active multi-person conversations, not on a Net-Twin group's guild roles. Their checks permit conversation participants; they do not establish a FanVault guild-leader permission. The add operation also applies a recipient limit. Do not promise unlimited guild chat size or expose these operations as unrestricted guild administration.

Group/event chatboxes are separate. Page inboxes are user-to-page conversations with page-admin access checks, useful for enquiries rather than a shared guild channel. A page/group remains optional for ordinary FanVault use.

New routes include `/chat/actions/rename`, `/chat/actions/add`, `/chat/actions/remove`, `/chat/actions/pin`, `/chat/actions/unpin`, and `/chat/page/conversations`. They are not enabled as FanVault actions in this candidate. Authentication and guild lifecycle checks must come first.

## Implemented in step 8

- Independently written Sngine 5 message adapter, without credentials or HTTP requests, used by the renderer's normalization path.
- Safe shared renderer for existing demo messages and future authorised records: reply quotes, reaction counts, call history and attachment metadata.
- Pagination parsing, query construction and stable ID-based merging for the upcoming transport.
- HTTP(S) links open in the system browser; external pages cannot replace the overlay. File/media content is not automatically loaded or executed.
- Synthetic compatibility tests for page privacy, protected media, replies, calls, pagination, large IDs and text-only rendering.

This is **format compatibility and integration preparation**, not a live chat connection. Login, retrieval, sending, reply submission, pinning, participant management and media transfer remain unimplemented. No new buttons pretend these operations work. The existing local demo still starts in development/test and remains disabled in production.

## Authentication, hosting and audio

The installed authentication controller matches the earlier inspected controller. The user class still accepts JWT app sessions but includes changed unusual-login logic. This proves neither OAuth/PKCE interoperability nor a safe desktop login bridge. Global signing secrets stay server-side.

Sngine's functions are now split across additional files. Future integration must use the current bootstrap rather than depend on 4.5 function placement. This candidate changes no server configuration, database or subscription. Optional Redis is not a FanVault requirement.

The call trait still has Twilio, LiveKit and Agora paths. New call controls/history do not establish free live audio on shared hosting. The requirement to avoid additional paid services remains.

## Validation and next step

Run `npm run test:config`, `npm run test:chat`, `npm run test:local-server`, syntax checks and the Windows build. No production APIs are invoked by the tests. Source inspection and unit tests do not prove live permissions or game compatibility.

Next: secure session bridge and permission-filtered server-side chat access, then the designated two-account app/website exchange. The old step-7 test ZIP is superseded by step 8; manual game acceptance is still required before merge.
