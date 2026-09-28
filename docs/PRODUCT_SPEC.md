# PRODUCT SPEC v2 — Street Football App ("Nujoom al-Hara / نجوم الحارة")

> Single source of truth for the product. Version 2 (2026-09-28) replaces v1.
>
> Changes from v1:
>
> - The final visual design and feature set come from the owner's design prototype (§2).
> - Sign-in moved to email and Google.
> - New features: friends, match tools, XP, stars, attributes, endorsements, pitch ratings, clip likes, match timeline, notification inbox, light theme, sounds.
> - Ratings use three metrics (§6.10).
>
> When something here is ambiguous or conflicts with a technical reality, stop and ask. Record every decision in `docs/DECISIONS.md`.

---

## 1. Vision and market

Book a pitch. Every match gets recorded, and every player gets their own highlights and ratings from the people they actually played with. Ratings add up into neighbourhood, city and country rankings and a FIFA-style player card. Later, verified player profiles let academies and clubs discover talent.

- **Launch market:** Jordan, starting in Amman.
- **Languages:** Arabic (default, RTL) and English from day one.
- **Currency, time, phones:** JOD, Asia/Amman, E.164 phone numbers (default +962).
- **Reality:**
  - Most users are on Android, often cheap phones on weak and expensive mobile data.
  - Players are 13–25 and share on WhatsApp, Instagram and TikTok.

## 2. Design (final; owner decision 2026-09-28)

The visual design, tone of voice and sounds come from the owner's design prototype. It is kept in git history, commit `9f9017d`, `src/`. **They are fixed.** Implementation must match them. `docs/DESIGN.md` is the implementation reference: tokens, type, components, motion and sound.

- **Look:** dark "floodlit street" identity.
  - Graphite surfaces, night-pitch gold primary (`#f59e0b` / `#ffc174`), floodlit emerald secondary (`#00a572` / `#4edea3`), crimson for urgency and live.
  - Frosted header and bottom bar; glowing cards.
  - Fonts: Rubik for headlines, Plus Jakarta Sans for body, Space Grotesk for numbers and tags.
- **Themes:** dark by default, plus a "daylight" light theme, chosen by the user.
- **Navigation:** five bottom tabs, in RTL order:
  - Home (الرئيسية)
  - Pitches (الملاعب)
  - Match (المباراة)
  - Leaders (المتصدرين)
  - Me (ملفي)
- **Header:** logo, name, city chip, per-tab subtitle, theme toggle, friends and notifications buttons, avatar.
- **Sound and haptics:** five synthesized sounds (whistle, clip beep, success chime, coin toss, ding) plus vibration on key actions. A settings switch mutes them.
- **Copy tone:** Jordanian street-football Arabic ("يا كابتن", "ناقصنا واحد", "قطية"). English is a natural translation, not a transliteration.
- **Honesty rule:** copy never claims capabilities we don't have. The "AI camera" wording becomes phone recording until M9/M10; no "first aid at every pitch".

## 3. Roles

| Role                 | Description                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Player (adult, 18+)  | Books or joins matches, records, gets highlights, votes, rates, has a profile, card and ranking |
| Youth player (13–17) | Same as a player, with a linked guardian and strict privacy rules (§7). Minimum age 13          |
| Guardian             | Adult linked to a youth; approves them and controls their visibility (web)                      |
| Organizer            | The player who created a booking; manages roster, teams, match tools and the match              |
| Pitch owner / staff  | Pitch profile, schedule, walk-in and phone bookings, QR poster (web dashboard)                  |
| Admin                | Moderation, reports, pitch levels, config, feature flags (web)                                  |
| Scout / academy      | LATER                                                                                           |

## 4. Core loop

