/* ---------- サーバー専用: Anthropic Messages API 呼び出し ----------
   APIキーは環境変数 ANTHROPIC_API_KEY からのみ読み、クライアントへは一切渡さない。 */
import "server-only";

const API_URL = "https://api.anthropic.com/v1/messages";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiMessage = { role: "user" | "assistant"; content: any };

export async function callClaude({
  system,
  messages,
  maxTokens = 2048,
}: {
  system: string;
  messages: ApiMessage[];
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY が設定されていません");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message || `Anthropic APIエラー (${res.status})`);
  }
  return (data.content || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((b: any) => b.type === "text")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((b: any) => b.text)
    .join("\n");
}

/* ---------- プロンプト構築 (v3の文面を移植) ---------- */

export function buildRouterSystem(
  roster: { slug: string; name: string; specialty: string; prompt: string }[]
): string {
  const lines = roster
    .map((e) => `- id:"${e.slug}" ${e.name}(${e.specialty}): ${e.prompt.slice(0, 60)}`)
    .join("\n");
  return `あなたは秘書です。ユーザーの依頼に最適な担当専門家を1名選びます。
専門家一覧:
${lines}

どれにも当てはまらない場合や雑談・一般的な質問は id:"secretary" を選びます。
必ず次のJSONのみを返してください。前置きやマークダウンの記号は禁止です。
{"expertId":"...","note":"選定理由を20字以内"}`;
}

export function buildExpertSystem(expert: {
  name: string;
  specialty: string;
  prompt: string;
}): string {
  return `あなたは「${expert.name}」。フレンチブルドッグの姿をした${expert.specialty}の専門家です。
以下の指示書に忠実に従い、日本語でプロフェッショナルに業務を遂行してください。
犬であることを過度にアピールせず、仕事の品質を最優先します。
添付ファイルがある場合は、その内容を踏まえて対応してください。
出力形式: 読みやすさを最優先し、強調・見出し・表などの記号装飾は内容の整理に必要な場合のみ最小限で使ってください。

【指示書】
${expert.prompt}`;
}

/* ---------- コンテンツブロックの検証 (サイズ・種類) ---------- */
const ALLOWED_IMAGE_MEDIA = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
const MAX_TOTAL_BYTES = 4_200_000; // Vercel関数のボディ上限(約4.5MB)を考慮

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateBlocks(blocks: any[]): void {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new Error("送信内容が空です");
  }
  let total = 0;
  for (const b of blocks) {
    if (b?.type === "text") {
      total += (b.text || "").length;
    } else if (b?.type === "image") {
      if (b?.source?.type === "url") {
        if (typeof b.source.url !== "string" || !b.source.url) {
          throw new Error("画像URLが不正です");
        }
      } else {
        if (!ALLOWED_IMAGE_MEDIA.has(b?.source?.media_type)) {
          throw new Error("対応していない画像形式です");
        }
        total += Math.ceil((b.source?.data?.length || 0) * 0.75);
      }
    } else if (b?.type === "document") {
      if (b?.source?.type === "url") {
        if (typeof b.source.url !== "string" || !b.source.url) {
          throw new Error("ドキュメントURLが不正です");
        }
      } else {
        if (b?.source?.media_type !== "application/pdf") {
          throw new Error("documentブロックはPDFのみ対応です");
        }
        total += Math.ceil((b.source?.data?.length || 0) * 0.75);
      }
    } else {
      throw new Error("不正なコンテンツブロックが含まれています");
    }
  }
  if (total > MAX_TOTAL_BYTES) {
    throw new Error("添付を含む送信サイズが上限(約4MB)を超えています");
  }
}
