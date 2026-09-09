import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildExpertSystem, callClaude, validateBlocks } from "@/lib/claude";
import type { ContentBlock, PlainTurn } from "@/lib/types";
import { SECRETARY_SLUG } from "@/lib/experts";
import { eventsForPrompt, sanitizeEvents, todayJst } from "@/lib/calendar";

export const maxDuration = 60;

/**
 * POST /api/answer
 * body: { expertSlug: string, history: PlainTurn[], blocks: ContentBlock[] }
 * res : { text: string }
 *
 * 指示書(prompt)はクライアントを信用せずDBから取得して system に組み込む。
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await req.json();
    const expertSlug = String(body?.expertSlug ?? "");
    const blocks = (body?.blocks ?? []) as ContentBlock[];
    const rawHistory = Array.isArray(body?.history) ? body.history : [];

    validateBlocks(blocks);

    const history: PlainTurn[] = rawHistory
      .filter(
        (t: PlainTurn) =>
          (t?.role === "user" || t?.role === "assistant") &&
          typeof t?.content === "string"
      )
      .slice(-12)
      .map((t: PlainTurn) => ({
        role: t.role,
        content: t.content.slice(0, 30000),
      }));

    const { data: expert, error } = await supabase
      .from("experts")
      .select("name,specialty,prompt")
      .eq("slug", expertSlug)
      .single();
    if (error || !expert) {
      return NextResponse.json(
        { error: "担当専門家が見つかりません" },
        { status: 404 }
      );
    }

    /* 受付ミルクには今日の予定 (Google カレンダー経由) を持たせる */
    let system = buildExpertSystem(expert);
    if (expertSlug === SECRETARY_SLUG) {
      const day = todayJst();
      const { data: cal } = await supabase
        .from("calendar_days")
        .select("events")
        .eq("day", day)
        .maybeSingle();
      if (cal) {
        system += `\n\n${eventsForPrompt(day, sanitizeEvents(cal.events))}`;
      }
    }

    const text = await callClaude({
      system,
      messages: [...history, { role: "user", content: blocks }],
      maxTokens: Number(process.env.ANTHROPIC_MAX_TOKENS || 2048),
    });

    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
