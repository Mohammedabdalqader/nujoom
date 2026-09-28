# Task board

Status: `open` · `in progress` · `blocked` · `review` · `done`. Pick the top open task in your column, mark it `in progress`, claim its files, and move it to `review` with the reviewer named when it's ready. Anyone may add tasks; put them in the owner's column or under "Unassigned".

Slice order (agreed from Codex's direction): **S1** identity and consent → **S2** pitches and booking → **S3** invitations and guardian flow → **S4** check-in and match operations → **S5** recording and highlights → **S6** ratings and progression. Proposed placement of work the order doesn't name: friends and the notification inbox in S3, match-tool persistence in S4.

## Claude developer agent

| ID    | Task                                                                                                                                                                              | Status                                          | Output                                                             |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| S0-1  | Coordination folder, contract and migration inventory                                                                                                                             | done (accepted 11:53, changes 12:00)            | `inventory.md`, `contracts/identity-booking.md`, `coordination.md` |
| S1-1  | Identity migration + pgTAP: profiles, profile_private, consents, user_settings, guardians (schema), card codes, visibility helpers, cron schedules                                | done (live on the linked project)               | `c140c7e`, `e92f3e6`                                               |
| S1-2  | Auth config (email code, magic link, Google, redirects) + `tools/tester-code`                                                                                                     | done `c9726eb`                                  |                                                                    |
| S1-3  | Shared logic: `errors`, `journey` (`routeFor`), onboarding zod schema, `email`, `redirect`, `visibility` + tests                                                                  | done                                            | `5b1bfd9` (local)                                                  |
| S1-4  | Data layer: demo and Supabase sources, build variant, production hard-fail without config, source-selection test + bundle guard                                                   | done `ff503ea`, `d10e8b1`                       |                                                                    |
| S1-5  | Supabase client, encrypted session storage (D-025), session provider, sign-out                                                                                                    | done `d10e8b1`, `2c93cc3`                       |                                                                    |
| S1-6  | `complete_onboarding`, `me`, `update_profile`, `set_visibility`, `set_settings`, `player_profile` wiring; config and flags from the database                                      | done `2c93cc3`, `5c3ae10` (e2e on live backend) |                                                                    |
| S1-7  | Avatars: private bucket, Storage RLS, crop and upload                                                                                                                             | open                                            |                                                                    |
| S1-8  | Web app scaffold (Next.js): login, auth callback, terms, privacy                                                                                                                  | open (needs Q6)                                 |                                                                    |
| S1-9  | Data export and account deletion (jobs + Edge Function)                                                                                                                           | open                                            |                                                                    |
| S1-10 | Slice 1 verification: tester run, failure states, screenshots for Codex                                                                                                           | open                                            | `handoffs.md`                                                      |
| S1-11 | Minimal guardian activation (C-011): invite issue + send (Edge Function, sender-acknowledged), web approval page, pending/expired/resend/correct-email states, journey transition | in progress                                     |                                                                    |

## Codex (design and UX lead) — proposed, Codex edits this column

| ID  | Task                                                                                                                                             | Status                           | Output                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | ---------------------------------------------------------------------------- |
| X1  | Review `inventory.md` and the contract; answer Q1–Q6 in `coordination.md`                                                                        | done                             | 11:53 review; Claude accepted 12:00                                          |
| X2  | Specs for slice-1 screens with no prototype reference: welcome/sign-in, code entry, onboarding steps, consent, settings, player profile          | done (reviewed by Claude 12:45)  | `docs/DESIGN.md`                                                             |
| X3  | "Real new account" states for all five tabs and the header: empty, not rated yet, no pitches in city, offline, error                             | done (reviewed by Claude 12:45)  | `docs/DESIGN.md`                                                             |
| X4  | Demo label and "illustrative image" label                                                                                                        | done (reviewed by Claude 12:45)  | `docs/DESIGN.md`                                                             |
| X5  | Review the draft ar/en copy Claude adds for auth, onboarding and error keys                                                                      | done                             | Revised `errors.*` and card-code examples in ar/en locales                   |
| X6  | Fit 13-character card codes in mobile friend/profile surfaces and keep demo add-by-code usable                                                   | review (Claude; visual pending)  | Three mobile UI files; demo fixture handoff pending                          |
| X7  | Build mobile sign-in, code-entry and settings/sign-out UI against Claude's real session contract; test demo separation and Arabic/English states | blocked (session/route contract) | Owner reported the missing flow at 13:56; Claude to confirm route ownership. |

## Unassigned

| ID  | Task | Status |
| --- | ---- | ------ |
