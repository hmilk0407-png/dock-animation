import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/claude";

export const maxDuration = 60;

/**
 * POST /api/extract
 * body: { b64: string }  … PDFのbase64
 * res : { text: string } … 本文テキスト
 *
 * 指示書取り込みモーダルで使用。ClaudeにPDF本文の抽出のみを依頼する。
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
    const b64 = String(body?.b64 ?? "");
    if (!b64) {
      return NextResponse.json({ error: "PDFデータが空です" }, { status: 400 });
    }
    if (Math.ceil(b64.length * 0.75) > 4_200_000) {
      return NextResponse.json(
        { error: "PDFは約4MBまで対応しています" },
        { status: 413 }
      );
    }

    const text = await callClaude({
      system:
        "あなたはPDFの本文を抽出するアシスタントです。渡されたPDFの本文テキストのみを、前置き・説明・要約を一切付けずにそのまま出力してください。",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: b64,
              },
            },
            { type: "text", text: "本文テキストを出力してください。" },
          ],
        },
      ],
      maxTokens: 4096,
    });

    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
