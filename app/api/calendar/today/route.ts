import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { callClaude, buildExpertSystem } from "@/lib/claude";
import { SECRETARY_SLUG } from "@/lib/experts";
import {
  buildMorningText,
  eventsForPrompt,
  eventsHash,
  sanitizeEvents,
  todayJst,
  type CalendarEvent,
} from "@/lib/calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/calendar/today
 * res: { day, received: boolean, events, receivedAt, text }
 *
 * - received=false … Apps Script からまだ今日の分が届いていない
 * - text は「確定部分 (予定の箇条書き)」+「ミルクの一言 (Claude 生成・当日キャッシュ)」
 *   Claude 生成に失敗しても確定部分だけは必ず返す。
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const day = todayJst();
  const { data: row } = await supabase
    .from("calendar_days")
    .select("day,events,greeting,greeting_hash,received_at")
    .eq("day", day)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ day, received: false, events: [], receivedAt: null, text: "" });
  }

  const events: CalendarEvent[] = sanitizeEvents(row.events);
  const hash = eventsHash(events);
  let greeting: string | null =
    row.greeting && row.greeting_hash === hash ? row.greeting : null;

  if (greeting === null) {
    greeting = await generateGreeting(supabase, day, events);
    if (greeting && hasAdminClient()) {
      try {
        const admin = createAdminClient();
        await admin
          .from("calendar_days")
          .update({ greeting, greeting_hash: hash })
          .eq("day", day);
      } catch {
        /* キャッシュ失敗は無視 (次回また生成する) */
      }
    }
  }

  return NextResponse.json({
    day,
    received: true,
    events,
    receivedAt: row.received_at,
    text: buildMorningText({ day, events, greeting }),
  });
}

/* ミルク (secretary) の指示書で、朝の一言だけを生成する */
async function generateGreeting(
  supabase: ReturnType<typeof createClient>,
  day: string,
  events: CalendarEvent[]
): Promise<string> {
  try {
    const { data: expert } = await supabase
      .from("experts")
      .select("name,specialty,prompt")
      .eq("slug", SECRETARY_SLUG)
      .maybeSingle();
    if (!expert) return "";
    const text = await callClaude({
      system: buildExpertSystem(expert),
      messages: [
        {
          role: "user",
          content:
            `${eventsForPrompt(day, events)}\n\n` +
            "上の予定は別途そのまま表示するので、予定の羅列や復唱はしないでください。" +
            "秘書として、今日を気持ちよく始められる一言だけを日本語で80字以内、1〜2文で返してください。" +
            "重なりや移動時間など気づいた点があれば短く添えて構いません。記号装飾・見出し・箇条書きは禁止。",
        },
      ],
      maxTokens: 200,
    });
    return text.trim().slice(0, 200);
  } catch {
    return "";
  }
}
