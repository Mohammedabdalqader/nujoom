# Progress

## 2026-09-28 — v2 rebuild started (R0 Foundation)

The owner made the design prototype the final design and asked for a clean production rebuild with a fresh database.

### Done

- **Repository:**
  - New repo; the prototype is kept only in git history (commit `9f9017d`).
  - Workspace, lint, format and TypeScript config copied from the first repo.
- **Spec v2:** `docs/PRODUCT_SPEC.md`, with the owner's decisions (D-006).
- **Old Supabase data:** backed up as JSON to `%USERPROFILE%\nujoom-backups\old-db-2026-09-28` (566 rows) before the wipe.
- **Wipe (partial):** `avatars` bucket deleted; the `guardian-invite` Edge Function and its custom secrets deleted.

- **Wipe finished by the owner** (`supabase db reset --linked` from the new repo). Checked afterwards:
  - no auth users, buckets or cron jobs left
  - only the four R0 migrations applied (9 tables)

### Done since (same day)

- **Database foundation:**
  - Migrations for extensions and helpers, platform tables, places and typed settings.
  - pgTAP runs without Docker (`pnpm db:test`, 35 assertions green).
- **Mobile design system:**
  - NativeWind 5 RC with theme tokens that switch at runtime (D-020); fonts, the Material Symbols subset, and the prototype's five sounds rendered sample-exact.
  - Frosted header and bottom bar.
- **Home tab:** ported and checked against the prototype's screenshots. It runs on typed preview data.
- `pnpm check` is green.

### Next

1. Port the Pitches, Match, Leaders and Me tabs, then the dialogs: notifications, friends, match details, missing one, clip player, booking, QR, the three tools, wallet history.
2. Screens the prototype lacks, in the same style: sign-in, onboarding, consent, guardian, settings.
3. R1 onwards: identity schema and RPCs, then swap preview queries for Supabase feature by feature.
