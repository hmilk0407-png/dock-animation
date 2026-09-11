import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/gdoc
 * body: { title: string, markdown: string, historyId?: string }
 * res : { url: string, id: string }
 *
 * 回答本文を Google ドキュメントとして出力する。
 * Google Cloud Console (OAuth/サービスアカウント) が使えない環境のため、
 * 久澄さんのアカウントで公開した Apps Script Web アプリ (docs/google/gdoc.gs) を経由する。
 *   GDOC_SCRIPT_URL : Apps Script のデプロイURL (/exec)
 *   GDOC_SECRET     : Apps Script 側の Script Properties SECRET と同じ合言葉
 * ログイン必須。historyId が渡されれば requests.artifact_url に URL を保存する。
 */
export async function POST(req: Request) {
  const scriptUrl = process.env.GDOC_SCRIPT_URL || "";
  const secret = process.env.GDOC_SECRET || "";
  if (!scriptUrl || !secret) {
    return NextResponse.json(
      { error: "Google ドキュメント出力が未設定です (GDOC_SCRIPT_URL / GDOC_SECRET)" },
      { status: 503 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON が不正です" }, { status: 400 });
  }
  const markdown = typeof body.markdown === "string" ? body.markdown : "";
  const title = (typeof body.title === "string" ? body.title : "").trim().slice(0, 120);
  const historyId = typeof body.historyId === "string" ? body.historyId : "";
  if (!markdown.trim()) return NextResponse.json({ error: "本文が空です" }, { status: 400 });
  if (markdown.length > 200_000) {
    return NextResponse.json({ error: "本文が長すぎます (20万文字まで)" }, { status: 413 });
  }

  let result: { url?: string; id?: string; error?: string };
  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret, title: title || "BUHI WORKS 出力", markdown }),
      redirect: "follow", // Apps Script は 302 でリダイレクトしてから JSON を返す
    });
    const text = await res.text();
    try {
      result = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: `Apps Script の応答が JSON ではありません (${res.status})。デプロイ設定 (アクセス: 全員) を確認してください` },
        { status: 502 }
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Apps Script への接続に失敗しました: ${e instanceof Error ? e.message : ""}` },
      { status: 502 }
    );
  }
  if (result.error || !result.url) {
    return NextResponse.json({ error: result.error || "ドキュメント作成に失敗しました" }, { status: 502 });
  }

  if (historyId) {
    // RLS により自分の行しか更新されない。失敗しても URL は返す
    const { error } = await supabase
      .from("requests")
      .update({ artifact_url: result.url })
      .eq("id", historyId);
    if (error) console.error("artifact_url の保存に失敗", error);
  }

  return NextResponse.json({ url: result.url, id: result.id });
}