1. **Book** a pitch and invite friends; fill gaps with "missing one".
2. **Prepare** with the match tools: fair teams, a coin toss, who brings what, splitting the cost.
3. **Check in** at the pitch by scanning its QR code.
4. **Record** on one phone. Anyone checked in taps "clip that" on their own phone.
5. **Highlights** are processed and delivered; players tag themselves, like and share.
6. **After the whistle:** vote for MVP, rate attributes, give endorsement badges.
7. **Ratings update**, then rankings, card, XP and stars. Players want to climb, so they play and book more.

## 5. Scope

### Pilot (must be production-ready)

- **Accounts:** email-code and Google sign-in, onboarding, consent, age gate, guardian linking, settings, data export and deletion.
- **Player:**
  - profile and FIFA-style card, shareable as an image, with a card code
  - career stats, form, XP and stars (reward points), charts
- **Friends:** requests by card code or from shared matches; presence (online/offline); invites to a booking.
- **Pitches:**
  - a prepared, reviewed Jordan directory searchable by area/name and known field features; both verified and unverified pitches have explicit status badges
  - availability, slots, favourites, star ratings and in-app booking only for verified participating fields; geographic map view of both statuses
  - owner web dashboard and QR poster
- **Booking:** double-booking protection, WhatsApp invite links, join, teams and bibs, "missing one".
- **Match tools:** fair squad splitter with coin toss, gear checklist, cost splitter (tracking only; no money moves).
- **Match day:** QR check-in, recording device, mounting guide, segmented recording with rolling buffer, remote clip trigger, upload queue, live timeline and score.
- **Highlights:**
  - video worker: clips, thumbnails, vertical version, watermark
  - feeds, player, likes and views, tagging, public share pages that respect privacy
- **Post-match:** MVP voting, attribute ratings, endorsement badges.
- **Rankings (beta):** Elo, leaderboards (players and neighbourhoods), player of the week.
- **Notifications:** push plus an in-app inbox; every type can be switched off.
- **Safety and admin:** reports, takedowns, bans, anti-collusion, config and flags, audit log, analytics KPIs.
- **Payments:** `payments_enabled = false`. Bookings are paid at the pitch; nothing is charged in the app.

### LATER (keep the architecture compatible; do not build)

- M8 payments, including any cash value for stars
- M9 pitch camera kit and YouTube live
- M10 AI auto-highlights
- M11 scout portal
- M12 tournaments (the pro / amateur / family leaderboard filter stays hidden until then)

### Non-goals, forever for the pilot

- No chat, direct messages or comments of any kind, including free-text testimonials.
- No betting or predictions with rewards.
- No paid ranking boosts, ever.

## 6. Features

### 6.1 Accounts and onboarding

- **Sign-in:** passwordless email (6-digit code or magic link) and Google, both through Supabase Auth with PKCE. A "tester code" path exists for pilot testers. Phone OTP can return once an SMS provider is chosen.
- **Onboarding collects:**
  - display name and date of birth
  - city and neighbourhood
  - position (GK / DEF / MID / FWD), dominant foot (optional), photo (optional), handle (optional, unique, `@handle`)
- **Consent (versioned; owner decision C-010, 2026-09-28):**
  - Required for the account: terms and privacy.
  - Recording is a separate, optional yes/no, asked at onboarding and changeable in Settings. Declining never blocks the account or unrecorded use. It only closes recorded matches. Youth also need a confirmed guardian's yes.
  - Each recorded match re-checks every participant's recording permission before capture and fails closed.
  - Public sharing and future streaming are separate permissions, never inferred from recording.
- **Age gate:**
  - Under 13 is rejected.
  - 13–17 enters the youth flow (§7), with a guardian named by email.
- **Adult visibility:** public, city-only or private. Defaults to city-only in onboarding and private in the database.
- **Settings:**
  - language (reloads the app to switch RTL/LTR), theme, sounds
  - notification types, visibility, presence sharing
  - guardian status, export data, delete account, sign out

**Acceptance:** sign-up in under 60 seconds; consents stored with their versions, including a declined recording choice; a player who declines recording can still use the app; a youth cannot join recorded matches or appear anywhere public until a guardian confirms.

