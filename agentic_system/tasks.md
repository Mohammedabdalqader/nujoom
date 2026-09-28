# Task board

Status: `open` · `in progress` · `blocked` · `review` · `done`. Pick the top open task in your column, mark it `in progress`, claim its files, and move it to `review` with the reviewer named when it's ready. Anyone may add tasks; put them in the owner's column or under "Unassigned".

Slice order (agreed from Codex's direction): **S1** identity and consent → **S2** pitches and booking → **S3** invitations and guardian flow → **S4** check-in and match operations → **S5** recording and highlights → **S6** ratings and progression. Proposed placement of work the order doesn't name: friends and the notification inbox in S3, match-tool persistence in S4.

## Claude developer agent

| ID    | Task                                                                                                                                               | Status          | Output                                                             |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------ |
| S0-1  | Coordination folder, contract and migration inventory                                                                                              | review (Codex)  | `inventory.md`, `contracts/identity-booking.md`, `coordination.md` |
| S1-1  | Identity migration + pgTAP: profiles, profile_private, consents, user_settings, guardians (schema), card codes, visibility helpers, cron schedules | open            | `supabase/migrations/…0500_identity.sql`                           |
| S1-2  | Auth config (email code, magic link, Google, redirects) + `tools/tester-code`                                                                      | open            |                                                                    |
| S1-3  | Shared logic: `errors`, `journey` (`routeFor`), onboarding zod schema, `email`, `redirect`, `visibility` + tests                                   | open            |                                                                    |
| S1-4  | Data layer: demo and Supabase sources, build variant, bundle guard test (no fixtures in production)                                                | open (needs Q1) |                                                                    |
| S1-5  | Supabase client, encrypted session storage (D-025), session provider, sign-out                                                                     | open            |                                                                    |
| S1-6  | `complete_onboarding`, `me`, `update_profile`, `set_visibility`, `set_settings`, `player_profile` wiring; config and flags from the database       | open            |                                                                    |
| S1-7  | Avatars: private bucket, Storage RLS, crop and upload                                                                                              | open            |                                                                    |
| S1-8  | Web app scaffold (Next.js): login, auth callback, terms, privacy                                                                                   | open (needs Q6) |                                                                    |
| S1-9  | Data export and account deletion (jobs + Edge Function)                                                                                            | open            |                                                                    |
| S1-10 | Slice 1 verification: tester run, failure states, screenshots for Codex                                                                            | open            | `handoffs.md`                                                      |

## Codex (design and UX lead) — proposed, Codex edits this column

| ID  | Task                                                                                                                                    | Status | Output |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| X1  | Review `inventory.md` and the contract; answer Q1–Q6 in `coordination.md`                                                               | open   |        |
| X2  | Specs for slice-1 screens with no prototype reference: welcome/sign-in, code entry, onboarding steps, consent, settings, player profile | open   |        |
| X3  | "Real new account" states for all five tabs and the header: empty, not rated yet, no pitches in city, offline, error                    | open   |        |
| X4  | Demo label and "illustrative image" label                                                                                               | open   |        |
| X5  | Review the draft ar/en copy Claude adds for auth, onboarding and error keys                                                             | open   |        |

## Unassigned

| ID  | Task | Status |
| --- | ---- | ------ |
