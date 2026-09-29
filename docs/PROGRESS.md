# Progress

Current delivery status and next-work order: [`PRODUCTION_ROADMAP.md`](PRODUCTION_ROADMAP.md). The entries below are historical snapshots and may describe work that has since shipped or changed scope; use the roadmap and `agentic_system/tasks.md` for current status.

Newest first. The day-to-day thread between the two agents is in `agentic_system/` (`coordination.md`, `tasks.md`, `handoffs.md`). This file is the owner's summary.

## 2026-09-28 (afternoon) — Slice 1 (identity and consent) in progress

### How to run it

- **Phone (Expo Go) or web:** `cd apps/mobile` then `npx expo start --clear`. This runs the **demo build**: labelled sample players, pitches and images, no backend. An amber "نسخة تجريبية" strip on every screen says so.
  - `--clear` is needed after pulling changes: Metro caches builds without noticing environment changes (D-027).
- **Against the real Supabase project:** create `apps/mobile/.env.development.local` (template in `.env.example`) with `EXPO_PUBLIC_APP_VARIANT=production` and the anon key, then `npx expo start --clear`. Until the sign-in screens land, a production build has no login and shows empty states.
- **Tester sign-in codes** (no email needed): `pnpm tester-code <name>@nujoom.test`.
- **Checks:** `pnpm check` (format, lint, types, unit tests); `pnpm db:test` (SQL tests, no Docker); `pnpm --filter @nujoom/tools-tester-code smoke` (live identity smoke test on the real project, throwaway accounts); `pnpm --filter @nujoom/mobile check:bundle` (no demo data in production bundles).

### Done

- **Working with Codex** (design/UX lead) through `agentic_system/`: inventory of the old repo, the identity/booking contract, decisions C-001…C-013. Codex is paused; Claude continues alone and documents here.
- **S1-1 identity database (live on the project):**
  - profiles, private DOB, settings, guardians (schema) and append-only consents
  - writes only through RPCs; long random card codes; youth private until a guardian decides
  - recording is an optional consent that gates only recorded matches (owner decision C-010)
  - 111 SQL assertions pass
- **S1-2 auth tooling:** tester-code tool; a live smoke test with 23/23 checks passing on the real project; Google provider block (off); `docs/SETUP_AUTH.md`, the owner's checklist for email sending and Google.
- **S1-3 shared logic:** sign-in journey stages, onboarding rules, error messages (ar/en), card codes, safe redirects.
- **S1-4 data layer:**
  - demo and production builds, separate app ids, and a production build that refuses to start without real settings
  - a bundle guard proving production contains no demo data
  - the Demo strip
- **Fixes after the owner's phone test:**
  - Expo Go's Arabic right-to-left layout (`extra.supportsRTL`, D-028)
  - the dark/light switch on native (D-029)
  - both still need a check on the phone

### Update (evening): sign-in and a real production app

- **The production app now works end to end on the live project:** sign-in with an email code, onboarding (profile, then consent with optional recording), then the same five tabs as the demo with honest empty states and "not rated yet" values.
  - Settings: language, theme, sounds, visibility, presence, recording permission, legal pages, sign-out.
  - Verified with a tester account; there is never a black screen (D-031).
- **Try it:** keep your `.env.development.local` (production), run `npx expo start --clear`, then `pnpm tester-code you@nujoom.test` and use "معي رمز من قبل" in the app.
- The session is stored in the phone's keystore (D-030).

### Update (night): under-18 accounts and guardian approval (S1-11)

- **A player under 18** names a guardian's email after onboarding. The app emails them an approval link, with resend after a minute and a way to correct the email; Settings shows the status. Until a guardian approves, the youth can use the app but can't join recorded matches, and the profile stays hidden.
- **The guardian** opens the link, signs in with that email, chooses who can see the youth's profile and whether recording is allowed, and approves or declines. A parent who doesn't play gives only a name and date of birth (D-033).
- **Emails don't go out yet:** without your email sender (Resend, `docs/SETUP_AUTH.md`), the app honestly says it couldn't send. For testing, `pnpm --filter @nujoom/tools-tester-code guardian-link <youth>@nujoom.test` prints a working approval link.
- Verified on the live project: `smoke:guardian` 11/11, plus both screens in the production app (`agentic_system/screenshots/s1/`).