### 6.2 Profile, card and progression

- **Card:**
  - overall (OVR, 1–99), position tag (ST, CM…), flag
  - photo (or initials badge), name, neighbourhood
  - six attributes: PAC, SHO, PAS, DRI, DEF, PHY (§6.10)
  - card code `NJM-####`
  - 3D tilt on drag or device tilt
  - shared as a server-rendered image, regenerated when stats change
- **Career stats:**
  - matches played
  - goals (confirmed tags on goal clips)
  - assists (confirmed assist tags)
  - MVP awards
  - form rating (x/10)
  - Elo and confidence, last-5 form (W/D/L with score)
  - highlight reel, endorsement badges
- **XP (non-spendable progression):** earned for check-in, completed counted matches, MVP, confirmed goals and assists, and casting a vote. Values are in `config`. Charts show XP and goals per month.
- **Stars (reward points; owner decision 1):**
  - Earned for MVP, counted matches, hat-tricks and (later) tournament wins; values in `config`.
  - Tier by total earned: برونزي / فضي / ذهبي / أسطوري (bronze / silver / gold / legendary).
  - Stars have **no cash value, cannot pay for bookings and cannot be bought or transferred.** Any redemption waits for M8 and legal review.
  - Balances come from an append-only ledger written only by the server.

### 6.3 Friends

- **Requests:** by card code, or from the roster of a match you both played. Accepting makes it mutual. Either side can remove the friendship; blocking hides both ways.
- **Same age band only:** youth only with youth, adults only with adults (§7).
- **Presence:** friends see online/offline only. Adults may opt in to showing "in a match at <pitch>"; this is never shown for youth (owner decision 5).
- **Invite a friend to a booking:** a structured in-app notification with the join link. No free text.

### 6.4 Pitches and the owner dashboard

- **Prepared directory (D-032):** collect and review as many publicly accessible football facilities and individual fields across Jordan as possible. The player searches Nujoom's own catalog; the app does not run a third-party place search at query time. A facility may contain several separately described fields. Both verified and not-verified fields appear in search and on the map with explicit badges. Do not claim full national coverage without independent evidence.
- **Pitch profile:**
  - names (ar/en when known), area, reviewed coordinates/entrance, public-access status and source/last-review information
  - each physical field's evidenced format/capacity, dimensions/layout where known, surface, indoor/outdoor, lights and amenities; unknown attributes remain unknown
  - photographs only with usable rights; an unverified venue never borrows a generated pitch image as if it were real
  - owner-confirmed price, pricing note, opening hours and slot length exist only for participating fields
  - **Verified by Nujoom / Not verified by Nujoom** is the player-facing participation badge per field; location confidence and `pitch_level` remain separate internal/quality concepts
- **Verification:** an operator is contacted, agrees to join, proves authority over the facility, confirms each participating field and its details, and activates an accurate schedule. Only then does that field receive the public verified badge and become bookable. Importing a location or receiving a community submission never verifies the operator. A facility can contain fields with different statuses.
- **Search:** by city/area/name and known field features across both statuses. The 14-day date strip, availability and slots apply only to verified participating fields. An unverified result offers details, directions where location confidence permits, and correction/reporting, but no Nujoom booking, match creation or check-in.
- **Map view:** show the same prepared catalog and status badges as the list. A real licensed map/tile provider is required before presenting this as a geographic map; the schematic demo grid is not production map evidence. Searchable list access must work without map tiles or location permission.
- **Ratings:** 1–5 stars only from players who checked in at a verified field, one per player per pitch, editable. No text reviews (owner decision 2 principle).
- **Owner dashboard (web):**
  - calendar, manual bookings (name and phone), claim links, blocked slots, prices and hours
  - QR poster PDF, staff accounts
  - basic stats: bookings per week, matches recorded

### 6.5 Booking and invitations

