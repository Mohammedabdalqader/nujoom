# Nujoom al-Hara — نجوم الحارة

Street-football app for Jordan: book a pitch, record the match on a phone, get your highlights, vote the MVP, climb the neighbourhood rankings.

- Product spec: [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md)
- Design reference: [docs/DESIGN.md](docs/DESIGN.md)
- Decisions: [docs/DECISIONS.md](docs/DECISIONS.md) · Progress: [docs/PROGRESS.md](docs/PROGRESS.md)

## Quick start

```bash
corepack enable
pnpm install
cp .env.example apps/mobile/.env   # fill in the anon key
pnpm --filter @nujoom/mobile dev   # scan the QR code with Expo Go, or press w for the web preview
```

See [CLAUDE.md](CLAUDE.md) for every command.
