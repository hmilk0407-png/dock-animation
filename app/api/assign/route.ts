import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildRouterSystem, callClaude } from "@/lib/claude";
import { SECRETARY_SLUG } from "@/lib/experts";

export const maxDuration = 60;

/**
 * POST /api/assign
 * body: { text: string, attachmentNames: string[] }
 * res : { slug: string, note: string }
 *
 * ログインユーザーの専門家名簿をDBから取得し、ミルク(ルーター)に最適な担当を選ばせる。
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
    const text: string = String(body?.text ?? "");
    const attachmentNames: string[] = Array.isArray(body?.attachmentNames)
      ? body.attachmentNames.map(String)
      : [];

    const { data: roster, error } = await supabase
      .from("experts")
      .select("slug,name,specialty,prompt")
      .order("sort_order");
    if (error || !roster?.length) {
      return NextResponse.json({ slug: SECRETARY_SLUG, note: "" });
    }

    const attNote =
      attachmentNames.length > 0
        ? `\n[添付ファイル: ${attachmentNames.join(", ")}]`
        : "";

    const raw = await callClaude({
      system: buildRouterSystem(roster),
      messages: [
        {
          role: "user",
          content: (text || "（本文なし・添付ファイルのみ）") + attNote,
        },
      ],
      maxTokens: 300,
    });

    let slug = SECRETARY_SLUG;
    let note = "";
    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      if (roster.some((e) => e.slug === parsed.expertId)) slug = parsed.expertId;
      note = String(parsed.note || "").slice(0, 40);
    } catch {
      /* パース失敗時は秘書が対応 */
    }

    return NextResponse.json({ slug, note });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
