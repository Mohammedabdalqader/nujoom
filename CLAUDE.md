# CLAUDE.md

Street football app (working name "Nujoom al-Hara / نجوم الحارة"). The product spec is the single source of truth:

@docs/PRODUCT_SPEC.md

Design reference: `docs/DESIGN.md` (final, owner decision D-002). Decisions: `docs/DECISIONS.md`. Progress and next steps: `docs/PROGRESS.md`.

## Working rules

1. Start every milestone with a plan: files you will touch and open questions. The owner has delegated decisions (D-001); log them in DECISIONS.md.
2. Work in small, reviewable commits. Never mix unrelated changes.
3. Write tests alongside code. Business logic (ratings, voting eligibility, visibility, booking, XP/stars, squad balancing, cost split) must be pure, tested functions in `packages/shared`.
4. Every new table gets RLS, explicit grants and pgTAP tests in the same change.
5. All user-facing strings go through i18n (Arabic and English). Check RTL for every screen.
6. Privacy rules in spec §7 are hard requirements. If a request conflicts with them, stop and ask.
7. The design is fixed (D-002). Match `docs/DESIGN.md`. Don't redesign; only change copy that would be false (D-010).
8. Prefer boring, well-supported libraries. Log every new dependency in DECISIONS.md.
9. Never put secrets in code or commit `.env` files.
10. Update `docs/PROGRESS.md` at the end of each session. Do not start LATER milestones (M8+) without explicit instruction.

## Conventions

- Arabic is the default locale and layout is RTL. Use logical start/end classes (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) and `marginStart`/`paddingEnd` style keys. A lint rule rejects left/right.
- Colours come from semantic tokens (`bg-surface-container`, `text-on-surface-variant`, …), never raw hex (D-015).
- Currency JOD, timezone `Asia/Amman`, E.164 phones, `timestamptz` everywhere.
- Use the `APP_NAME` constant; do not hard-code the product name.
- The service-role key is only for Edge Functions, the worker and admin scripts. Never in the app.

## Layout

| Path                          | What                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/mobile`                 | Expo app: `app/` routes, `src/features/<feature>` (components, hooks, api), `src/ui` primitives, `src/design` tokens/icons/sounds, `src/preview` typed preview data |
| `packages/shared`             | pure domain logic, zod schemas, generated DB types                                                                                                                  |
| `packages/i18n`               | `src/locales/{ar,en}.json`                                                                                                                                          |
| `packages/config`             | ESLint (with the RTL rule) and TS config                                                                                                                            |
| `supabase`                    | `migrations/`, `tests/database/` (pgTAP), `functions/`, `config.toml`                                                                                               |
| `tools/db-test`               | runs migrations + pgTAP on embedded Postgres (no Docker)                                                                                                            |
| `tools/icons`, `tools/sounds` | regenerate the icon fonts and sound files                                                                                                                           |

## Commands

| Task                       | Command                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Install                    | `pnpm install`                                                                         |
| Mobile dev (Expo)          | `pnpm --filter @nujoom/mobile dev` (web preview: press `w`)                            |
| Everything CI runs for JS  | `pnpm check` (format + lint + typecheck + unit tests)                                  |
| Unit tests                 | `pnpm test` (one package: `pnpm --filter @nujoom/shared test`)                         |
| SQL tests (no Docker)      | `pnpm db:test`                                                                         |
| Push migrations            | `pnpm db:push` (project `lowqyfbmzeixnadamezx`)                                        |
| DB types after a migration | `pnpm db:types` → `packages/shared/src/db.types.ts`                                    |
| Regenerate icons / sounds  | `pnpm --filter @nujoom/tools-icons build` · `pnpm --filter @nujoom/tools-sounds build` |

Notes:

- New migration → pgTAP tests in `supabase/tests/database/`, explicit grants, end with `revoke execute on all functions in schema private from public`, then `pnpm db:types`.
- New user-facing string → add to both `ar.json` and `en.json` (tests enforce parity and the six Arabic plural forms).
- Mobile native packages: `npx expo install <pkg>` from `apps/mobile`.
