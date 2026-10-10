# VYBE Instagram-Parity and Security Audit

**Audit date:** 2026-10-10  
**Scope:** Public repository static review of the main client, backend, Socket.IO authentication, admin console, routing, environment configuration, and existing test harness.  
**Status:** Static audit with proposed fixes on `security/stability-audit-fixes`. Production build, live browser checks, and database-backed end-to-end tests have **not** been executed in this review environment.

## Executive verdict

VYBE already contains a broad Instagram-inspired product surface. The repository exposes modules for feed/posts, profiles and follows, Reels, Stories and interactive stickers, highlights and archives, Notes, direct messages, notifications, discovery/search, location/audio pages, live streaming, voice/video calls, communities, AI helpers, creator monetization, and a staff/admin console.

That module breadth does **not** demonstrate exact Instagram parity. Source inspection cannot certify that every visible control works, that each UI state matches the production Instagram app, or that feed ranking, moderation, privacy, real-time delivery, uploads, and mobile layouts pass end-to-end tests. VYBE should be treated as a feature-rich social application with parity still to be verified, not a verified exact clone.

## Feature-surface matrix

| Product area | Evidence in repository | Audit status |
| --- | --- | --- |
| Feed, posts, carousels, tags, comments, reactions | Client feed/post components, Redux slices, post routes/controllers/models | Implementations present; interaction and privacy behavior need E2E coverage |
| Profiles, follows, follow requests, blocks, privacy | Profile/edit pages, user routes/controller/model, block/follow UI | Implementations present; test private-account, block, and request edge cases |
| Stories, close friends, stickers, viewers, highlights, archive | Story creator/viewer components, Story routes/controllers/services, walkthrough and story test script | Broad implementation present; walkthrough's claimed results were not independently rerun |
| Reels and discovery | Reels page/cards, feed scoring, Explore, hashtag/location/audio pages | Implementations present; ranking, pagination, playback, and device performance need verification |
| Messaging, Notes, notifications | Message/conversation/note/notification routes, Socket.IO and client hooks | Implementations present; delivery/read receipts, membership authorization, reconnect and offline cases need E2E tests |
| Calls, meetings, live streams | WebRTC, call, Meet and Live pages/controllers/sockets | Implementations present; TURN configuration and real-world network behavior need deployment tests |
| Communities, channels, AI tools, monetization | Community/channel models/controllers, AI routes, monetization UI/admin pages | Product-specific extensions exist; cannot be considered Instagram-equivalent merely because they are present |
| Admin operations | Separate admin client, admin routes/controllers, staff RBAC UI | Broad console exists; validate every API permission independently of client-side route guards |

## Instagram parity items requiring a dedicated product pass

Official Meta announcements in 2025–2026 describe experiences such as DM translation, scheduled messages, pinned DM conversations, group-chat QR codes, Reels Friends surfaces, reposts, optional Map/location sharing, and Instants. The repository has adjacent capabilities (messaging, reel sharing, location pages, stories/disappearing messages), but the static review did not establish feature-for-feature equivalents for all these flows.

Before claiming parity, run a checklist against the target Instagram mobile/web version and explicitly verify: (1) scheduled and translated DMs, pinned conversations and group-chat QR flows; (2) Reels friends/repost destination and visibility; (3) opt-in friend/location map controls; (4) ephemeral/Instant media lifecycle; (5) accessibility, reduced motion, keyboard behavior, responsive breakpoints, empty/error/loading states, and upload/retry behavior.

## High-priority defects addressed on the audit branch

