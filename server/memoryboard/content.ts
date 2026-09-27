// Content generators + banks. Format matches Bill's sister's style.
// Model: ONE post per category per day (see categoryOf + dailyRun dedup).
//
// Anti-staleness: jokeFor/quoteFor take an `avoid` set of texts already posted
// in the recent window (read from the board by dailyRun) and skip them, so
// content does not repeat on a fixed cycle. Banks are also large enough that
// the bank size comfortably exceeds the avoidance window.

const MLB = "https://statsapi.mlb.com/api/v1";
const DBACKS = 109;
const ESPN_SEA = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/sea/schedule";

// ---------- date / timezone helpers ----------

export function locDate(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
export function boardToday(tz: string): string {
  return locDate(new Date().toISOString(), tz);
}
function clock(iso: string, tz: string): string {
  const s = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
  return s.replace(":00", "").replace(" ", "").toLowerCase();
}
export function addDays(dateStr: string, n: number): string {
  const t = Date.parse(`${dateStr}T00:00:00Z`) + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}
function epochDay(dateStr: string): number {
  return Math.floor(Date.parse(`${dateStr}T00:00:00Z`) / 86400000);
}
function ordinal(n: number): string {
  const s = 10 <= n % 100 && n % 100 <= 20 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as any)[n % 10] || "th";
  return `${n}${s}`;
}

// ---------- joke bank (clean, family-friendly; ~100) ----------

