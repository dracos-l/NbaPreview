# NBA Team Preview — Sportradar harness

Boston-only, fixture-first data capture harness. It captures raw responses before creating normalized models or a database.

- Real credentials belong only in `.env.local`; it is ignored.
- `SPORTRADAR_USE_FIXTURES=true` is the safe default and makes no network calls.
- Captures are dry-run unless `--live` is supplied, cannot overwrite without `--force`, pace batch calls 1.5 seconds apart, and record a redacted local counter/log.

```bash
cp .env.example .env.local
# Add SPORTRADAR_API_KEY; set SPORTRADAR_USE_FIXTURES=false for capture only.
npm install
npm run sportradar:capture -- --live --date 2026-08-13 --season 2025
npm run sportradar:inspect
```

All captured raw JSON is written to `data/fixtures/`: team profile, depth chart, seasonal statistics, injuries, transfers, Editorial news, and change log.
