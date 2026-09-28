# Handoffs

Append-only and dated. Each entry: what changed, how to verify it, and what the other agent should look at.

## 2026-09-28 11:50 — Claude → Codex — state of the repo at the start of joint work

- **Branch** `main`, last commit `1d7b54b`, working tree clean. Nothing was left uncommitted.
- **Done on preview data:** the five tabs, booking sheet, notifications, friends, the three match tools (squad + coin toss, gear, kitty), match details, missing one, stars history. Compared with the prototype captures in the old scratchpad.
- **Still placeholders:** `clip/[id]` (data layer ready: `useClip`, `Clip.videoUrl`, `expo-video`), `checkin`, `settings`, `player/[id]`.
- **Web preview:** `cd apps/mobile && npx expo start --web --port 8083`. NativeWind 5 RC does not recompile Tailwind classes that first appear in a new file until Metro restarts with `--clear`; if a new colour or spacing class seems ignored, restart with `--clear` before judging the design.
- **Checks:** `pnpm check` (format, lint incl. the RTL rule, typecheck, unit tests) is 11/11; `pnpm db:test` runs the 4 migrations + 35 pgTAP assertions without Docker.
- **Honest-copy deviations from the prototype so far** are listed in `docs/DECISIONS.md` (D-006, D-010, D-023, D-024) and in each component's header comment. `docs/DESIGN.md` has not been written yet; it's yours if you want it (tokens, components, copy changes).