const JOKES: [string, string][] = [
  ["What do cows read?", "Moos-papers!"],
  ["Why was 6 afraid of 7?", "Because 7 8 9!"],
  ["Where do cows go on a date?", "To the moo-vies!"],
  ["What do bees chew?", "Bumble gum!"],
  ["What's a snake's favorite class?", "Hiss-tory!"],
  ["Why did the golfer bring two pairs of pants?", "In case he got a hole in one!"],
  ["What do you call cheese that isn't yours?", "Nacho cheese!"],
  ["Why don't skeletons fight each other?", "They don't have the guts!"],
  ["What do you call a bear with no teeth?", "A gummy bear!"],
  ["Why did the scarecrow win an award?", "He was outstanding in his field!"],
  ["What did the ocean say to the beach?", "Nothing, it just waved!"],
  ["Why can't your nose be 12 inches long?", "Because then it'd be a foot!"],
  ["What do you call a fish with no eyes?", "A fsh!"],
  ["How does the moon cut his hair?", "Eclipse it!"],
  ["Why did the bicycle fall over?", "It was two-tired!"],
  ["What do you call a fake noodle?", "An impasta!"],
  ["Why did the coffee file a police report?", "It got mugged!"],
  ["How do you organize a space party?", "You planet!"],
  ["Why don't eggs tell jokes?", "They'd crack each other up!"],
  ["What do you call a sleeping dinosaur?", "A dino-snore!"],
  ["Why did the math book look so sad?", "It had too many problems!"],
  ["What do you call a belt made of watches?", "A waist of time!"],
  ["Why can't a bicycle stand on its own?", "It's two tired!"],
  ["What did one wall say to the other?", "I'll meet you at the corner!"],
  ["Why did the cookie go to the doctor?", "It was feeling crummy!"],
  ["What's orange and sounds like a parrot?", "A carrot!"],
  ["Why do seagulls fly over the sea?", "If they flew over the bay, they'd be bagels!"],
  ["What do you call a dog magician?", "A labracadabrador!"],
  ["Why was the broom late?", "It over-swept!"],
  ["What do you call a pile of cats?", "A meow-ntain!"],
  ["Why did the banana go to the doctor?", "It wasn't peeling well!"],
  ["What kind of shoes do spies wear?", "Sneakers!"],
  ["Why did the tomato turn red?", "It saw the salad dressing!"],
  ["What do you call a factory that makes okay products?", "A satisfactory!"],
  ["Why don't scientists trust atoms?", "They make up everything!"],
  ["What did the grape do when it got stepped on?", "It let out a little wine!"],
  ["Why did the picture go to jail?", "It was framed!"],
  ["What do you call a dinosaur with a great vocabulary?", "A thesaurus!"],
  ["How do you make a tissue dance?", "Put a little boogie in it!"],
  ["Why did the golfer wear two pairs of socks?", "In case he got a hole in one!"],
  ["What's a computer's favorite snack?", "Microchips!"],
  ["Why did the stadium get hot after the game?", "All the fans left!"],
  ["What do you call a cow with no legs?", "Ground beef!"],
  ["Why did the student eat his homework?", "The teacher said it was a piece of cake!"],
  ["What do you call an alligator in a vest?", "An investigator!"],
  ["Why was the calendar so popular?", "It had a lot of dates!"],
  ["What do you get from a pampered cow?", "Spoiled milk!"],
  ["Why did the barber win the race?", "He knew a shortcut!"],
  ["What do clouds wear under their shorts?", "Thunderwear!"],
  ["Why can't you trust stairs?", "They're always up to something!"],
  ["What did the left eye say to the right eye?", "Between us, something smells!"],
  ["Why did the golf ball go to the bank?", "To get a birdie loan!"],
  ["What do you call a boomerang that won't come back?", "A stick!"],
  ["Why did the orange stop rolling?", "It ran out of juice!"],
  ["What's a skeleton's least favorite room?", "The living room!"],
  ["Why did the bee get married?", "He found his honey!"],
  ["What do you call a train that sneezes?", "Achoo-choo train!"],
  ["Why did the clock go to the principal?", "For tocking too much!"],
  ["What do you call a fish wearing a bowtie?", "So-fish-ticated!"],
  ["Why did the pancake feel flat?", "It was a rough morning!"],
  ["What did the buffalo say to his son?", "Bison!"],
  ["Why did the lettuce win the race?", "It was a-head!"],
  ["What do you call a nervous javelin thrower?", "Shakespeare!"],
  ["Why did the melon jump in the lake?", "It wanted to be a water-melon!"],
  ["What did the janitor say when he jumped out?", "Supplies!"],
  ["Why did the golfer bring extra socks?", "In case he got a hole in one!"],
  ["What do you call a duck that gets all A's?", "A wise quacker!"],
  ["Why did the mushroom get invited everywhere?", "He was a fun guy!"],
  ["What did the traffic light say to the car?", "Don't look, I'm changing!"],
  ["Why do bees have sticky hair?", "They use honeycombs!"],
  ["What do you call cheese by itself?", "Provolone!"],
  ["Why did the football coach go to the bank?", "To get his quarterback!"],
  ["What do you call a can opener that doesn't work?", "A can't opener!"],
  ["Why did the scarecrow become a doctor?", "He was great at scaring off illness!"],
  ["What did the plate say to the other plate?", "Dinner's on me!"],
  ["Why did the golfer change his socks?", "He got a hole in one!"],
  ["What do you call a sad strawberry?", "A blueberry!"],
  ["Why did the bread go to therapy?", "It had a lot on its plate!"],
  ["What do you call a dog that can do magic?", "A labracadabrador!"],
  ["Why did the egg hide?", "It was a little chicken!"],
  ["What's a baseball player's favorite kind of party?", "A home run!"],
  ["Why did the cabbage win?", "It was ahead by a leaf!"],
  ["What do you call an old snowman?", "Water!"],
  ["Why did the clock get in trouble?", "It was ticking everyone off!"],
  ["What did the nut say when it sneezed?", "Cashew!"],
  ["Why did the fisherman blush?", "He saw the sea weed!"],
  ["What do you call a pig that does karate?", "A pork chop!"],
  ["Why did the corn get promoted?", "It was a-maize-ing!"],
  ["What do you call a lazy kangaroo?", "A pouch potato!"],
  ["Why was the belt arrested?", "For holding up a pair of pants!"],
  ["What do you call a rabbit with fleas?", "Bugs Bunny!"],
  ["Why did the tree go to the dentist?", "It needed a root canal!"],
  ["What do you call a boat that's afraid of water?", "A nervous wreck!"],
  ["Why did the golfer smile at breakfast?", "He finally got a hole in one!"],
  ["What do you call a dinosaur that crashes cars?", "Tyrannosaurus wrecks!"],
  ["Why did the sun go to school?", "To get a little brighter!"],
  ["What do you call a shoe made of banana?", "A slipper!"],
  ["Why did the grape stop in the road?", "It ran out of juice!"],
  ["What did one hat say to the other?", "You stay here, I'll go on ahead!"],
  ["Why did the pencil get an award?", "It was on point!"],
];

// ---------- quote bank (verified attributions + labeled proverbs) ----------
// Deliberately avoids the common misattributions (Twain/Einstein/Gandhi/etc.).