- **Create:** pick a slot to create a booking; you become the organizer. The database blocks double booking with an exclusion constraint.
- **Limits:** a 14-day horizon, at most 3 upcoming bookings per organizer, and capacity = size × 2 + 2.
- **Details:** optional contact phone (visible to pitch staff only), optional team names (default "الفريق الأزرق" / "الفريق البرتقالي" — blue team / orange team).
- **Payment:** at the pitch only. The booking sheet shows "cash at the pitch"; there is no stars payment (owner decision 1).
- **Invites:**
  - share a link (`https://<site>/j/<token>`, which opens the app or a web page) to WhatsApp
  - or invite friends in the app
- **Players:** join by link; the organizer can remove players. Removed players cannot rejoin with the same link.
- **Teams:** A/B plus bibs 1–12, set manually or with the fair squad splitter (§6.6).
- **"Missing one" (ناقصنا واحد):**
  - The organizer posts an open spot, with an optional wanted position.
  - Players in the same city and age band with the notification enabled get a push.
  - The first to accept joins.
- **Manual bookings:** bookings made by pitch staff can be claimed by the customer through a one-time link.

### 6.6 Match tools (per booking; organizer edits, participants see)

- **Fair squad splitter (قرعة التشكيلة):**
  - Balances Team A and B by rating (snake draft on Elo, positions spread) or randomly.
  - Shows the balance meter; swap a player's team or bench them.
  - Coin toss (kick-off or side) with sound.
  - Saves to the booking's teams; shares the lineup to WhatsApp.
- **Gear checklist (عتاد المباراة):**
  - Default items: ball, bibs, water, whistle, first-aid kit; custom items can be added.
  - A participant claims an item and marks it ready; progress shows; share to WhatsApp.
- **Cost splitter (قطية الملعب):**
  - Pitch cost plus extras, divided per player.
  - The organizer marks who paid (cash or CliQ) and can show their own CliQ alias to copy.
  - Tracking only; the app never moves money.

### 6.7 Match day and check-in

- **QR check-in:** each pitch has a static QR poster. Scanning in the app during the booking window (30 minutes before to the end) checks the player in. GPS within about 300 m is stored as an extra signal and never blocks.
- **Roster:** progress shows the checked-in count against the roster ("10 / 12").
- **Recording device and mounting guide:**
  - The organizer picks one participant's phone.
  - Guide: behind the goal or on the fence at head height, landscape, whole pitch visible; live preview with a grid.
- **Live timeline and score:**
  - The organizer (or the recording phone) logs events with the match minute: goal (team, scorer, assist optional), save, substitution.
  - A goal clip creates a goal event draft to confirm.
  - The live score is the sum of goal events. The final score is entered by the organizer and confirmed by a player of the other team.
  - Match clock and half indicator; optional referee name.
- **Clip control:** a big "سجّل اللقطة!" (record the moment!) button plus "هدف" (goal) and "مهارة" (skill) chips (§6.8).

### 6.8 Recording engine (mobile). Prototype first: M-spike

- **Segments:** continuous 10-second MP4 segments at 720p30 H.264 (2000 kbps; configurable).
- **Rolling buffer:** the last N segments; older ones are deleted unless full-match mode is on.
- **Clip trigger:**
  - Any checked-in participant taps; the trigger goes over Supabase Realtime (one channel per match) to the recording phone.
  - Window: **30 s before and 5 s after** by default, in config, so "saves the last 30 seconds" is true.
  - Server-time offsets align phones.
- **Clip types:** `moment`, `goal`, `skill`.
- **Full-match mode:** keeps everything and uploads on Wi-Fi only.
- **On the recording phone:**
  - keep the screen awake; show recording status
  - battery warning at 20%
  - survive screen-off where the OS allows; resume after an interruption and log gaps
- **Upload queue:** background, resumable, retries with backoff, Wi-Fi-only option, presigned R2 URLs, segment metadata.
- **Library:** `react-native-vision-camera`; no on-device FFmpeg.
- **Spike rule:** before building the full UI, prove it with a 60-minute run on a real Android phone and a real iPhone. Report, then stop.

