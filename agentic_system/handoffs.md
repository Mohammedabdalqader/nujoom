# Handoffs

Append-only and dated. Each entry: what changed, how to verify it, and what the other agent should look at.

## 2026-09-28 11:50 — Claude → Codex — state of the repo at the start of joint work

- **Branch** `main`, last commit `1d7b54b`, working tree clean. Nothing was left uncommitted.
- **Done on preview data:** the five tabs, booking sheet, notifications, friends, the three match tools (squad + coin toss, gear, kitty), match details, missing one, stars history. Compared with the prototype captures in the old scratchpad.
- **Still placeholders:** `clip/[id]` (data layer ready: `useClip`, `Clip.videoUrl`, `expo-video`), `checkin`, `settings`, `player/[id]`.
- **Web preview:** `cd apps/mobile && npx expo start --web --port 8083`. NativeWind 5 RC does not recompile Tailwind classes that first appear in a new file until Metro restarts with `--clear`; if a new colour or spacing class seems ignored, restart with `--clear` before judging the design.
- **Checks:** `pnpm check` (format, lint incl. the RTL rule, typecheck, unit tests) is 11/11; `pnpm db:test` runs the 4 migrations + 35 pgTAP assertions without Docker.
- **Honest-copy deviations from the prototype so far** are listed in `docs/DECISIONS.md` (D-006, D-010, D-023, D-024) and in each component's header comment. `docs/DESIGN.md` has not been written yet; it's yours if you want it (tokens, components, copy changes).

## 2026-09-28 12:52 — Claude → Codex — S1-3 shared logic (local commit `5b1bfd9`, not pushed)

- **What:** `packages/shared` gains `journey` (stages auth → onboarding → consent → guardian → app; recording is never a stage), `onboarding` (profile-step rules, consent step gated on terms + privacy, the consent payload), `errors` (exact code → `errors.*` key), card codes v2 (`NJM-XXXX-XXXX`), `email`, `redirect`, `visibility`. 75 shared tests pass; lint, typecheck and all unit tests pass (11/11).
- **New strings for your copy pass**, under `errors.*` in both locales. Draft copy; please rewrite freely, but keep them actionable and never hint whether an account exists:
  - `errors.generic`, `errors.network`, `errors.rateLimited`
  - `errors.auth.{signedOut, codeInvalid, emailInvalid, emailUnavailable, tooManyCodes, unavailable}`
  - `errors.onboarding.{notOnboarded, alreadyOnboarded, belowMinAge, dob}`
  - `errors.profile.{name, handle, handleTaken, city, neighborhood, position, shirtNumber, avatar, invalid, guardianControls, youthPresence}`
  - `errors.consent.{required, outdated, invalid, streaming}`
  - `errors.guardian.tooMany`
- **Card-code format affects your screens.** Real codes are now 13 characters (`NJM-7K3Q-M9XR`), not 8. Three things need your call:
  - Check the FIFA card's code line and the friends rows for fit.
  - The friends copy still shows the old example (`friends.codePlaceholder` "NJM-8702", `friends.badCode`).
  - The demo fixtures keep the short numbers as visual values (your C-009 note). Add-by-code therefore only works in demo for codes typed in the new format; fine unless you want demo lookups too.
- **Please format `docs/DESIGN.md`** (`npx prettier --write docs/DESIGN.md`). It fails `pnpm check` for everyone right now; I haven't touched it.

## 2026-09-28 15:15 — Claude → Codex — S1-10 evidence: production app lifecycle (live backend)

Run with Playwright against the production build (`EXPO_PUBLIC_APP_VARIANT=production`, the owner's dev server on :8081), tester account `ui-e2e@nujoom.test`. No page errors in either run.

| Check                                                                                  | Result                                                                      |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Signed-out launch opens sign-in (never tabs, never `previewMe`)                        | pass                                                                        |
| Code sign-in ("I already have a code") → onboarding                                    | pass                                                                        |
| Onboarding profile + consent (recording yes) → Home                                    | pass                                                                        |
| All five tabs on a new account: honest empty states, "not rated yet", no zero-as-score | pass (after `5c3ae10`: empty chart, no-bookable-pitches text, input labels) |
| Restart (full reload) keeps the session and lands on Home                              | pass                                                                        |
| Backend unreachable → retry screen (no black screen, no fixtures)                      | pass                                                                        |
| Back online → retry restores the app                                                   | pass                                                                        |
| Settings shows the signed-in email; sign-out → sign-in                                 | pass                                                                        |
| Reload after sign-out stays signed out                                                 | pass                                                                        |
| English on the sign-in screen → `dir="ltr"`, English copy                              | pass                                                                        |

Not covered yet: on-device checks (no Android device or emulator here; RTL and theme on Expo Go are waiting for the owner, D-028/D-029), 200% text, screen-reader focus order, youth guardian path (S1-11). Screenshots are in the Claude session scratchpad (`e2e/`, `e2e2/`); I'll put the final S1 set in `agentic_system/screenshots/s1/` with the S1-11 handoff.

## 2026-09-28 16:41 — Codex → Claude — D-032 prepared catalog and verification rule

- **Changed:** appended D-032 in `docs/DECISIONS.md` and aligned the product spec, design acceptance and production roadmap. The owner's clarification is explicit: collect a broad, reviewed real-pitch list with known field designs; app search uses only this prepared catalog; both public badge states are searchable; only fields whose operators joined and whose schedules are active get Verified by Nujoom and in-app booking/match actions.
- **Please review:** propose a facility-versus-field schema, nullable/provenanced design attributes, a published-catalog search API returning both statuses, operator-outreach/claim evidence, per-field badge transition and negative RLS/booking tests. Keep unverified fields informational. No production venue import or map is claimed as done by this handoff.
- **Evidence to request for D1:** a single venue with two physical fields (one verified/bookable, one not), a field with unknown size/surface, an inaccessible school field held out of public search, an unverified search result denied by the booking RPC, and idempotent source re-import without duplicate public listings.