const QUOTES: [string, string][] = [
  ["It ain't over till it's over.", "Yogi Berra"],
  ["The buck stops here.", "Harry S. Truman"],
  ["The only thing we have to fear is fear itself.", "Franklin D. Roosevelt"],
  ["Ask what you can do for your country.", "John F. Kennedy"],
  ["Speak softly and carry a big stick.", "Theodore Roosevelt"],
  ["Do what you can, with what you have, where you are.", "Theodore Roosevelt"],
  ["Keep your eyes on the stars, and your feet on the ground.", "Theodore Roosevelt"],
  ["Well done is better than well said.", "Benjamin Franklin"],
  ["An investment in knowledge pays the best interest.", "Benjamin Franklin"],
  ["Early to bed and early to rise makes a man healthy, wealthy, and wise.", "Benjamin Franklin"],
  ["The best way out is always through.", "Robert Frost"],
  ["Fortune favors the bold.", "Virgil"],
  ["I think, therefore I am.", "René Descartes"],
  ["Genius is one percent inspiration and ninety-nine percent perspiration.", "Thomas Edison"],
  ["Float like a butterfly, sting like a bee.", "Muhammad Ali"],
  ["The unexamined life is not worth living.", "Socrates"],
  ["A journey of a thousand miles begins with a single step.", "Lao Tzu"],
  ["All the world's a stage.", "William Shakespeare"],
  ["This above all: to thine own self be true.", "William Shakespeare"],
  ["We know what we are, but know not what we may be.", "William Shakespeare"],
  ["Not all those who wander are lost.", "J.R.R. Tolkien"],
  ["Life is what happens when you're busy making other plans.", "John Lennon"],
  ["Imagination is more important than knowledge.", "Albert Einstein"],
  ["Government of the people, by the people, for the people.", "Abraham Lincoln"],
  ["Give me liberty, or give me death!", "Patrick Henry"],
  ["The pen is mightier than the sword.", "Edward Bulwer-Lytton"],
  ["Wrinkles should merely indicate where smiles have been.", "Mark Twain"],
  ["With great power comes great responsibility.", "Stan Lee"],
  ["Slow and steady wins the race.", "Aesop"],
  ["Actions speak louder than words.", "Proverb"],
  ["Rome wasn't built in a day.", "Proverb"],
  ["The early bird catches the worm.", "Proverb"],
  ["Where there's a will, there's a way.", "Proverb"],
  ["Every cloud has a silver lining.", "Proverb"],
  ["Laughter is the best medicine.", "Proverb"],
  ["Home is where the heart is.", "Proverb"],
  ["Practice makes perfect.", "Proverb"],
  ["Look before you leap.", "Proverb"],
  ["A picture is worth a thousand words.", "Proverb"],
  ["Two heads are better than one.", "Proverb"],
  ["When in Rome, do as the Romans do.", "Proverb"],
  ["Necessity is the mother of invention.", "Proverb"],
  ["Honesty is the best policy.", "Proverb"],
  ["Better late than never.", "Proverb"],
  ["Good things come to those who wait.", "Proverb"],
  ["A watched pot never boils.", "Proverb"],
  ["The grass is always greener on the other side.", "Proverb"],
  ["Birds of a feather flock together.", "Proverb"],
  ["You can't judge a book by its cover.", "Proverb"],
  ["When the going gets tough, keep going.", "Proverb"],
  ["Knowledge is power.", "Francis Bacon"],
  ["I came, I saw, I conquered.", "Julius Caesar"],
  ["All that glitters is not gold.", "William Shakespeare"],
  ["Don't count your chickens before they hatch.", "Proverb"],
  ["The apple doesn't fall far from the tree.", "Proverb"],
  ["Absence makes the heart grow fonder.", "Proverb"],
  ["A friend in need is a friend indeed.", "Proverb"],
  ["Great minds think alike.", "Proverb"],
  ["Patience is a virtue.", "Proverb"],
  ["You reap what you sow.", "Proverb"],
  ["Many hands make light work.", "Proverb"],
  ["Beauty is in the eye of the beholder.", "Proverb"],
];

// ---------- on-this-day fallback bank (verified, upbeat) ----------
// Primary source is Wikipedia (see historyFor); this covers the launch window
// and serves as a graceful fallback if the API is unreachable.

const HISTORY: Record<string, [string, string]> = {
  "9-9": ["1776", "The Continental Congress officially adopted the name 'United States of America.'"],
  "9-10": ["1846", "Elias Howe patented the first practical sewing machine."],
  "9-11": ["1985", "Pete Rose broke Ty Cobb's record with his 4,192nd career hit."],
  "9-12": ["1962", "President Kennedy gave his 'We choose to go to the Moon' speech."],
  "9-13": ["1857", "Milton Hershey, founder of the Hershey chocolate company, was born."],
  "9-14": ["1814", "Francis Scott Key wrote 'The Star-Spangled Banner.'"],
  "9-15": ["1949", "'The Lone Ranger' premiered on television."],
  "9-16": ["1620", "The Mayflower set sail from England for the New World."],
  "9-17": ["1787", "The U.S. Constitution was signed in Philadelphia."],
  "9-18": ["1851", "The New York Times published its very first edition."],
  "9-19": ["1957", "'Leave It to Beaver' premiered on television."],
  "9-20": ["1519", "Ferdinand Magellan set sail to circumnavigate the globe."],
  "9-21": ["1937", "J.R.R. Tolkien's 'The Hobbit' was first published."],
  "9-22": ["1862", "Lincoln issued the preliminary Emancipation Proclamation."],
};

