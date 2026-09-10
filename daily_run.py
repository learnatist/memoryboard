"""
Daily Memoryboard job. Run once per morning (Replit Scheduled Deployment,
~7:05 AM Phoenix). It:

  1. Refreshes the access token.
  2. Reads what's already queued (get_active_messages) so it never double-posts.
  3. DATA posts for TODAY: D-backs result + next game, weather drama (0-2).
  4. QUEUE top-up: for each of jokes / quotes / date / history, ensure the
     next 7 days are filled, adding only what's missing. This is the
     "always keep 7 queued for my sister to review" behavior.

Idempotent: safe to run twice a day. Uses a local marker of what it has
posted (posted_log.json) AND cross-checks the live queue by text+date.

Env secrets (Replit): MB_ANON_KEY, MB_REFRESH_TOKEN
Optional: MB_ALERT_WEBHOOK (a URL to POST a short failure message to).
"""

import os
import sys
import json
import traceback
import datetime as dt

import mb_client as mb
import content

QUEUE_DAYS = 7
LOG_PATH = os.path.join(os.path.dirname(__file__), "posted_log.json")


def phoenix_today():
    # Phoenix is UTC-7 year round (no DST).
    return (dt.datetime.utcnow() - dt.timedelta(hours=7)).date()


def load_log():
    try:
        with open(LOG_PATH) as f:
            return json.load(f)
    except Exception:
        return {}   # { "YYYY-MM-DD|category": "text", ... }


def save_log(log):
    try:
        with open(LOG_PATH, "w") as f:
            json.dump(log, f, indent=1)
    except Exception:
        pass


def already_live(active, text, date_str):
    """True if a post with this text+start date is already on the board.

    Matches on text+date, and also on text alone when the API row carries no
    start date (some rows omit it). The committed posted_log.json is the
    primary dedup; this is the backstop when the log is empty (e.g. a fresh
    CI container before the log is restored).
    """
    if not isinstance(active, list):
        return False
    t = text.strip()
    for m in active:
        mt = (m.get("message_text") or m.get("text") or "").strip()
        sd = (m.get("start_date") or "")[:10]
        if mt == t and (sd == date_str or sd == ""):
            return True
    return False


def post_once(token, log, active, category, text, date, results):
    """Post one item unless it's already logged or already live."""
    date_str = date.isoformat()
    key = f"{date_str}|{category}"
    if log.get(key):
        return
    if already_live(active, text, date_str):
        log[key] = text
        return
    try:
        mb.post_text(token, text, date)
        log[key] = text
        results.append(("ok", category, date_str, text))
    except Exception as e:
        results.append(("fail", category, date_str, f"{text} :: {e}"))


def run():
    token, new_refresh = mb.get_access_token()
    if new_refresh and new_refresh != mb.REFRESH_TOKEN:
        # Supabase rotated the refresh token. Surface it so it can be updated
        # in Replit Secrets; the current token still works for this run.
        print("NOTE: refresh token rotated. Update MB_REFRESH_TOKEN to:",
              new_refresh[:8], "... (full value in logs)")
        print("ROTATED_REFRESH_TOKEN=" + new_refresh)

    active = []
    try:
        active = mb.get_active_messages(token)
    except Exception as e:
        print("warn: could not read active messages:", e)

    log = load_log()
    today = phoenix_today()
    results = []

    # --- 1. Today's DATA posts (fresh, today only) ---
    for line in content.dbacks_posts(today):
        post_once(token, log, active, "dbacks", line, today, results)
    for line in content.weather_drama_posts(today):
        post_once(token, log, active, "weather", line, today, results)

    # --- 2. Rolling 7-day QUEUE for evergreen categories ---
    for offset in range(QUEUE_DAYS):
        d = today + dt.timedelta(days=offset)
        post_once(token, log, active, "date",  content.date_line(d), d, results)
        post_once(token, log, active, "joke",  content.joke_for(d),  d, results)
        post_once(token, log, active, "quote", content.quote_for(d), d, results)
        hist = content.history_for(d)
        if hist:
            post_once(token, log, active, "history", hist, d, results)

    save_log(log)

    ok = [r for r in results if r[0] == "ok"]
    fail = [r for r in results if r[0] == "fail"]
    print(f"Posted {len(ok)} new item(s); {len(fail)} failure(s).")
    for _, cat, ds, txt in ok:
        print(f"  + [{cat}] {ds}: {txt}")
    for _, cat, ds, txt in fail:
        print(f"  ! [{cat}] {ds}: {txt}")

    if fail:
        alert(f"Memoryboard: {len(fail)} post(s) failed on {today}. "
              f"First: {fail[0][3][:120]}")
    return 0 if not fail else 1


def alert(msg):
    url = os.environ.get("MB_ALERT_WEBHOOK")
    if not url:
        print("ALERT (no webhook set):", msg)
        return
    try:
        import requests
        requests.post(url, json={"text": msg}, timeout=15)
    except Exception as e:
        print("alert failed:", e)


if __name__ == "__main__":
    try:
        sys.exit(run())
    except Exception as e:
        print("FATAL:", e)
        traceback.print_exc()
        alert(f"Memoryboard daily job crashed: {e}")
        sys.exit(2)
