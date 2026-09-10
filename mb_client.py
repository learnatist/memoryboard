"""
Memoryboard client — talks to the Supabase backend behind app.memoryboard.com.

Endpoints (discovered from the live app):
  POST /rest/v1/rpc/post_message_v2            -> create a post
  GET  /rest/v1/rpc/get_active_messages_for_app -> list live/queued posts

Auth model: Supabase. A long-lived REFRESH TOKEN is exchanged for a short-lived
ACCESS TOKEN via /auth/v1/token?grant_type=refresh_token. The access token
(and the public anon apikey) go on every REST call.

Secrets come from environment variables (set these as Replit Secrets):
  MB_ANON_KEY       - public anon apikey (eyJ... ) — safe but still env-stored
  MB_REFRESH_TOKEN  - your account refresh token — SECRET, never in code
"""

import os
import json
import datetime as dt
import requests

PROJECT_REF = "iostbtfykhxomgnnmwgj"
BASE = f"https://{PROJECT_REF}.supabase.co"
REST = f"{BASE}/rest/v1"
AUTH = f"{BASE}/auth/v1"

FAMILY_ID = 20876
BOARD_IDS = [21689]
APP_VERSION = "1.1.25 (1)"
TIMEZONE = "America/Phoenix"   # board runs on Phoenix local time

ANON_KEY = os.environ.get("MB_ANON_KEY", "")
REFRESH_TOKEN = os.environ.get("MB_REFRESH_TOKEN", "")


class MemoryboardError(Exception):
    pass


def _require_secrets():
    missing = [n for n, v in [("MB_ANON_KEY", ANON_KEY),
                              ("MB_REFRESH_TOKEN", REFRESH_TOKEN)] if not v]
    if missing:
        raise MemoryboardError(f"Missing env secrets: {', '.join(missing)}")


def get_access_token():
    """Exchange the refresh token for a fresh access token."""
    _require_secrets()
    r = requests.post(
        f"{AUTH}/token",
        params={"grant_type": "refresh_token"},
        headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
        json={"refresh_token": REFRESH_TOKEN},
        timeout=30,
    )
    if r.status_code != 200:
        raise MemoryboardError(f"Token refresh failed {r.status_code}: {r.text[:300]}")
    data = r.json()
    # Supabase rotates refresh tokens; capture the new one so the caller can persist it.
    return data["access_token"], data.get("refresh_token")


def _headers(access_token):
    return {
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def post_text(access_token, text, on_date,
              text_color="#1d1d1d", bg_color="#ffffff"):
    """
    Create a text post that appears only on `on_date` (a datetime.date),
    matching the app's same-day behavior. Font size is left to the board's
    auto-size (we send neutral values; the board recomputes on render).
    """
    date_str = on_date.isoformat()
    now = dt.datetime.now()
    payload = {
        "p_active": True,
        "p_start_date": date_str,
        "p_end_date": date_str,
        "p_start_time": "",
        "p_end_time": "",
        "p_days_of_week": [],
        "p_repeat_unit": "none",
        "p_repeat_every": None,
        "p_day_of_month": None,
        "p_family_id": FAMILY_ID,
        "p_image_url": "",
        "p_memoryboard_ids": BOARD_IDS,
        "p_message_image": "",
        "p_message_text": text,
        "p_message_type": "text",
        "p_text_background_color": bg_color,
        "p_text_color": text_color,
        "p_text_size": 0,
        "p_local_created_at": now.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
        "p_rendered_font_size": 0,
        "p_pre_determined_text_size": "null",
        "p_custom_text_size": 0,
        "p_metadata": {
            "event": "created",
            "timestamp": dt.datetime.utcnow().isoformat() + "Z",
            "device": "server automation",
            "app_version": APP_VERSION,
            "timezone": TIMEZONE,
            "locale": "en_US",
            "message_type": "text",
        },
        "p_is_private": False,
        "p_requested_interactions": [],
        "p_pin_until": "",
    }
    r = requests.post(f"{REST}/rpc/post_message_v2",
                      headers=_headers(access_token),
                      data=json.dumps(payload), timeout=30)
    if r.status_code not in (200, 201, 204):
        raise MemoryboardError(f"post_message_v2 failed {r.status_code}: {r.text[:300]}")
    return r.json() if r.text.strip() else {"status": r.status_code}


def get_active_messages(access_token):
    """List posts currently active/queued on the board."""
    r = requests.get(
        f"{REST}/rpc/get_active_messages_for_app",
        headers=_headers(access_token),
        params={"p_memoryboard_id": BOARD_IDS[0], "p_app_version": APP_VERSION},
        timeout=30,
    )
    if r.status_code != 200:
        raise MemoryboardError(f"get_active_messages failed {r.status_code}: {r.text[:300]}")
    return r.json()


if __name__ == "__main__":
    # Smoke test: refresh token, then list active messages. Posts nothing.
    tok, _ = get_access_token()
    print("Access token acquired:", tok[:12], "...")
    msgs = get_active_messages(tok)
    print(f"Active/queued messages: {len(msgs) if isinstance(msgs, list) else msgs}")
