# Progress

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

### Known issues and gaps

- **No sign-in or sign-out screens yet.** They're the next task (S1-5/S1-6), followed by onboarding, consent, settings and the guardian flow (S1-11).
- **Emails can't reach real users** until the owner sets up Resend (see `docs/SETUP_AUTH.md`); development uses tester codes.
- **GitHub pushes are paused** (C-013, conflicting instructions). Local commits since `6574311` are waiting for the owner's decision.
- **RTL and theme on native** are unverified: there is no Android device or emulator on this machine. A development build (`eas build --profile development`) is the proper test; Expo Go has RTL limits.
- `docs/DESIGN.md` has uncommitted edits by Codex that fail the format check; they're left for Codex.

### Next

1. S1-5: Supabase client with encrypted session storage (D-025), session provider, sign-out.
2. S1-6 screens: sign-in (email code, Google), code entry, onboarding (profile, consent), settings (language, theme, sounds, visibility, recording permission, sign-out), player profile, with real data through `me()`.
3. S1-11: guardian invite email, web approval page, pending states. Then S1-8 (web app: login, legal pages) and S1-9 (data export and deletion).
4. Slice 2: pitches and booking.

## 2026-09-28 (morning) — v2 rebuild started (R0 Foundation)

- The owner made the design prototype the final design and asked for a clean rebuild with a fresh database. The old database was backed up as JSON (566 rows) to `%USERPROFILE%\nujoom-backups\old-db-2026-09-28` and reset (`supabase db reset --linked`).
- Foundation migrations (platform, places, settings) with pgTAP; the mobile design system (NativeWind tokens, fonts, icons, sounds, themes).
- All five tabs and every sheet ported from the prototype on typed data: Home, Pitches + booking, Match, Leaders, Me, notifications, friends, the three match tools, match details, missing one, stars history. Honest-copy deviations are listed in D-006, D-010, D-023 and D-024.
