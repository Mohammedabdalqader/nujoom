# agentic_system

The shared working room for the two agents on this repo. Created 2026-09-28.

## Roles

| Agent                                   | Owns                                                                                                                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Codex** (design and UX lead)          | Mobile design quality, Arabic/English UX and copy, accessibility, demo vs. real-state presentation, assets, visual acceptance.                                                                 |
| **Claude developer agent** (this agent) | Database, RLS, RPCs, authentication, booking, invites, check-in, backend integrations (Supabase, Edge Functions, worker, push, storage), the mobile data layer, and the web/operator surfaces. |

The product owner decides product questions. Decisions either agent makes are logged in `docs/DECISIONS.md` (product and engineering) and summarised in `decisions.md` here (coordination).

## Rules

1. **Canonical repo:** `C:\Users\moham\Desktop\nujoom`. The old repo `C:\Users\moham\Desktop\Nujoom al-Hara` is a read-only reference. Old migrations are adapted to the new schema, never replayed.
2. **Claim before editing a shared file.** Add a row to `claims.md` (file, agent, task ID, since). Remove it when the change is committed. Don't edit a file someone else has claimed; ask in `coordination.md`.
3. **Append-only and dated.** `coordination.md`, `decisions.md` and `handoffs.md` are only appended to, never rewritten. Every entry starts with `## YYYY-MM-DD HH:MM — <agent> — <subject>`.
4. **Never overwrite uncommitted work.** Check `git status` before editing. If a file has changes you didn't make, leave it and ask.
5. **Small commits**, one concern each. `pnpm check` must pass (11/11) before a commit.
6. **A slice is complete only with evidence:** pgTAP for every table and RPC (including denied paths), a real-data run against the linked Supabase project with a tester account, failure states exercised (offline, denied, conflict, expired), and screenshots for Codex's visual acceptance.
7. **Hard limits win:** spec §7 privacy, the no-messaging rule, "no money moves", the R4a stop-and-report rule, no M8+ work.
8. **Demo is isolated** (see `contracts/identity-booking.md` §7). No sample people, venues, ratings or images ever reach a production account.
9. **No secrets** in this folder or anywhere in git.

## Files

| File                            | What                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `coordination.md`               | The shared thread. Replies, questions and answers, append-only.                                    |
| `claims.md`                     | Who is editing which files right now.                                                              |
| `tasks.md`                      | Task board by agent and slice.                                                                     |
| `decisions.md`                  | Dated coordination decisions (links to `docs/DECISIONS.md` entries).                               |
| `handoffs.md`                   | Dated handoffs: what changed, how to verify, what the other agent should look at.                  |
| `inventory.md`                  | Old repo vs. new repo: what exists, what must be rebuilt, which screens are still on preview data. |
| `contracts/identity-booking.md` | Proposed contract for slices 1–3: schema, RPCs, error codes, view-model mapping, demo isolation.   |
