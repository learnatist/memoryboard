# Memoryboard Daily Poster

Auto-posts to George & Ann Fisher's Memoryboard (board 21689) every morning:
D-backs updates, weather *only when dramatic*, plus rolling 7-day queues of
jokes, quotes, "Today is…", and "On this day" — so 7 of each are always queued
for review, and any can be deleted in the app's Upcoming tab before they run.

Runs free on **GitHub Actions** (a daily scheduled workflow). No server.

## Files
- `mb_client.py`  — Supabase auth + post/read for the Memoryboard backend
- `content.py`    — content banks + live D-backs (MLB) and weather (Open-Meteo)
- `daily_run.py`  — the daily job: posts today's data, tops up the 7-day queues
- `.github/workflows/memoryboard.yml` — the scheduler
- `posted_log.json` — created on first run; committed back so the job remembers
  what it already posted (dedup memory across runs)

## One-time setup

1. **Create a GitHub repo** (private is fine) and push these files, keeping the
   folder structure (`.github/workflows/memoryboard.yml` must stay at that path).

2. **Add repository secrets**: repo → Settings → Secrets and variables →
   Actions → *New repository secret*. Add:
   - `MB_ANON_KEY` — the public Supabase anon key (`eyJ…role:anon…`). Safe to store.
   - `MB_REFRESH_TOKEN` — your Memoryboard refresh token (the real secret).
     Get it: app.memoryboard.com → DevTools → Application → Local Storage →
     `app.memoryboard.com` → the `sb-…-auth-token` key → copy the
     `"refresh_token"` value.
   - `MB_ALERT_WEBHOOK` *(optional)* — a Slack/Discord webhook URL to ping on
     failure. Omit if you don't want alerts.

3. **Test it now**: repo → Actions tab → "Memoryboard daily poster" →
   *Run workflow*. Watch the log; the first run queues ~29 posts (7 days ×
   4 categories, plus today's D-backs). Check the app's Upcoming tab.

## Schedule
Already set: **14:05 UTC daily = 7:05 AM Phoenix** (Arizona has no DST).
Change the `cron:` line in the workflow to move it. GitHub's scheduler can lag
5–15 min or, rarely, skip a run — acceptable here. The `workflow_dispatch`
trigger lets you run it by hand any time from the Actions tab.

## How dedup works
Two layers, so it never double-posts:
1. `posted_log.json` — committed back to the repo after each run; the memory of
   every (date, category) already posted.
2. Live-queue check — reads current board posts and skips anything already
   there. This is the backstop if the log is ever empty.

## Content limits (baked in)
Data posts ≤25 chars; jokes/quotes/history ≤35; one fact per post; sentence
case — tuned for readability with PSP. Weather posts appear only on drama days
(snow, storms, wind ≥30mph, rain ≥70%, Phoenix ≥108°F, Minneapolis ≤20°F).

## Editing content
All banks are in `content.py` (JOKES, QUOTES, HISTORY). Add freely; keep
jokes/quotes ≤35 chars. HISTORY is keyed by (month, day).

## If it breaks
Almost always the refresh token expired or rotated. Grab a fresh one (same
path as setup) and update the `MB_REFRESH_TOKEN` secret. Memoryboard is a
third-party app with no official API, so an app update could change the
endpoint; the failure alert (if configured) tells you when.

## Note on text-only posts
`post_text` sends the message as text with an empty image URL. The captured
payload showed the board stores text even when an image exists, so this should
render. If a first-run post doesn't appear on the physical board, the board may
require the rendered PNG — say so and add the image-render/upload step.