1. **Predictable JWT fallback keys.** Token signing and verification used hardcoded fallback strings when environment secrets were absent. Signing, REST authentication, admin authentication, refresh, Socket.IO, and startup validation now use centralized required secrets and reject missing/short/obvious placeholder values.
2. **Incomplete session binding.** REST/admin auth and Socket.IO now reject sessionless tokens, missing/revoked/expired sessions, and sessions owned by a different user than the signed token. Refresh also validates session ownership and expiry.
3. **Unsafe TURN sample secret.** The sample configuration contained a predictable TURN shared secret. The sample now uses a placeholder; the credential endpoint refuses a short or obvious placeholder TURN secret. Rotate the live Coturn/TURN shared secret separately if the predictable sample value was ever deployed.
4. **Production cookie defaults.** Auth cookies default to `Secure` in production. Device-group cookies in password, Google, and account-switch flows follow the same production defaults. Admin cookies remain separately named but are now sent to the Socket.IO path too; previously their `Path=/api/v1/admin` prevented them from accompanying `/socket.io` handshakes.
5. **CORS fail-open behavior.** Production no longer allows arbitrary browser origins just because the allowlist is empty. Configure `CORS_ORIGINS` with the deployed client/admin origins.
6. **Spoofable rate-limit IP.** The rate limiter no longer trusts the raw `X-Forwarded-For` header directly. `TRUST_PROXY=1` opts into one trusted reverse proxy and is documented in the sample env file.
7. **Upload filename collisions.** Multer no longer writes the user-supplied original filename to disk. It generates a unique server-side name, sanitizes the extension, and bounds multipart file/field/part counts.
8. **Weak OTP randomness and username regex injection.** Signup/reset OTP generation now uses `crypto.randomInt`; signup and Google username completion validate type, length, and allowed characters before regex-backed uniqueness lookup.
9. **Production API/socket URL fallback.** The main client no longer silently targets the visitor's `localhost:8000` when production API configuration is absent. Socket.IO can derive its URL from `VITE_SERVER_URL` and also fails clearly when production configuration is missing.
10. **Test harness falsely reported all subsystems as passing.** `testSystemIntegrity.js` formerly logged hardcoded PASS results for 15 subsystems after only connecting to MongoDB. It is now accurately labeled and implemented as a DB connectivity smoke check.
11. **Syntax checks executed application modules.** `check-all.js` used to import every module, which could start the HTTP server, schedule jobs, or connect to the database. It now invokes Node's parser in child processes without executing application modules.
12. **Fatal errors did not actually stop the process.** The top-level handlers previously logged uncaught exceptions/unhandled rejections and then let the process continue. They now close Socket.IO and exit non-zero for a supervised restart.
13. **Regression/CI coverage.** Node tests cover required/placeholder JWT secrets and production cookie defaults. A GitHub Actions workflow is added for client/admin production builds and server checks.

## Remaining risks and verification work

- **Upload content validation is still incomplete.** Unique filenames and multipart-count limits are not a complete upload security policy. Add endpoint-specific size budgets, MIME/content sniffing, safe image/video transcoding, cleanup guarantees for temp files, and abuse controls. The current global cap still permits files up to 1 GB, which should not be the default for every endpoint.
- **Rate limiting is process-local.** The current in-memory map is not a shared distributed limiter. Validate its behavior under multiple backend instances and consider Redis-backed per-user/IP limits plus endpoint-specific OTP, login, search, upload, and messaging quotas.
- **No full E2E evidence yet.** Tests need real assertions for authorization/permissions, private account access, blocked users, multi-device refresh rotation, upload validation, feed visibility, messages and sockets, stories and sticker responses, WebRTC connectivity, and admin RBAC. UI needs desktop, tablet, and real mobile checks.
- **Deployment variables are mandatory.** Configure strong independent `JWT_SECRET` and `REFRESH_TOKEN_SECRET` values (at least 32 characters; cryptographically random 64-character values are recommended), strong TURN settings if TURN is enabled, and the correct production `VITE_SERVER_URL` / `VITE_SOCKET_URL`. Secure-cookie defaults assume HTTPS in production.
- **Environment files:** `admin/.env` and `admin/.env.production` are tracked. Their inspected keys are Vite-prefixed client configuration values (API/socket/app URLs and a Google OAuth client ID), not backend signing/database credentials. Keep deployment configuration in host settings where possible; never place server secrets in `VITE_*` variables.
- **Runtime UI verification remains open.** The live deployment could not be inspected using the available access path during this review. No claim is made that UI/UX or production builds passed in this environment; CI should supply build evidence once it runs.

## Acceptance criteria before calling VYBE production-ready

