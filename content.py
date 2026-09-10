"""
Content generators + banks for the daily Memoryboard run.

Design rules (validated on the real board, for a viewer with PSP):
  - Data posts (D-backs, weather): <= 25 chars, sentence case, one fact each.
  - Jokes/quotes: <= 35 chars.
  - Weather posts ONLY on "drama" days; quiet days produce nothing.
  - Everything is same-day and expires at midnight Phoenix time.

Banks are rotated by day-of-year so each category cycles without repeating
soon, and the daily job only needs to add ONE new item per category to keep
a 7-day queue full (see daily_run.py).
"""

import datetime as dt
import requests

# ---------- Static banks (curated, all <=35 chars, verified real) ----------

JOKES = [
    "What do cows read? Moos-papers.",
    "Why was 6 afraid of 7? 7 8 9!",
    "Cows on dates go to the moo-vies.",
    "What do bees chew? Bumble gum!",
    "Snakes' favorite class? Hiss-tory!",
    "I used to hate math, but it counts.",
    "A cat's favorite color? Purr-ple.",
    "Old snowmen just melt away.",
    "Lazy kangaroos are pouch potatoes.",
    "Broken pencils are pointless.",
    "I'm reading a book on anti-gravity!",
    "Clocks are all about the tick-tock.",
    "The moon is just a phase.",
    "Scarecrows are outstanding.",
]

# Quotes <=50 chars per your sister's spec; attribution kept short.
QUOTES = [
    "It's never over till it's over.",
    "The best way out is through. -Frost",
    "Well done beats well said. -Ben F.",
    "Turn your face to the sun. -Keller",
    "The buck stops here. -Truman",
    "Keep looking up.",
    "Do what you can, where you are.",
    "Fortune favors the bold. -Virgil",
    "Whatever you are, be a good one.",
    "Little by little does the trick.",
    "The journey is the reward.",
    "Every day is a fresh start.",
    "Simplicity is genius. -da Vinci",
    "Still round the corner: new road.",
]

# On-this-day: keyed by (month, day) -> short, upbeat, <=40 chars ideal.
# Chosen to resonate for an older Arizona baseball fan; verified events.
HISTORY = {
    (9, 9): "1776: 'United States' named.",
    (9, 10): "1846: Sewing machine patented.",
    (9, 11): "1985: Pete Rose: hit record!",
    (9, 12): "1962: JFK's 'We choose the Moon.'",
    (9, 13): "1857: Milton Hershey born.",
    (9, 14): "1814: Star-Spangled Banner.",
    (9, 15): "1949: The Lone Ranger debuts.",
    (9, 16): "1620: The Mayflower sets sail.",
    (9, 17): "1787: Constitution signed.",
    (9, 18): "1851: NY Times first printed.",
    (9, 19): "1957: 'Leave It to Beaver.'",
    (9, 20): "1519: Magellan sets sail.",
    (9, 21): "1937: 'The Hobbit' published.",
    (9, 22): "1862: Emancipation Proclamation.",
}

DBACKS_TEAM_ABBR = "AZ"


def joke_for(date):
    return JOKES[date.toordinal() % len(JOKES)]


def quote_for(date):
    return QUOTES[date.toordinal() % len(QUOTES)]


def history_for(date):
    key = (date.month, date.day)
    return HISTORY.get(key)  # None if we haven't curated that day


def date_line(date):
    # "Today is Wednesday, Sept 9, 2026" — but that's 32 chars, fits <=35.
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    wd = date.strftime("%A")
    return f"Today is {wd}, {months[date.month-1]} {date.day}, {date.year}."


# ---------- Live data: D-backs (MLB StatsAPI, free, no key) ----------

MLB_API = "https://statsapi.mlb.com/api/v1"
DBACKS_ID = 109  # Arizona Diamondbacks MLB team id


