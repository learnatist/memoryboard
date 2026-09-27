# Memoryboard daily poster

Automated daily content for George & Ann Fisher's Memoryboard (board 21689):
date, a joke, a quote, an "on this day" fact, a Diamondbacks line, a Seahawks
line (game days), and weather (only when dramatic). One post per category per
day; it works around posts the family makes by hand.

## Current implementation (v2 — LIVE)

TypeScript sidecar running inside the **Performatist** app on Replit. Source of
truth is that Replit project; this folder is the version-controlled copy.

- `server/memoryboard/client.ts` — Supabase auth + post/read; computes the
  board's required text size (sending 0 renders text screen-fillingly huge).
- `server/memoryboard/content.ts` — content banks + generators. ~100 jokes,
  ~62 verified quotes, both selected with a 45-day no-repeat window so nothing
  recycles on a fixed cycle. "On this day" pulls Wikipedia's curated *selected*
  feed (tone-filtered to skip war/disaster items) with a verified fallback bank.
  Live D-backs (MLB) and Seahawks (ESPN); weather via Open-Meteo.
- `server/memoryboard/dailyRun.ts` — one daily pass (~1:05am Pacific). Posts
  only that day; dedups one-per-category-per-day and avoids recent jokes/quotes.
- `server/memoryboard/route.ts` — Express handler at `/tasks/memoryboard`,
  guarded by `?key=<TASK_SECRET>`. Returns 200 with a JSON summary, or 500 on
  failure so an external monitor can alert.

### Trigger & monitor
cron-job.org GETs `https://www.performatist.com/tasks/memoryboard?key=<TASK_SECRET>`
daily at 1:05am Pacific, with "notify on failure" enabled.

### Secrets (set in Replit, not here)
`MB_ANON_KEY`, `MB_EMAIL`, `MB_PASSWORD`, `TASK_SECRET`, and `MB_TIMEZONE`
(`America/Los_Angeles`; switch to `America/Phoenix` when the family moves).

## Deprecated implementation (v1 — RETIRED)

The root-level Python files (`mb_client.py`, `content.py`, `daily_run.py`,
`requirements.txt`, `posted_log.json`) and `.github/workflows/memoryboard.yml`
were the original GitHub Actions version. **That workflow is disabled and no
longer runs.** The files are kept only for history and can be deleted.