// ---------- selectors (avoid recently-posted content) ----------

function pick(bank: [string, string][], dateStr: string, format: (a: string, b: string) => string, avoid?: Set<string>): string {
  const n = bank.length;
  const start = ((epochDay(dateStr) % n) + n) % n;
  for (let i = 0; i < n; i++) {
    const [a, b] = bank[(start + i) % n];
    const text = format(a, b);
    if (!avoid || !avoid.has(text)) return text;
  }
  const [a, b] = bank[start];
  return format(a, b); // window somehow covers the whole bank: reuse least-recent
}

export function jokeFor(dateStr: string, avoid?: Set<string>): string {
  return pick(JOKES, dateStr, (s, p) => `🤣 ${s}\n\n${p}`, avoid);
}
export function quoteFor(dateStr: string, avoid?: Set<string>): string {
  return pick(QUOTES, dateStr, (q, who) => `"${q}"\n\n— ${who}`, avoid);
}

// ---------- on this day (Wikipedia primary, filtered for tone; bank fallback) ----------

const GRIM = /\b(kill|killed|dead|death|died|dies|massacre|slaughter|bomb|bombed|bombing|war|battle|attack|assassinat|shot|murder|execut|genocide|terror|hijack|crash|disaster|earthquake|hurricane|flood|famine|plague|epidemic|pandemic|riot|invasion|invaded|nazi|holocaust|slave|slaver|shooting|explosion|wreck|sank|sink|drown|tragedy|victim|casualt)/i;

