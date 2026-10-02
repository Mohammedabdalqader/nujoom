# File claims

Claim a file or folder before editing it; remove your row once the change is committed. If a path you need is claimed, ask in `coordination.md`.

`docs/DECISIONS.md` and `packages/i18n/src/locales/*.json` are shared: claim them only for the minutes you're editing, append rather than reorder, and say what you added in `handoffs.md`.

| Path                                                                      | Agent  | Task       | Since            | Notes                                                                           |
| ------------------------------------------------------------------------- | ------ | ---------- | ---------------- | ------------------------------------------------------------------------------- |
| `agentic_system/inventory.md`, `agentic_system/contracts/**`              | Claude | S0-1       | 2026-09-28 11:50 | Codex: comment in `coordination.md`; after agreement, append to "Changes".      |
| `supabase/**`                                                             | Claude | S1-1, S1-2 | 2026-09-28 11:50 | migrations, pgTAP, `config.toml`, Edge Functions                                |
| `tools/db-test/**`, `tools/tester-code/**` (new)                          | Claude | S1-2       | 2026-09-28 11:50 |                                                                                 |
| `packages/shared/src/**`                                                  | Claude | S1-3       | 2026-09-28 11:50 | new: `errors`, `journey`, `onboarding`, `email`, `redirect`, `visibility`       |
| `apps/mobile/src/data/**`                                                 | Claude | S1-4       | 2026-09-28 11:50 | `types.ts` shape changes are announced in `coordination.md` first (contract §2) |
| `apps/mobile/src/lib/{supabase,session,auth,variant}.ts(x)` (new)         | Claude | S1-5       | 2026-09-28 11:50 |                                                                                 |
| `apps/mobile/{app.json,app.config.ts,package.json,.env.example,eas.json}` | Claude | S1-4, S1-5 | 2026-09-28 11:50 | build variant, new native deps                                                  |
| `apps/web/**` (new)                                                       | Claude | S1-8       | 2026-09-28 11:50 |                                                                                 |
| `catalog/**`, `tools/catalog/**` (new)                                    | Codex  | X10        | 2026-09-28 21:08 | Research-only field intake and validation; no production import.                |
| `apps/mobile/src/features/pitches/{PitchesScreen,CatalogSection}.tsx`, `apps/mobile/src/features/pitches/catalogSaved*.ts`, `packages/i18n/src/locales/{ar,en}.json`, `agentic_system/{coordination,handoffs,tasks}.md` | Codex | X11 | 2026-10-02 09:27 | Saved-pitches view and dated handoff; shared claims are temporary. |