### 6.9 Processing, highlights and sharing

- **Worker (Python + FFmpeg):** a Postgres job queue with `FOR UPDATE SKIP LOCKED`; jobs are idempotent and retried.
  - For each clip: concat → trim → H.264 720p faststart → thumbnail → 9:16 vertical → watermark → upload → `ready` → push.
  - Full-match files are kept for 30 days by default.
- **Feeds:**
  - Home "trending in your hara": clips the viewer may see, ranked by recent likes and views.
  - Profile highlight reel.
  - Match timeline links to clips.
- **Clip page:** player, likes (one per user), unique views per day, share, report.
  - Download only when the clip is public-eligible (owner decision 9).
- **Tagging:**
  - "that's me" or tag a participant as scorer, assister or featured.
  - A tag is confirmed by the tagged player or by 2 other participants.
  - Any tagged player can request removal; the clip is hidden until admin review.
- **Public share page (web):** only if every visible player in the clip may be public (§7). Otherwise the link opens only for participants and guardians.
- **Player of the Match card:** generated after voting closes.

### 6.10 Voting, ratings and rankings (beta; all parameters in `config`)

- **Timing:** voting opens when the organizer ends the match (or at booking end) and closes 24 hours later. Before it opens, the match screen shows candidates with no percentages. Results show after close.
- **MVP vote:**
  - Only checked-in participants vote, once each, not for themselves; either team counts.
  - Most votes wins; ties give MVP to both.
- **Attribute ratings:**
  - In the same post-match sheet, each voter may rate up to 6 other participants on PAC / SHO / PAS / DRI / DEF / PHY, 1–5 each.
  - Optional, and quick (one tap per attribute).
- **Endorsements (owner decision 2):**
  - Voters may give fixed badges to other participants, one per badge, per giver, per receiver, per match.
  - Badges: قنّاص Finisher, صانع لعب Playmaker, جدار دفاعي Wall, يد أمينة Safe hands, قائد Leader, روح رياضية Sportsman. No free text.
- **The three metrics (owner decision 4):**
  1. **Elo (leaderboards):**
     - Team-result Elo from team average ratings; K = 24.
     - MVP bonus up to +15 by vote share.
     - The whole update is multiplied by the trust weight (self-recorded 0.5, dock 0.75, verified 1.0).
     - Matches with fewer than 6 QR check-ins don't count.
     - Display = (n/(n+5))·raw + (5/(n+5))·1000.
     - Confidence % = n/(n+5); low / medium / high.
  2. **Card OVR and attributes:**
     - attribute = 40 + 59 × (m − 1)/4, where m is the mean of ratings received, shrunk toward 3 with k = 5 ratings
     - OVR = mean of the six attributes
  3. **Form rating x/10:**
     - Match score = 2 × the mean attribute rating received in that match.
     - Form = the weighted mean of the last 10 match scores, shrunk toward 6.0.
- **Ranking eligibility:** at least 5 counted matches and at least 10 distinct opponents in the period.
- **Leaderboards:**
  - scopes: my neighbourhood, city, country
  - age groups: U14, U16, U18, Adults (U12 stays disabled, min age 13)
  - periods: week, month, season
  - optional position filter
- **Neighbourhood podium:** average display Elo of the top 10 eligible players per neighbourhood, per age group, with the change from last week.
- **Player of the week:** most confirmed goals in scope this week (visibility rules apply).
- **"My rank" bar:** the viewer's rank, Elo and weekly change, with a share button.
- **Anti-collusion:** reciprocal vote pairs in 3 or more matches are down-weighted to 0.5 and flagged for admins. Voters with more distinct opponents weigh slightly more.
- **Recompute:** a scheduled job; `rating_history` is kept per match.
- **Labelling:** everything is labelled "Beta".

### 6.11 Notifications