### Web app started (S1-8)

- `apps/web` (Next.js) has the front page, the terms and privacy pages, and sign-in with an email code, in Arabic (right-to-left) and English, in the app's dark look (D-035, D-036), plus the guardian approval page (D-037). Once the site is hosted, the approval email can point at it (set `APPROVAL_URL`).
- **Run it:** copy `apps/web/.env.example` to `apps/web/.env.local`, fill in the project URL and anon key (the same values as the app's), then `pnpm --filter @nujoom/web dev` and open http://localhost:3000.
- **After pulling this change:** run `pnpm install`, then restart Expo with `npx expo start --clear`. The mobile colours moved into a shared package, and a Metro that was already running can't find it until it restarts.

### Data rights started (S1-9)

- The database side of "download my data" and "delete my account" is live (D-038). Deleting has a 7-day window to change your mind, and the export covers everything we hold about the user; a test fails if a future table is left out. The download itself now works too: a private file behind a 7-day link (D-039; `smoke:export` 14/14 on the live project). Deletion now runs on its own every hour once the 7 days are up, removing the account, the photo and any export file (D-040; `smoke:deletion` 13/13 live). Settings in the app now has "Download my data" and "Delete my account" (with the 7 days to cancel) (D-041), and the hourly deletion ran on its own on the live project. The website has the same on its account page, which also serves as the public account-deletion link Google Play asks for (D-042).

### Slice 1 checked end to end (S1-10)

- A repeatable run (`tools/e2e`, D-044) signs up an adult and an under-18 player on the production app, visits every tab and Settings, switches to English and back, signs out, and cleans up after itself: 18/18 on the live project. Slice 1 is complete apart from what waits on you: email sending (Resend), Google sign-in, and hosting for the website.

### Profile photos (S1-7)

- Settings → "Your photo" lets a player choose, change or remove their photo. It is cropped square, shrunk on the phone and stored privately, and who can see it follows their privacy setting (D-043). Checked on the web preview; the phone's own photo picker still needs a device check.

### Pitch directory: database started (D1a)

- The pitch list now has its tables and search on the live project (D-045), with no pitches published yet. It searches Arabic names ("ريم" finds "الرّيم"), sizes, surfaces, near-me and a map area, and gives each field its own "verified / not verified" badge. Only verified fields with an active schedule could ever be booked. The review-and-verify journey now works end to end in the database: an admin publishes a listing, a venue owner claims it, the admin verifies their authority, the owner sets prices and a schedule privately, and only then can the admin grant the badge that makes the field bookable. Pausing keeps the badge without bookings; ending the partnership removes it at once (D-046). The app can now fetch the pitch list and pitch details (D-047), and Codex has what it needs to build the pitch screens. The demo build shows five clearly fictitious sample venues, one for each state. Players can now report a missing pitch, a closure, wrong details or a wrong location (structured, no free text, 5 a day), and admins keep records of contacting pitch owners; an owner who opts out has their contacts deleted and loses verification at once (D-048). Pitch photos now need a recorded right to use them and an admin's approval before anyone sees them; they're stored privately and shown through short-lived links with any required photo credit (D-049). A daily job now removes the "verified" badge from fields that have been paused too long or whose owner hasn't reconfirmed the details in months, after a warning period (D-050; the 30/90/14-day numbers are proposals for you to confirm). The database can now take in reviewed pitch records: they arrive as hidden candidates that an admin must still publish, re-imports never duplicate or overwrite them, and anything unreviewed or claiming to be verified is refused (D-051; format for Codex in `agentic_system/contracts/catalog-import.md`). The import command works too (`pnpm --filter @nujoom/tools-catalog-import load <file> --dry-run` first), tested live (D-052). The pitch list now only needs reviewed records: someone has to confirm each field's current public access and entrance location before it can be imported, and an admin publishes it afterwards. The database now also gives admins everything they need to see (queues, venue details with sources and history) for the upcoming web admin screens (D-053). The website now has those admin screens, read-only for now: an overview of what waits, the venue list and each venue's full details with sources (D-054). Admins can now publish, hide, close or reject venues and fields, decide ownership claims and act on player reports from those screens (D-055); They can also verify an owner's authority, grant or remove the "verified" badge (only possible once the owner's schedule is switched on), approve photos with a preview, and keep a log of owner contacts (D-056). The whole review-and-verify journey now works from the website. To use it, make your own account an admin: sign in once on the website or app, then run `pnpm --filter @nujoom/tools-admin grant <your email>` (D-057), and open `/ar/admin`. Venue owners now have their own page on the website (`/ar/venue`, "For venue owners" in the footer). They find their venue and claim it; someone who only uses the website first gives a name and an adult date of birth (D-059). Once the claim is approved, they set the price, booking length and price note and switch the schedule on (D-060). Claiming or switching on never makes a field verified; that stays the admin's decision. Checked live end to end (19/19, test accounts removed). Owners can also add photos of their venue there; each one waits for an admin's approval before players see it, and the owner can follow its status (D-061, D-062). They also set their weekly opening hours there, including a break such as Friday prayers; a schedule can only be switched on once it has hours (D-063, D-064).

### Pitch directory plan (D1, proposed)

- The data contract for the prepared Jordan pitch catalog is in `agentic_system/contracts/pitch-catalog.md`.
  - Each field has its own "Verified by Nujoom / Not verified" badge.
  - Unknown details stay unknown.
  - Only verified fields with a live schedule can be booked, and the database enforces it.
- **Four questions for you (defaults apply until you answer):**
  1. Do school or members-only fields count as "available"? Default: not listed.
  2. Can people search the catalog on the website without signing in? Default: signed-in only.
  3. If a pitch owner says "don't contact us again", should their public field stay listed as not verified? Default: yes, without their contact details.
  4. Will there be a field team beyond admins? Default: admins only.

### Known issues and gaps

- **Guardian emails still link into the app.** The web approval page works locally (D-037), but it needs hosting (a domain, or a temporary Vercel address) before the Edge Function's `APPROVAL_URL` can point at it.
- **Emails can't reach real users** until the owner sets up Resend (see `docs/SETUP_AUTH.md`); development uses tester codes.
- **GitHub:** every change is pushed (C-014).
- **RTL and theme on native** are unverified: there is no Android device or emulator on this machine. A development build (`eas build --profile development`) is the proper test; Expo Go has RTL limits.
- `docs/DESIGN.md` has uncommitted edits by Codex that fail the format check; they're left for Codex.

### Next

1. Owner access for pitch staff (more than one person per venue) and the QR poster, then booking once there is verified inventory.
2. Import reviewed pitch records once Codex's intake has confirmed access and locations; an admin then publishes them.
3. Slice 2 booking, once there is verified inventory to book.

## 2026-09-28 (morning) — v2 rebuild started (R0 Foundation)

- The owner made the design prototype the final design and asked for a clean rebuild with a fresh database. The old database was backed up as JSON (566 rows) to `%USERPROFILE%\nujoom-backups\old-db-2026-09-28` and reset (`supabase db reset --linked`).
- Foundation migrations (platform, places, settings) with pgTAP; the mobile design system (NativeWind tokens, fonts, icons, sounds, themes).
- All five tabs and every sheet ported from the prototype on typed data: Home, Pitches + booking, Match, Leaders, Me, notifications, friends, the three match tools, match details, missing one, stars history. Honest-copy deviations are listed in D-006, D-010, D-023 and D-024.
