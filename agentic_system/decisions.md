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