- Push through Expo, and every push also lands in the **in-app inbox** (bell, unread badge, per-tab dots, mark all read).
- **Types:**
  - invited, friend request/accepted
  - booking reminder (2 hours before), check-in open
  - clips ready, voting open/closing, MVP result
  - "missing one" nearby, weekly ranking
- Each type can be switched off.

### 6.12 Admin (web)

- **Records:** users, pitches (`pitch_level`), bookings, matches, clips.
- **Moderation:** reports queue, takedowns, bans.
- **Anti-collusion:** flags queue.
- **Settings:** config editor, feature flags, audit log.
- **KPI page:**
  - matches recorded per pitch per week, % of matches with clips viewed, clips shared per match
  - % of participants who vote, teams rebooking within 14 days

### 6.13 Analytics

An `events` table (PostHog later) records:

- `booking_created`, `player_joined`, `checkin_completed`
- `recording_started`, `recording_stopped`, `clip_triggered`, `clip_ready`, `clip_viewed`, `clip_shared`, `clip_liked`
- `tag_added`, `tag_confirmed`, `vote_cast`, `attributes_rated`, `endorsement_given`
- `player_card_shared`, `missing_one_posted`, `missing_one_filled`
- `friend_added`, `tool_used`

## 7. Safety, privacy and consent (non-negotiable)

- **Youth (13–17):**
  - **Guardian first:** a guardian must confirm by email link and code. Until then there is no recorded match and no public presence.
  - **Default visibility private:** visible only to match participants and guardians. A guardian may allow city-leaderboard visibility, or a full public profile by explicit choice.
  - **Clips:** a clip with a youth in it is visible only to that match's participants and their guardians. Public share or download needs every youth guardian's permission.
  - **Leaderboards:** separate by age group; youth never appear on adult boards. Youth photos appear only where the guardian allowed.
  - **Presence:** never shown for youth.
  - **Social rules:** friendships and "missing one" stay within the same age band.
  - **Live:** youth matches are never live-streamed publicly.
- **No messaging:** no DMs, comments or free-text reviews or testimonials.
- **Consent:** versioned and append-only. Terms and privacy gate the account; recording is an optional, revocable yes/no that gates recorded matches only (C-010); youth need their own and a guardian's yes. Streaming is separate and default-denied before M9. "No live" opt-out.
- **Reporting:** a report button on every clip and profile; admins can hide instantly.
- **Data rights:** export and delete. Deletion removes the profile and tags; clips where the user is the main subject are removed.
- **Security:**
  - row-level security on every table
  - service-role keys only on the server, worker and Edge Functions
  - signed URLs for private media
  - rate limits on OTP, triggers, friend requests and likes
- **Legal:** privacy policy and terms pages are placeholders for a lawyer; Jordan's data-protection law (PDPL) applies.

## 8. Tech stack (decided)

- **Monorepo:** pnpm workspaces and Turborepo, TypeScript strict.
- **`apps/mobile`:**
  - Expo SDK 57 (React Native 0.86), expo-router, NativeWind (Tailwind for React Native), react-native-reanimated
  - expo-linear-gradient, expo-blur, expo-audio (pre-rendered prototype sounds), expo-haptics
  - TanStack Query, i18next with RTL, Expo notifications
  - react-native-vision-camera (recording), expo-camera (QR)
  - react-native-svg charts, react-native-maps (when a key exists)
  - EAS builds; Android first
- **`apps/web`:** Next.js (App Router), Tailwind, the same design tokens. Owner dashboard, admin, guardian approval, public share pages, legal pages.
- **Backend:** Supabase (Postgres, Auth, Realtime, Edge Functions, Storage for avatars and pitch photos, RLS), project `lowqyfbmzeixnadamezx`. Migrations in `supabase/migrations`, pgTAP tests in `supabase/tests/database`.
- **Video:** Cloudflare R2 with presigned uploads; public CDN only for public-eligible media.
- **`services/video-worker`:** Python 3.12, FFmpeg, uv; runs clip, push and card-render jobs.
- **Shared packages:**
  - `packages/shared`: domain logic as pure tested functions, zod schemas, generated DB types
  - `packages/i18n`: ar/en strings
  - `packages/config`: lint and TypeScript config