export async function historyFor(dateStr: string, tz = "UTC"): Promise<string | null> {
  const [, m, d] = dateStr.split("-").map(Number);
  try {
    const mm = String(m).padStart(2, "0"), dd = String(d).padStart(2, "0");
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${mm}/${dd}`, {
      headers: { "User-Agent": "memoryboard/1.0 (bfish42@gmail.com)", Accept: "application/json" },
    });
    if (r.ok) {
      const data: any = await r.json();
      // "selected" = editor-curated most-notable events (warmer, more
      // recognizable than the raw "events" firehose). Same item shape.
      let events = ((data.selected || []) as any[]).filter((e) => e && e.year && e.text);
      const upbeat = events.filter((e) => !GRIM.test(String(e.text)));
      const pool = upbeat.length ? upbeat : [];
      if (pool.length) {
        const e = pool[((epochDay(dateStr) % pool.length) + pool.length) % pool.length];
        let text = String(e.text).trim().replace(/\s+/g, " ");
        if (text.length > 150) text = text.slice(0, 147).trimEnd() + "…";
        return `🤔 On this day in ${e.year}:\n\n${text}`;
      }
    }
  } catch { /* fall through to bank */ }
  const item = HISTORY[`${m}-${d}`];
  if (item) return `🤔 On this day in ${item[0]}:\n\n${item[1]}`;
  return null;
}

export function dateLine(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  const wd = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(`${dateStr}T12:00:00Z`).getUTCDay()];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `☀️ Today is ${wd},\n${months[m - 1]} ${ordinal(d)}.`;
}

// ---------- category classification (one post per category per day) ----------
// D-backs and Seahawks are ONE post per team per day (result + game folded into
// a single line). Tennis and anything else is uncapped.

export function categoryOf(text: string): string {
  const t = (text || "").trim();
  if (t.startsWith("☀") || t.startsWith("📅")) return "date";
  if (t.startsWith("🤣")) return "joke";
  if (t.startsWith("🤔")) return "onthisday";
  if (t.startsWith('"') || t.startsWith("“")) return "quote";
  if (/⚾/.test(t)) return "dbacks";
  if (/🏈/.test(t)) return "seahawks";
  if (/^(❄|⛈|🌬|🌧|🔥|🥶)/u.test(t)) return "weather";
  return "";
}

// ---------- live sports: ONE combined post per team for today ----------

export async function dbacksTodayPost(today: string, tz: string): Promise<string | null> {
  let result: string | null = null;
  let game: string | null = null;
  try {
    const y = addDays(today, -1);
    const j: any = await (await fetch(`${MLB}/schedule?sportId=1&teamId=${DBACKS}&date=${y}&hydrate=team,linescore`)).json();
    for (const dd of j.dates || []) for (const g of dd.games || []) {
      if (g.status?.abstractGameState !== "Final") continue;
      const h = g.teams.home, a = g.teams.away;
      const us = h.team.id === DBACKS ? h : a, them = h.team.id === DBACKS ? a : h;
      if (us.score == null || them.score == null) continue;
      result = us.score > them.score ? `won ${us.score}-${them.score}` : `lost ${us.score}-${them.score}`;
    }
  } catch { /* feed down */ }
  try {
    const j: any = await (await fetch(`${MLB}/schedule?sportId=1&teamId=${DBACKS}&date=${today}&hydrate=team`)).json();
    for (const dd of j.dates || []) for (const g of dd.games || []) {
      if (!g.gameDate) continue;
      const h = g.teams.home, a = g.teams.away;
      const vs = h.team.id === DBACKS ? `vs ${a.team.teamName}` : `@ ${h.team.teamName}`;
      game = `${clock(g.gameDate, tz)} ${vs}`;
    }
  } catch { /* feed down */ }
  if (result && game) return `⚾️ DBacks ${result}! Play today ${game}`;
  if (result) return `⚾️ DBacks ${result} last night!`;
  if (game) return `⚾️ DBacks play today ${game}`;
  return null;
}

export async function seahawksTodayPost(today: string, tz: string): Promise<string | null> {
  let events: any[] = [];
  try { events = ((await (await fetch(ESPN_SEA)).json()) as any).events || []; } catch { return null; }
  const yday = addDays(today, -1);
  let result: string | null = null;
  let game: string | null = null;
  for (const e of events) {
    if (!e.date) continue;
    const ld = locDate(e.date, tz);
    if (ld !== today && ld !== yday) continue;
    const cs = (e.competitions?.[0]?.competitors) || [];
    const sea = cs.find((c: any) => c.team?.abbreviation === "SEA");
    const opp = cs.find((c: any) => c.team?.abbreviation !== "SEA");
    if (!sea || !opp) continue;
    const on = opp.team?.shortDisplayName || opp.team?.displayName || "?";
    if (ld === today) {
      game = `${clock(e.date, tz)} ${sea.homeAway === "home" ? `vs ${on}` : `at ${on}`}`;
    } else {
      const ss = Number(sea.score?.value ?? sea.score), os = Number(opp.score?.value ?? opp.score);
      if (!isNaN(ss) && !isNaN(os) && (ss || os)) result = ss > os ? `won ${ss}-${os}` : `lost ${ss}-${os}`;
    }
  }
  if (result && game) return `🏈 Seahawks ${result}! Play today ${game}`;
  if (result) return `🏈 Seahawks ${result} last night!`;
  if (game) return `🏈 Seahawks play today ${game}`;
  return null;
}

// ---------- weather (drama only, at most one line) ----------

const CITIES: Record<string, [number, number]> = {
  Phoenix: [33.448, -112.074], Marrowstone: [48.055, -122.687],
  Minneapolis: [44.978, -93.265], NYC: [40.713, -74.006],
};

export async function weatherTodayPost(_today: string): Promise<string | null> {
  const cands: [number, string][] = [];
  for (const [city, [lat, lon]] of Object.entries(CITIES)) {
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_probability_max,weathercode,wind_speed_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1`;
      const d: any = (await (await fetch(u)).json()).daily;
      const tmax = d.temperature_2m_max[0], pop = d.precipitation_probability_max[0] || 0;
      const code = d.weathercode[0], wind = d.wind_speed_10m_max[0] || 0;
      if ([71, 73, 75, 77, 85, 86].includes(code)) cands.push([100, `❄️ Snow in ${city} today!`]);
      else if ([95, 96, 99].includes(code)) cands.push([90, `⛈️ Storms in ${city} today!`]);
      else if (wind >= 30) cands.push([70, `🌬️ Windy in ${city} today`]);
      else if (pop >= 70) cands.push([60, `🌧️ Rain all day in ${city}`]);
      else if (city === "Phoenix" && tmax >= 108) cands.push([80, `🔥 ${Math.round(tmax)}° in Phoenix today`]);
      else if (city === "Minneapolis" && tmax <= 20) cands.push([80, `🥶 ${Math.round(tmax)}° in Minneapolis`]);
    } catch { /* skip city */ }
  }
  cands.sort((a, b) => b[0] - a[0]);
  return cands.length ? cands[0][1] : null;
}
