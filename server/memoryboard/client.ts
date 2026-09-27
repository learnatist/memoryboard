// Memoryboard Supabase client (Node 18+, uses global fetch).
// Auth via password grant; each run logs in fresh (avoids refresh-token rotation).

const PROJECT_REF = "iostbtfykhxomgnnmwgj";
const BASE = `https://${PROJECT_REF}.supabase.co`;
const REST = `${BASE}/rest/v1`;
const AUTH = `${BASE}/auth/v1`;

export const FAMILY_ID = 20876;
export const BOARD_IDS = [21689];
export const APP_VERSION = "1.1.25 (1)";

function anon(): string { return process.env.MB_ANON_KEY ?? ""; }

/** Log in with email+password, return an access token. */
export async function login(): Promise<string> {
  const email = process.env.MB_EMAIL, password = process.env.MB_PASSWORD;
  if (!anon() || !email || !password) {
    throw new Error("Missing MB_ANON_KEY / MB_EMAIL / MB_PASSWORD");
  }
  const r = await fetch(`${AUTH}/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon(), "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`Login failed ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data: any = await r.json();
  return data.access_token as string;
}

/**
 * Text size the board expects. Sending 0 makes text render screen-fillingly
 * huge — this replicates the app's auto-fit: min(cap, 0.71/sqrt(utf16Len)),
 * rendered_font_size = text_size * 1940.
 */
export function textSize(text: string): { ts: number; rf: number } {
  let len = 0;
  for (const ch of text) len += (ch.codePointAt(0)! > 0xffff ? 2 : 1);
  len = Math.max(1, len);
  const ts = Math.min(0.1269984375, 0.71 / Math.sqrt(len));
  return { ts, rf: Math.round(ts * 1940 * 10) / 10 };
}

function headers(token: string) {
  return {
    apikey: anon(),
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Create a text post that shows only on `dateStr` (YYYY-MM-DD). */
export async function postText(token: string, text: string, dateStr: string, tz: string): Promise<void> {
  const { ts, rf } = textSize(text);
  const now = new Date();
  const payload = {
    p_active: true,
    p_start_date: dateStr, p_end_date: dateStr,
    p_start_time: "", p_end_time: "",
    p_days_of_week: [], p_repeat_unit: "none", p_repeat_every: null, p_day_of_month: null,
    p_family_id: FAMILY_ID,
    p_image_url: "",
    p_memoryboard_ids: BOARD_IDS,
    p_message_image: "",
    p_message_text: text,
    p_message_type: "text",
    p_text_background_color: "#ffffff",
    p_text_color: "#1d1d1d",
    p_text_size: ts,
    p_local_created_at: now.toISOString().slice(0, 23).replace("T", " "),
    p_rendered_font_size: rf,
    p_pre_determined_text_size: "null",
    p_custom_text_size: 0,
    p_metadata: {
      event: "created", timestamp: now.toISOString(), device: "performatist",
      app_version: APP_VERSION, timezone: tz, locale: "en_US", message_type: "text",
    },
    p_is_private: false,
    p_requested_interactions: [],
    p_pin_until: "",
  };
  const r = await fetch(`${REST}/rpc/post_message_v2`, {
    method: "POST", headers: headers(token), body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`post_message_v2 ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

/**
 * All scheduled posts on the board between startDate and endDate (inclusive,
 * YYYY-MM-DD). Unlike getActiveMessages (today only), this covers the whole
 * upcoming queue, so the daily run can enforce one-post-per-category-per-day
 * across future days AND posts made by hand (e.g. Bill's sister).
 */
export async function getScheduledMessages(
  token: string, startDate: string, endDate: string,
): Promise<{ message_text: string; start_date: string }[]> {
  const jr = await fetch(
    `${REST}/message_memoryboard?select=message_id&memoryboard_id=eq.${BOARD_IDS[0]}`,
    { headers: headers(token) },
  );
  if (!jr.ok) throw new Error(`message_memoryboard ${jr.status}`);
  const ids = new Set<number>(((await jr.json()) as any[]).map((x) => x.message_id));
  const mr = await fetch(
    `${REST}/message?select=message_id,message_text,start_date&start_date=gte.${startDate}&start_date=lte.${endDate}`,
    { headers: headers(token) },
  );
  if (!mr.ok) throw new Error(`message ${mr.status}`);
  return ((await mr.json()) as any[])
    .filter((m) => ids.has(m.message_id))
    .map((m) => ({ message_text: m.message_text, start_date: (m.start_date || "").slice(0, 10) }));
}

/** Live/queued posts for dedup. Unwraps the { messages: [...] } envelope. */
export async function getActiveMessages(token: string): Promise<any[]> {
  const url = `${REST}/rpc/get_active_messages_for_app?p_memoryboard_id=${BOARD_IDS[0]}&p_app_version=${encodeURIComponent(APP_VERSION)}`;
  const r = await fetch(url, { headers: headers(token) });
  if (!r.ok) throw new Error(`get_active_messages ${r.status}`);
  const data: any = await r.json();
  if (data && Array.isArray(data.messages)) return data.messages;
  return Array.isArray(data) ? data : [];
}
