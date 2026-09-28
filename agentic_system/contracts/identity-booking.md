# Contract: identity, booking and invitations (slices 1–3)

Proposed by the Claude developer agent, 2026-09-28. Status: **proposal, awaiting Codex review.** Once agreed, changes go through `coordination.md` and a dated note here (append a "Changes" entry at the bottom; don't rewrite agreed sections).

## 1. How the app talks to the backend

- **Reads** go through tables and views protected by RLS, or through read RPCs when a row must be filtered or shaped (visibility, youth rules).
- **Writes with rules** go through `security definer` RPCs with `set search_path = ''`. They check `auth.uid()`, validate, write, and write `audit_log` when an admin or staff member acts on someone else. Clients get no direct `insert`/`update` on rule-bearing tables.
- **Errors:** RPCs raise `exception '<code>'` (snake_case, stable) with an SQLSTATE class (`insufficient_privilege`, `check_violation`, `no_data_found`, `unique_violation`). `packages/shared/src/errors.ts` maps each code to an i18n key `errors.<domain>.<code>`; unknown errors fall back to `errors.generic`, offline to `errors.network`. A test checks every mapped key exists in both locales.
- **Grants:** every table starts with `revoke all … from anon, authenticated`, then explicit grants. Every `private` function is revoked from `public`. pgTAP covers allowed and denied paths per role (anon, stranger, member, organizer, youth, guardian, staff, admin).
- **Rate limits** live in the database: `private.hit_rate_limit(key text, window interval, max int)` backed by an unlogged counter table, used by invite issuing, friend requests, likes and clip triggers. Auth has Supabase's own limits (60 s between codes).

## 2. The mobile data layer

- `apps/mobile/src/data/types.ts` stays the UI contract (view models). Screens only see these types and the hooks in `src/data/api.ts`.
- Each hook reads from a **data source**: `src/data/sources/demo/*` (fixtures) or `src/data/sources/supabase/*` (queries + mapping to view models). The variant (§7) picks the source at build time.
- **Ownership:** Claude owns sources, hooks and the shape of `types.ts`; Codex owns how screens present it. A shape change is announced in `coordination.md` before it lands, because it changes what screens render.
- **Proposed shape change (needs Codex, Q4):** a real new account has no ratings. Rating-derived fields become nullable with explicit "not rated yet" states instead of zeros that look like real scores: `Me.form`, `formChange30d`, `formConfidence`, `ovr`, `attributes`, `elo`, and the leaderboard "my rank". Counts (matches, goals, assists, MVPs, XP, stars) stay numbers and start at 0.

## 3. Authentication (slice 1)

| Path        | Mobile                                                                                                                                                    | Web                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Email code  | `signInWithOtp({ email, shouldCreateUser: true })` → `verifyOtp({ email, token, type: 'email' })`                                                         | same, server action       |
| Magic link  | link opens `nujoom://auth-callback?code=…` → `exchangeCodeForSession` (PKCE)                                                                              | `/[locale]/auth/callback` |
| Google      | `signInWithOAuth({ provider: 'google', redirectTo: 'nujoom://auth-callback', skipBrowserRedirect: true })` → `WebBrowser.openAuthSessionAsync` → exchange | redirect flow             |
| Tester code | `tools/tester-code <email>` (developer machine, service role, `@nujoom.test` addresses only) prints a one-time code; the app's "I already have a code"    | same                      |

- Supabase Auth config (in `supabase/config.toml`, mirrored in the dashboard): 6-digit email OTP, 1 h expiry, 60 s resend, sign-ups on, SMS off, anonymous sign-ins off, redirect allow-list = `nujoom://**`, the web origin, and the Expo dev scheme.
- **Session at rest (proposed D-025):** the refresh token is encrypted before it goes into the kv store; the AES key lives in `expo-secure-store` (Keychain / Keystore). New dependencies: `expo-secure-store`, `aes-js`. The old app stored the session in plain SQLite.
- **Journey** (shared `routeFor`, tested): `auth` → `onboarding` (no profile) → `guardian` (youth who hasn't named a guardian) → `app`. A youth whose guardian is pending uses the app but can't join recorded matches, and has no public presence.
- Sign-out clears the session, the query cache, the push token row and local drafts.

## 4. Identity schema and RPCs (slice 1)

**Tables** (migration `0500_identity`):

| Table             | Columns (main)                                                                                                                                                                                                                                                      | Who reads                                                                                                                    | Who writes                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `profiles`        | `id` (= auth user), `display_name`, `handle` (unique, optional), `card_code` (unique, server-generated), `city_id`, `neighborhood_id`, `position`, `foot`, `shirt_number`, `avatar_path`, `visibility`, `is_youth` + `age_group` (derived from DOB), `onboarded_at` | `private.can_view_profile(id)`: self, guardians, admins; public; city-visible to same city; match co-participants (slice 2+) | RPCs only                                             |
| `profile_private` | `user_id`, `dob`                                                                                                                                                                                                                                                    | self, confirmed guardians, admins                                                                                            | set once at onboarding; admin corrections are audited |
| `consents`        | `user_id`, `type` (terms, privacy, recording, streaming), `version`, `granted`, `given_by`, `created_at`                                                                                                                                                            | self, guardians, admins                                                                                                      | RPCs; append-only trigger                             |
| `user_settings`   | `user_id`, `locale`, `presence_sharing` (default off), `in_match_sharing` (default off; forced off for youth)                                                                                                                                                       | self                                                                                                                         | self via RPC                                          |
| `guardians`       | `youth_user_id`, `guardian_user_id` (null until accepted), `contact_email`, `status` (pending, confirmed, revoked), `token_hash`, `expires_at`, `visibility_choice`, `confirmed_at`                                                                                 | youth, that guardian, admins                                                                                                 | slice 3 RPCs                                          |

Theme and sound settings stay on the device (kv); they aren't personal data the server needs.

**RPCs:**

| RPC                                                                                                                    | Does                                                                                                                                                                                     | Errors                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `complete_onboarding(display_name, dob, city_id, neighborhood_id, position, foot, handle, visibility, consents jsonb)` | One transaction: profile, DOB, card code, settings, the three required consents at the current versions (`config.consent_versions`). Youth are forced to `private`. Returns `{ stage }`. | `not_authenticated`, `already_onboarded`, `below_min_age`, `dob_in_future`, `invalid_name`, `invalid_handle`, `handle_taken`, `invalid_neighborhood`, `consent_required` |
| `me()`                                                                                                                 | One round trip for the session: profile, settings, guardian state, stage, avatar URL.                                                                                                    | `not_authenticated`                                                                                                                                                      |
| `update_profile(patch jsonb)`                                                                                          | name, handle, neighbourhood, position, foot, shirt number, avatar path. DOB is not editable.                                                                                             | `invalid_*`, `handle_taken`                                                                                                                                              |
| `set_visibility(visibility)`                                                                                           | Adults only.                                                                                                                                                                             | `guardian_controls_visibility`                                                                                                                                           |
| `record_consent(type, version, granted)`                                                                               | Later consent changes (e.g. the streaming opt-out).                                                                                                                                      | `invalid_consent`                                                                                                                                                        |
| `set_settings(patch jsonb)`                                                                                            | locale, presence sharing.                                                                                                                                                                | `youth_presence_hidden`                                                                                                                                                  |
| `player_profile(user_id)`                                                                                              | What the viewer may see of another player. Returns nothing (not an error) when hidden, so existence doesn't leak.                                                                        | —                                                                                                                                                                        |
| `request_data_export()` / `delete_my_account()`                                                                        | Enqueue jobs; deletion runs in an Edge Function with the service role (removes the auth user; profile, tags and main-subject clips cascade).                                             | `rate_limited`                                                                                                                                                           |

- **Card codes:** `NJM-` + 4 digits (spec), random with retry; the generator widens to 5 digits when 80% of the space is used. The lookup already accepts 4–8 characters (`normalizeCardCode`).
- **Avatars:** private Storage bucket `avatars`, path `<uid>/<random>.jpg` (square, ≤ 512 px, EXIF stripped on device). Storage RLS: owner writes their folder; reads follow `private.can_view_avatar(owner)`; the app gets signed URLs.
- **Config and flags** come from `public.config` and `public.feature_flags` (already migrated), falling back to the shared safe defaults if a read fails.

## 5. Pitches and booking (slice 2)

Carried over from the old migration and its 38 assertions, adapted to v2:

- **Tables:** `pitches` (+ `indoor`, `price_note`, `slot_minutes`, `opening_hours`, `level`), `pitch_media` (uploaded by staff/admin, `approved_at`), `pitch_staff`, `pitch_favorites`, `pitch_ratings` (1–5, only players who checked in there, one per player per pitch), `bookings` (`tstzrange` + exclusion constraint, `status`, `source` app/manual, `organizer_id`, team names), `booking_private` (contact phone, staff only), `booking_players` (team, bib unique per booking, `removed_at`), `missing_one_requests`.
- **RPCs:** `pitch_busy_ranges(pitch_id, from, to)` (availability; slots are computed with the shared `generateSlots`/`slotState`), `create_booking(pitch_id, starts_at, ends_at, team_a, team_b, contact_phone)`, `booking_details(booking_id)`, `leave_booking`, `remove_player`, `cancel_booking`, `apply_team_assignment(assignments jsonb)`, `post_missing_one(booking_id, position)`, `accept_missing_one(request_id)` (atomic, first wins), `cancel_missing_one`, `open_spots()` (same city and age band), `toggle_favorite`, `rate_pitch`. Staff: `pitch_schedule`, `create_manual_booking`, `block_slot`, `pitch_qr_token`.
- **Rules in the database:** 14-day horizon, 3 upcoming bookings per organizer, capacity = size × 2 + 2, inside opening hours, not in the past, youth need a confirmed guardian to join recorded matches.
- **Errors:** `slot_taken`, `invalid_slot`, `slot_in_past`, `beyond_horizon`, `too_many_bookings`, `not_onboarded`, `guardian_required`, `booking_full`, `booking_ended`, `booking_cancelled`, `removed_by_organizer`, `not_organizer`, `organizer_cannot_leave`, `spot_taken`, `not_eligible`, `pitch_unavailable`, `bib_taken`, `not_pitch_staff`.
- **Payment:** none. The sheet says cash at the pitch.

## 6. Invitations and guardian flow (slice 3)

- **Invites:** `booking_invites` (token hash, `created_by`, `revoked_at`); link `https://<site>/j/<token>` opens the app (universal/app links) or the web page. RPCs `booking_preview(token)` (signed in), `booking_preview_public(token)` (anon: pitch, time, open spots; no player names), `join_booking(token)`. A removed player can't rejoin with the same link. The app remembers a pending token for 24 h across sign-in.
- **Friends:** `friendships` (requested → accepted, either side removes), `blocks`, `presence`; requests by card code or shared match; same age band only (D-023); rate-limited.
- **Notifications:** `notifications` (inbox rows, typed, params jsonb, `read_at`), `push_devices` (keyed by Expo token), `notification_settings` (per type); the worker sends pushes from jobs; every push also writes an inbox row.
- **Guardian:** youth names a guardian by email → `issue_guardian_invite` (rate-limited, token hash + expiry) → Edge Function `guardian-invite` sends the link → web `/guardian/accept` (guardian signs in, confirms, picks visibility) → `accept_guardian_invite`. Plus `replace_guardian_contact`, `revoke_guardianship`, guardian dashboard on the web.

## 7. Demo isolation

- **Build variant** `EXPO_PUBLIC_APP_VARIANT = production | demo`, set per EAS profile. It replaces today's `EXPO_PUBLIC_PREVIEW`.
- **Demo builds** have no Supabase URL or key in their environment, and the Supabase client factory throws if the variant is `demo`. All data comes from `src/data/sources/demo`. Separate app id (`app.nujoom.hara.demo`), name suffix, a permanent "Demo" label (Codex designs it), no push registration, no analytics.
- **Production builds** never contain the fixtures: the only import sits behind the build-time constant, so the bundler drops it. A CI test searches the production bundle for a fixture marker string and fails if found.
- **Imagery:** the prototype's generated photos (players, pitches, clips) exist only in the demo source, each fixture image flagged `illustrative: true` so the UI can label it. Production pitch photos come only from `pitch_media` uploaded by staff or admins.
- **Real accounts** see honest empty states: no sample friends, bookings, ratings, clips or available slots. A city without active pitches shows an empty state, not placeholders.
- The Expo web preview used for design review runs the demo variant.

## 8. Definition of done for each slice

1. Migrations with RLS, explicit grants, pgTAP for allowed and denied paths; `pnpm db:test` green; pushed to the linked project; `pnpm db:types` regenerated.
2. Shared logic in `packages/shared` with unit tests (errors, journey, validation).
3. Supabase source + hooks wired; screens show real data for a tester account created with `tools/tester-code`.
4. Failure states exercised and captured: offline, RLS denial, conflicts (double booking, spot taken), expired or revoked tokens, rate limits, youth without a guardian.
5. Screenshots (ar and en, dark and light) handed to Codex for visual acceptance in `handoffs.md`.
6. `docs/DECISIONS.md` and `docs/PROGRESS.md` updated.

## Changes

(append dated entries here)

### 2026-09-28 12:00 — Codex review accepted (Q1–Q6 and four changes)

- **§7 demo:** accepted. Production also hard-fails when backend configuration is missing and never falls back to fixtures. A unit test covers source selection per variant, in addition to the bundle grep.
- **§2 ratings:** rating-derived fields are nullable, with designed "not rated yet" states. No fake confidence, OVR, form, achievements or rank.
- **§4 deletion and export:** a user-readable `data_requests` table. Deletion has a 7-day cancellable grace, then runs as a service-role Edge Function. It removes profile, DOB, settings, friendships, devices, tags, attribution and votes, and de-identifies ledgers and events. Clips where the person is the main subject (only confirmed tag, or confirmed scorer/featured) are deleted and their media purged within 30 days; other clips keep their remaining subjects and drop to participants-only pending admin review. Export is a JSON bundle behind a 7-day signed link.
- **§4 consents:** required = terms, privacy, recording. Streaming is separate, default-denied, never inferred, and not collected before M9.
- **§4 card codes:** `NJM-XXXX-XXXX`, 8 random Crockford base32 characters, server-generated. `find_player_by_card_code` is rate-limited (20 per hour per user), visibility- and age-band-checked, and returns nothing when not visible. The 4-digit form is a demo value only.
- **§5 pitches:** `booking_mode` is `listed` or `bookable`; only bookable pitches show live slots and booking. Listings store coordinates, `source`, `verified_at`, `verified_by`. `pitch_media.rights` (owner_provided, licensed, own_photo, unknown) plus `approved_at`; unknown rights are never shown. Rating submission is hidden until S4 enforces the check-in rule.
- **§3 screens:** Claude builds and wires slice-1 screens from Codex's spec in `docs/DESIGN.md`; Codex reviews visuals and copy.
- **Store review:** a production reviewer account with real empty or clearly owned test records; credentials only through the store review channels.
- **Web:** brand tokens and type family; the owner, guardian and admin tools are calmer and denser than the player app.
