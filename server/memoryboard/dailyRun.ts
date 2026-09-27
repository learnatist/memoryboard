import { login, postText, getScheduledMessages } from "./client";
import {
  boardToday, addDays, dateLine, jokeFor, quoteFor, historyFor,
  dbacksTodayPost, seahawksTodayPost, weatherTodayPost, categoryOf,
} from "./content";

export type RunResult = { today: string; posted: string[]; skipped: number; errors: string[] };

// How many days back to look when avoiding repeated jokes/quotes. Must stay
// well below the joke/quote bank sizes so there is always an unused option.
const AVOID_DAYS = 45;

/**
 * One pass, run once per day (~1:05am Pacific). Posts ONLY that day's content —
 * no rolling queue, so nothing can accumulate. Two dedups:
 *  1. One post per category per day, checked against what's already on the board
 *     today (including the sister's hand-made posts) — never doubles a category.
 *  2. Jokes and quotes avoid anything posted in the last AVOID_DAYS, so content
 *     does not recycle on a fixed cycle.
 */
export async function dailyRun(tz: string): Promise<RunResult> {
  const token = await login();
  const today = boardToday(tz);

  // One board read covering the recent window through today.
  let window: { message_text: string; start_date: string }[] = [];
  try { window = await getScheduledMessages(token, addDays(today, -AVOID_DAYS), today); } catch { /* proceed */ }

  // Today's categories already present -> don't double up per day.
  const seen = new Set<string>();
  // Texts of jokes/quotes posted recently -> don't repeat them.
  const recentJokes = new Set<string>();
  const recentQuotes = new Set<string>();
  for (const m of window) {
    const c = categoryOf(m.message_text);
    if (c && m.start_date === today) seen.add(c);
    if (c === "joke") recentJokes.add(m.message_text.trim());
    if (c === "quote") recentQuotes.add(m.message_text.trim());
  }

  const posted: string[] = [], errors: string[] = [];
  let skipped = 0;

  async function once(text: string | null) {
    if (!text) return;
    const c = categoryOf(text);
    if (c && seen.has(c)) { skipped++; return; }
    try {
      await postText(token, text, today, tz);
      if (c) seen.add(c);
      posted.push(text.split("\n")[0]);
    } catch (e: any) {
      errors.push(String(e?.message ?? e).slice(0, 140));
    }
  }

  await once(dateLine(today));
  await once(jokeFor(today, recentJokes));
  await once(quoteFor(today, recentQuotes));
  await once(await historyFor(today, tz));
  await once(await dbacksTodayPost(today, tz));
  await once(await seahawksTodayPost(today, tz));
  await once(await weatherTodayPost(today));

  return { today, posted, skipped, errors };
}