- All CI jobs green for the target commit.
- Automated API integration tests prove authentication, authorization, privacy, upload limits, and session revocation behavior.
- Browser E2E tests exercise core new-account → follow → post/story/reel → like/comment/share/save → DM/notification → block/report flows.
- WebRTC tests cover restrictive NAT/TURN connectivity, reconnects, participant authorization, and cleanup.
- Mobile/desktop visual review records screenshots at representative widths and tests accessibility, keyboard navigation, reduced motion, loading/empty/error states.
- A versioned feature-parity checklist is signed off against the explicitly chosen Instagram client/version; unavailable or intentionally different features are documented.



## Additional high-risk issues found and addressed during continued review

14. **Socket.IO identity spoofing and unsafe relay events.** Client-controlled `register-user` previously could assign a socket to another user's room. Notification relay and several messaging/Reel events trusted client payloads directly. Socket identity is now pinned to the authenticated handshake principal; direct client notification relay is rejected; message and Reel events verify persisted state before announcing it.
15. **Unauthorized call/meeting room operations.** Arbitrary call-room joins, media signals, chat relays, host moderation, recording indicators, and several meeting controls lacked adequate membership/role checks. Call events now require call-session participation and room membership; meeting events require a registered attendee and enforce host/co-host permissions for recording, pinning, ending and breakout controls. Breakout rooms must exist in the active server-side session.
16. **Private live audience bypasses.** The REST API previously listed close-friends streams and exposed details/replays/questions without checking the audience configuration. Active listings, details, replay access and Q&A submissions now enforce the host's close-friends list; Socket.IO joins already apply the same audience check.
17. **Live Q&A schema mismatch.** Controllers pushed into `LiveStream.questions`, but the Mongoose schema did not define that field. A typed questions array now exists, so submit/display flows can persist their state instead of failing with an undefined-array error.
18. **Direct-message IDOR and destructive side effects.** Message reads previously cleaned up disappearing messages before validating conversation membership; other API paths could mark messages seen, reset unread counts, query shared media/pinned messages, or forward by message ID without proving source membership. Authorization now occurs before reads/cleanup, voice-note uploads, read-receipt mutations, and forwarding. Forwarding is capped at 10 target conversations and the counter reflects actual successful forwards.
19. **Community channel access gaps.** The pinned-message endpoint returned records without validating channel/community access; reactions and edits also lacked current membership checks. Those endpoints now validate membership and payload bounds, and deletion events are emitted from the authorized REST handler rather than trusting a client-generated delete broadcast.
20. **Private live replay leakage.** Close-friends visibility now applies to active stream discovery, stream detail, replay retrieval and live Q&A—not just the WebSocket room join.

These fixes are static code changes with CI syntax/build regression coverage. They have **not** been exercised against production data or verified with multi-account browser E2E tests, so they must be reviewed and tested in a staging environment before deployment.

## Current Instagram product baseline used for parity review

A parity checklist needs a dated target because Instagram differs by region, device and rollout cohort. As of 10 October 2026, the audit checked the following official Meta announcements as feature baselines (not as a claim that every feature is available to every account):

- **DM scheduled messages, translation, pinned content, and group-chat QR invites:** Meta's February 2025 announcement: https://about.fb.com/news/2025/02/new-instagram-dm-features-stay-connected/
- **Instagram Map and Reels Friends tab:** Meta's August 2025 connection/features announcement: https://about.fb.com/news/2025/08/new-instagram-features-help-you-connect/
- **Instagram Map rollout in India and explicit sharing indicators:** https://about.fb.com/news/2025/10/now-in-india-instagram-rolls-out-map-feature-to-help-people-connect-with-friends/
- **Instants disappearing photo flow (announced May 2026):** https://about.fb.com/news/2026/05/instants-share-in-the-moment/

A repository search found related but not equivalent VYBE implementations (generic message search, AI/caption translation, location-tagged content, Reel repost, Stories/vanish-style messages). It did not establish the exact DM scheduling/translation/QR flows, Reels Friends activity tab, opt-in friend location map and sharing indicators, or the Instants capture/open/expiry/archive lifecycle. Treat these as **parity work not yet demonstrated by source inspection**, and verify against the chosen Instagram app/version and region before adding final requirements.
