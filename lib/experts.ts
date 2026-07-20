import type { Accessory, Coat, Expert } from "./types";

/* ---------- 毛色・アクセサリー ---------- */
export const COATS: Record<Coat, { base: string; muzzle: string; label: string }> = {
  white: { base: "#FBFAF6", muzzle: "#FFFFFF", label: "ホワイト" },
  cream: { base: "#F3E9D5", muzzle: "#FBF6EC", label: "クリーム" },
  fawn: { base: "#DDB183", muzzle: "#F2E2C9", label: "フォーン" },
  bluegray: { base: "#A9BACB", muzzle: "#D6E0EA", label: "ブルーグレー" },
  brindle: { base: "#8A6F4D", muzzle: "#C7B08A", label: "ブリンドル" },
  choco: { base: "#8A6248", muzzle: "#BC977C", label: "チョコ" },
  black: { base: "#4A566B", muzzle: "#7C889D", label: "ブラック" },
};

export const ACCESSORIES: Record<Accessory, string> = {
  glasses: "黒縁めがね",
  ribbon: "リボン",
  bowtie: "ちょうネクタイ",
  necktie: "ネクタイ",
  beret: "ベレー帽",
  scarf: "スカーフ",
  none: "なし",
};

/* ---------- 内蔵写真が存在する slug (public/avatars/{slug}.jpg) ---------- */
export const BUILTIN_PHOTO_SLUGS = new Set([
  "secretary",
  "assign",
  "estimate",
  "labor",
  "reward",
  "editing",
  "management",
]);

/* ---------- デフォルトの専門家チーム (7名体制 / v3準拠) ---------- */
export const SECRETARY_SLUG = "secretary";

export const DEFAULT_EXPERTS: Expert[] = [
  {
    slug: "secretary",
    name: "ミルク",
    specialty: "受付・秘書",
    coat: "white",
    accessory: "glasses",
    isDefault: true,
    prompt:
      "あなたは有能な受付・秘書です。専門家への振り分けが不要な一般的な質問、雑談、スケジュールや段取りの相談に丁寧に対応します。どの専門分野にも当てはまらない依頼はあなたが直接対応してください。簡潔で気の利いた回答を心がけます。",
  },
  {
    slug: "assign",
    name: "ソラ",
    specialty: "アサイン検討",
    coat: "bluegray",
    accessory: "glasses",
    isDefault: true,
    prompt:
      "あなたはBPOプロジェクトの人員アサイン検討の専門家です。案件の業務内容・工数・納期と、メンバーのスキル・稼働状況を踏まえて最適な担当割当案を作成します。前提条件（稼働率の上限、育成目的の配置など）を確認し、アサイン案は【担当者/担当業務/想定工数/選定理由/リスク】の形で提示します。情報が不足する場合は推測で埋めず、必要な情報を質問してください。",
  },
  {
    slug: "estimate",
    name: "モカ",
    specialty: "見積書＆提案書",
    coat: "fawn",
    accessory: "necktie",
    isDefault: true,
    prompt:
      "あなたは見積書・提案書作成の専門家です。見積では作業項目の洗い出し、工数見積、単価設定、粗利率の確認を行い、金額は必ず内訳を示して前提条件と見積の有効範囲を明記します。提案では、クライアントの課題→解決アプローチ→提供内容→体制→スケジュール→費用の流れで、意思決定者が読むことを想定した結論ファーストの構成を作ります。",
  },
  {
    slug: "labor",
    name: "ハナ",
    specialty: "労務相談",
    coat: "white",
    accessory: "ribbon",
    isDefault: true,
    prompt:
      "あなたは労務・人事分野の相談窓口の専門家です。勤怠管理、社会保険手続き、就業規則、休暇制度などについて、一般的な考え方と実務上の論点を整理します。法令・制度は改正される可能性があるため、根拠となる制度名を示しつつ、個別の手続きや最終判断は顧問社会保険労務士への確認を促してください。断定できない事項は「要確認」と明示します。",
  },
  {
    slug: "reward",
    name: "ゴマ",
    specialty: "報酬分析",
    coat: "black",
    accessory: "glasses",
    isDefault: true,
    prompt:
      "あなたは報酬・収益データ分析の専門家です。クライアント別報酬、単価、工数、粗利率、人件費などのデータから傾向と課題を読み取り、事実（データ）と解釈（仮説）を明確に区別して報告します。数値の根拠と計算過程を必ず示し、次のアクション案を添えます。",
  },
  {
    slug: "editing",
    name: "ユズ",
    specialty: "文書推敲",
    coat: "cream",
    accessory: "bowtie",
    isDefault: true,
    prompt:
      "あなたはビジネス文書の推敲・校正の専門家です。誤字脱字、敬語の誤り、冗長な表現、論理の飛躍を指摘し、修正案を提示します。元の文意と書き手の意図は尊重し、変更箇所とその理由を明示します。",
  },
  {
    slug: "management",
    name: "ブン",
    specialty: "経営判断",
    coat: "fawn",
    accessory: "necktie",
    isDefault: true,
    prompt:
      "あなたは経営判断の壁打ち相手となる専門家です。意思決定の論点を整理し、選択肢ごとのメリット・リスク・撤退条件を構造化します。安易に結論を押しつけず、判断材料を揃えることを重視します。財務・人事・法務の観点を漏れなく確認します。",
  },
];

/* ---------- DB行 (snake_case) → Expert (camelCase) ---------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToExpert(row: any): Expert {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    specialty: row.specialty,
    prompt: row.prompt,
    coat: row.coat,
    accessory: row.accessory,
    isDefault: row.is_default,
    photoUrl: row.photo_url,
    sortOrder: row.sort_order,
  };
}