def _mlb_schedule(date):
    r = requests.get(f"{MLB_API}/schedule",
                     params={"sportId": 1, "teamId": DBACKS_ID,
                             "date": date.isoformat(),
                             "hydrate": "linescore,team"},
                     timeout=30)
    r.raise_for_status()
    return r.json()


def dbacks_posts(today):
    """
    Returns a list of <=25-char strings:
      - result of yesterday's game (won/lost + score)
      - today's game time if there is one
    Uses Phoenix local time for display.
    """
    out = []
    # Yesterday's result
    y = today - dt.timedelta(days=1)
    try:
        data = _mlb_schedule(y)
        for d in data.get("dates", []):
            for g in d.get("games", []):
                if g.get("status", {}).get("abstractGameState") != "Final":
                    continue
                home = g["teams"]["home"]; away = g["teams"]["away"]
                if home["team"]["id"] == DBACKS_ID:
                    us, them = home, away
                else:
                    us, them = away, home
                uscore = us.get("score"); tscore = them.get("score")
                if uscore is None or tscore is None:
                    continue
                if uscore > tscore:
                    out.append(f"D-backs won {uscore}-{tscore}!")
                else:
                    out.append(f"D-backs lost {uscore}-{tscore}.")
    except Exception:
        pass
    # Today's game time
    try:
        data = _mlb_schedule(today)
        for d in data.get("dates", []):
            for g in d.get("games", []):
                gd = g.get("gameDate")  # ISO UTC
                if not gd:
                    continue
                utc = dt.datetime.fromisoformat(gd.replace("Z", "+00:00"))
                # Convert to Phoenix (UTC-7, no DST)
                phx = utc - dt.timedelta(hours=7)
                hh = phx.hour % 12 or 12
                ampm = "AM" if phx.hour < 12 else "PM"
                out.append(f"D-backs play at {hh}:{phx.minute:02d}")
    except Exception:
        pass
    return out


# ---------- Live data: weather drama (Open-Meteo, free, no key) ----------

CITIES = {
    "Phoenix":     (33.448, -112.074),
    "Marrowstone": (48.055, -122.687),
    "Minneapolis": (44.978, -93.265),
    "NYC":         (40.713, -74.006),
}


def _forecast(lat, lon):
    r = requests.get("https://api.open-meteo.com/v1/forecast",
                     params={"latitude": lat, "longitude": lon,
                             "daily": "temperature_2m_max,precipitation_probability_max,"
                                      "weathercode,wind_speed_10m_max",
                             "temperature_unit": "fahrenheit",
                             "wind_speed_unit": "mph",
                             "timezone": "auto", "forecast_days": 1},
                     timeout=30)
    r.raise_for_status()
    return r.json()["daily"]


def weather_drama_posts(today):
    """
    Scan the four cities; emit <=25-char posts ONLY when something clears a
    drama bar. Return at most 2 (worst offenders), else empty.
    """
    candidates = []  # (severity, text)
    for city, (lat, lon) in CITIES.items():
        try:
            d = _forecast(lat, lon)
            tmax = d["temperature_2m_max"][0]
            pop = d["precipitation_probability_max"][0] or 0
            code = d["weathercode"][0]
            wind = d["wind_speed_10m_max"][0] or 0
        except Exception:
            continue
        # Snow codes (71-77, 85-86)
        if code in (71, 73, 75, 77, 85, 86):
            candidates.append((100, f"Snow in {city}!"))
        elif code in (95, 96, 99):  # thunderstorm
            candidates.append((90, f"Storms in {city}!"))
        elif wind >= 30:
            candidates.append((70, f"Windy in {city} today"))
        elif pop >= 70:
            candidates.append((60, f"Rain all day in {city}"))
        elif city == "Phoenix" and tmax >= 108:
            candidates.append((80, f"{int(round(tmax))} in Phoenix today"))
        elif city == "Minneapolis" and tmax <= 20:
            candidates.append((80, f"{int(round(tmax))} in Minneapolis"))
    candidates.sort(reverse=True)
    return [t for _, t in candidates[:2]]
