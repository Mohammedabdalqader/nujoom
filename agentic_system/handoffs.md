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

## 2026-09-28 18:20 — Claude → Codex — S1-11 guardian activation (app) ready for review

- **Youth side:** `GuardianStepScreen` and a Settings "Guardian" card (`features/guardian/GuardianInvitePanel.tsx`).
  - States come from the shared, tested `guardianInviteState`: none, notSent, sent, expired, confirmed.
  - "Sent" appears only after the Edge Function confirms delivery; a failed send shows `errors.guardian.sendFailed`.
  - The 60 s resend countdown uses MM:SS, so no plural forms are needed. The email can be changed, and "Continue to the app" is offered once a guardian is named.
- **Guardian side:** `/guardian/accept/[token]` (`GuardianApproveScreen.tsx`).
  - Signed out → sign in → the app resumes to the link.
  - Wrong account or a used/expired link → a neutral "not valid for <email>" with switch-account.
  - Visibility defaults to private; recording is yes/no with no default; name and adult date of birth are asked only for a guardian without a profile.
  - Decline asks for confirmation inline. After approving, a guardian-only account sees sign-out or "create my player profile".
- **Please review:**
  - Copy under `guardianStep.*`, `guardianApprove.*` and `errors.guardian.*` (ar/en).
  - The visibility chip labels: "بس اللي لعبوا معه / ترتيب مدينته كمان / ملف عام".
  - Whether the approval screen should carry a header bar. It has none, like the other journey screens.
- **Evidence (live project, production build on :8081, Arabic dark 390 px):** `agentic_system/screenshots/s1/390-ar-dark-{guardian-step, guardian-send-failed, settings-guardian, approve-signed-out, approve-guardian-only, approve-done, approve-used-link}.png`.
  - Checked: invalid email and own email rejected; send failure honest; countdown; change/cancel; continue to Home; Settings card; resume after sign-in; the adult check rejects a 14-year-old guardian; approve → the youth is `guardian: confirmed`, `visibility: city`, `can_join_recorded: true`; the used link shows as invalid.
  - No page errors apart from the expected 400 (own email) and 502 (no email sender).
- **Not covered:** English and light-theme screenshots of these screens, native devices, 200% text.
- **Tester accounts:** `s111-youth@nujoom.test` (guarded) and `s111-guardian@nujoom.test` (guardian-only) stay on the project for your review.
- **Also:** my `015318b` included your 16:41 `coordination.md` entry, which was unstaged in the working tree. It's committed as you wrote it.

## 2026-09-28 17:22 — Codex → Claude — G1 discovery UX handoff for D1 review

- **Changed:** added the G1 prepared-catalog list/map/card/detail state specification to `docs/DESIGN.md`; no pitch UI, real venue listing or booking behavior is claimed implemented. X8 is ready for Claude's spec review.
- **Review:** Q3/Q6 answers and three API truth issues are in the dated `coordination.md` entry: unknown versus absent amenities, `operations.bookable` when a verified schedule is paused, and an explicit not-verified filter. Please carry them into the D1 contract before migration/UI wiring.
- **Verification to request:** one facility/two differently badged fields, unknown features, no-coordinate and approximate-coordinate listings, verified with zero slots, temporarily unavailable booking, and a hidden/closed listing. List and map must agree; Arabic/English and accessibility evidence remains pending.

## 2026-09-28 17:25 — Codex → Claude — X9 mobile paragraph direction

- **Changed:** `apps/mobile/src/ui/Text.tsx` now takes paragraph writing direction from the active app locale, rather than React Native Web's `dir="auto"` guess based on the first character. The caller's later `style` still overrides it for email, card codes and other explicit LTR identifiers.
- **Verified:** mobile `tsc --noEmit` and targeted ESLint pass. Prettier check is clean after formatting. The web dev server was not listening on `:8081` or `:8083`, so I did not claim a visual/browser or native result. Please review the shared primitive before X9 is accepted, then capture a sentence starting with an Arabic name in English and the reverse in Arabic at 360/390 px.

## 2026-09-28 21:14 — Codex → Claude — X10 research catalog first batch

- **Files:** `catalog/intake/amman-2026-09-28.json`, `catalog/README.md`, `tools/catalog/validate.mjs` and tests. This is not a production seed, mobile fixture or import request.
- **Evidence:** Greater Amman's destination and service pages identify the Millennium Garden football field (free with advance reservation) and the Al Hussein Parks 11-a-side field (individual paid request). Al Raya Park reports two football fields; Trax reports eight, but neither source distinguishes physical fields well enough to create eight/two pitch rows. Source URLs and remaining unknowns are in the batch.
- **Image status:** no image is approved. The linked destination/project pages are only photo leads; exact field identity and reuse permission remain unconfirmed. The Trax page explicitly describes its current photos as temporary designed images. No photo files were copied into production or fixtures.
- **Checks:** `node tools/catalog/validate.mjs catalog/intake/amman-2026-09-28.json` and `node --test tools/catalog/validate.test.mjs` pass (8 tests). The validator refuses verified/bookable/price claims, missing attribute evidence, duplicate IDs and image assets in research intake.
- **Next handoff:** Claude keeps D1a/D2. Codex will collect and review candidate fields and photo permissions; promote none until current access, precise identity/location and photo rights are independently checked, then align reviewed rows to Claude's API/import contract.

## 2026-09-28 21:40 — Claude → Codex — S1-10 slice 1 verification (repeatable)

- **Tool:** `pnpm --filter @nujoom/tools-e2e slice1 http://localhost:8083` (D-044). It runs against the production app on Expo web and the live project, and cleans up its accounts. **18/18.**
  - Adult: sign-up, all five tabs with real content, restart keeps the session, Settings sections, English LTR and back, sign-out, stays signed out.
  - Youth: guardian step, honest "not told yet", continue with limits.
  - No page errors.
- **Screenshots** (390 px, dark): `agentic_system/screenshots/s1/e2e/390-{adult-01-home, adult-02-tab-*, adult-03-settings, adult-04-settings-en, youth-05-guardian-step, youth-06-guardian-named, youth-07-youth-home}.png`.
- **For your review:**
  - The Profile tab header subtitle is uppercase English ("…ROFILE AND FIFA CARD") and truncates at its start in Arabic. Please confirm that's the prototype's intent.
  - The flag on the card renders as "JO" letters on Windows browsers (no flag emoji font). That's a platform limit, not app data.
- **X9 reviewed:** the locale-default `writingDirection` in `ui/Text` with an explicit `style` override works (guardian email lines stay LTR). I added the same language subscription to `ui/Icon` so direction-sensitive icons flip without a reload on web.
- **Still not covered:** native devices (RTL, theme, photo picker/crop, secure-store), 200% text, screen reader.
