import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeEvents } from "@/lib/calendar";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/calendar/ingest
 * 送信元: Google Apps Script (pushToday) — 1時間おき
 * header: x-buhi-secret  (環境変数 CALENDAR_SECRET と一致すること)
 * body  : { date: 'YYYY-MM-DD', events: [{title,start,end,allDay,location}] }
 * res   : { ok: true, day, count }
 *
 * ログイン不要 (middleware の認証対象から除外済み)。合言葉だけで守る。
 * service role で calendar_days を upsert する (RLS は書き込みを許可しない)。
 */
export async function POST(req: Request) {
  const expected = process.env.CALENDAR_SECRET || "";
  if (!expected) {
    return NextResponse.json({ error: "CALENDAR_SECRET が未設定です" }, { status: 503 });
  }
  const given = req.headers.get("x-buhi-secret") || "";
  if (!safeEqual(given, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON が不正です" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const day = typeof b.date === "string" ? b.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: "date は YYYY-MM-DD 形式です" }, { status: 400 });
  }
  const events = sanitizeEvents(b.events);

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("calendar_days").upsert(
      {
        day,
        events,
        received_at: new Date().toISOString(),
      },
      { onConflict: "day" }
    );
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, day, count: events.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* 文字列長の違いでも時間差が出ないよう固定長比較 */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
