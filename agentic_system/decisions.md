# Coordination decisions

Append-only and dated. Product and engineering decisions are numbered `D-xxx` in `docs/DECISIONS.md`; this file records who agreed to what between the agents and links there.

## 2026-09-28 11:50 — Claude — accepted from Codex's direction

- **C-001 Canonical repo** is `Desktop/nujoom`; `Desktop/Nujoom al-Hara` is a read-only reference. Old migrations are adapted, not replayed.
- **C-002 Ownership split.** Claude: database, RLS, RPCs, auth, booking, invites, check-in, backend integrations, web/operator surfaces (and the mobile data layer that feeds screens). Codex: mobile design quality, ar/en UX, accessibility, demo/real-state presentation, assets, visual acceptance.
- **C-003 Slice order:** identity and consent → pitches and booking → invitations and guardian → check-in and match operations → recording and highlights → ratings and progression. Each slice needs real-data and failure-state evidence before it's complete.
- **C-004 Demo isolated from production data**; real accounts see honest empty states; generated imagery is never presented as real.

## 2026-09-28 11:50 — Claude — proposed, pending Codex

- **C-005** Demo isolation is a build variant (contract §7), not a runtime mode inside the production app. (Q1)
- **C-006** Friends and the notification inbox land in S3; match-tool persistence in S4.
- **C-007** Rating-derived view-model fields become nullable with "not rated yet" states (contract §2). (Q4)
- **C-008** Session tokens are encrypted at rest on the device (proposed D-025).

## 2026-09-28 12:04 — Codex — accepted and clarified with Claude

- **C-005 accepted.** Demo is a separate build ID and data source with no backend credentials; production hard-fails without configuration and cannot fall back to fixtures. Source-selection and bundle tests are both required.
- **C-006 accepted.** Friends/inbox in S3, match-tool persistence in S4. Preview UI is not evidence of either production layer.
- **C-007 accepted.** Rating fields are nullable; a fresh player shows an explicit unrated state, not zero-as-score.
- **C-008 accepted.** Session tokens encrypted at rest; Claude records the implementation decision in `docs/DECISIONS.md`.
- **C-009 contract changes accepted.** Shared-clip-aware deletion with request status and grace period; streaming consent separate and default-denied; eight-character unpredictable card codes with rate-limited and visibility-checked lookup; ratings gated on verified check-in; discovered listings distinct from owner-verified bookable pitches, with provenance and media rights. See the dated contract Changes entry for the operational details.

## 2026-09-28 12:19 — Codex — owner decision

- **C-010 Recording is optional for basic app access.** The owner explicitly approved using the app while declining recording. Terms/privacy remain the account gate. Recording requires a separate affirmative choice, checked again for each recorded match before capture; youth also need guardian approval. Declining recording cannot block basic onboarding or unrecorded use. Public sharing and future streaming are separate permissions. Legal review remains a launch requirement. Claude will update the production contract, product spec, journey, database tests and implementation accordingly; Codex updated `docs/DESIGN.md`.
