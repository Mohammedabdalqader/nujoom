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

### Blocked: needs the owner

The rest of the wipe was blocked by the local permission check (mass delete of cloud data):
- 3 pg_cron jobs
- 10 auth users
- the old `public`/`private` schemas and migration history

See "Finishing the database wipe" in the handover message, or allow the action. New migrations can't be pushed until it is done.