- **Quality:**
  - ESLint (with the RTL rule), Prettier, Vitest, pgTAP (runs without Docker through `tools/db-test`), pytest, Playwright (web)
  - GitHub Actions; Sentry

## 9. Data model

Detailed in the migrations. Every table has RLS and explicit grants.

| Area          | Tables                                                                                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity      | `profiles`, `profile_private` (DOB), `guardians`, `consents`, `user_settings`, `blocks`, `app_admins`                                                                                               |
| Places        | `countries`, `cities`, `neighborhoods`, facility/field catalog, source records, submissions/reviews, operator claims/verification, `pitch_media`, `pitch_staff`, `pitch_favorites`, `pitch_ratings` |
| Social        | `friendships`, `presence`                                                                                                                                                                           |
| Booking       | `bookings` (tstzrange, exclusion constraint), `booking_players`, `booking_invites`, `missing_one_requests`                                                                                          |
| Tools         | `booking_gear_items`, `booking_costs`, `booking_payments`                                                                                                                                           |
| Match         | `matches`, `checkins`, `match_events`, `recording_devices`, `segments`, `clips`, `clip_tags`, `clip_likes`, `clip_views`                                                                            |
| Post-match    | `votes`, `attribute_ratings`, `endorsements`                                                                                                                                                        |
| Ratings       | `ratings`, `rating_history`, `player_attributes`, `leaderboard_entries`, `neighborhood_standings`                                                                                                   |
| Rewards       | `xp_ledger`, `stars_ledger`                                                                                                                                                                         |
| Notifications | `notifications`, `push_devices`, `notification_settings`                                                                                                                                            |
| Platform      | `jobs`, `config`, `feature_flags`, `events`, `reports`, `audit_log`                                                                                                                                 |

## 10. Milestones

Each milestone ends with a demo, tests, and an update of `docs/PROGRESS.md`.

- **R0 — Foundation:**
  - monorepo, CI, docs, empty database baseline
  - design system in the app (tokens, fonts, icons, sounds, haptics, themes)
  - every prototype screen and sheet rebuilt on typed preview data
  - visual parity checked against the prototype
- **R1 — Accounts:** auth, onboarding, consent, age gate, guardian (app plus web approval), profile basics, settings, export and delete.
- **R2 — Pitches and booking:** prepared Jordan directory (verified and unverified), field details and map, operator outreach/verification, then live availability, booking, invites, join, teams, "missing one", favourites, ratings and owner dashboard.
- **R3 — Friends and match tools.**
- **R4a — Recording spike:** STOP and report.
- **R4b — Match day:** check-in, device, mounting guide, recording UI, upload queue, timeline and score.
- **R5 — Processing and highlights:** worker, feeds, likes and views, tags, share pages, push.
- **R6 — Competition:** voting, attributes, endorsements, Elo, leaderboards, neighbourhood standings, XP, stars, card image, charts.
- **R7 — Safety and admin:** reports, takedowns, bans, anti-collusion, config and flags, audit, data export and deletion.
- **R8 — Pilot readiness:** analytics and KPIs, Sentry, low-end Android performance pass, EAS store builds, production settings, seed pitches, `docs/RUNBOOK.md`.
- **LATER:** M8–M12 (§5). Do not start without explicit instruction.

## 11. Open questions (for the owner)

- **Brand and legal:** final app name and logo (use `APP_NAME` until decided); legal review of terms, privacy and any stars redemption.
- **Accounts and keys:** email sender (custom SMTP, e.g. Resend), Google Maps API key, EAS project, store accounts, R2 bucket, worker hosting.
- **After the R4a spike:** exact clip window and segment length.
