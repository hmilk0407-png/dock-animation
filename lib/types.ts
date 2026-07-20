/* ---------- BUHI WORKS 共有型定義 ---------- */

export type Coat =
  | "white"
  | "cream"
  | "fawn"
  | "bluegray"
  | "brindle"
  | "choco"
  | "black";

export type Accessory =
  | "glasses"
  | "ribbon"
  | "bowtie"
  | "necktie"
  | "beret"
  | "scarf"
  | "none";

/** 専門家 (UI用 camelCase) */
export interface Expert {
  /** DB上のuuid。デフォルト定義から生成する時点では未確定 */
  id?: string;
  /** ルーティング・履歴・写真の紐付けに使う安定キー */
  slug: string;
  name: string;
  specialty: string;
  prompt: string;
  coat: Coat;
  accessory: Accessory;
  isDefault: boolean;
  /** Supabase Storage の公開URL (ユーザー設定写真) */
  photoUrl?: string | null;
  sortOrder?: number;
}

/** チャット添付ファイル */
export interface Attachment {
  id: string;
  name: string;
  kind: "text" | "image" | "pdf";
  text?: string;
  b64?: string;
  media?: string;
  /** Supabase Storage の公開URL (アップロード完了後に設定) */
  url?: string;
}

/** チャットメッセージ (セッション内) */
export type ChatMessage =
  | { role: "user"; text: string; attachments: Attachment[] }
  | { role: "route"; expert: Expert; note: string }
  | { role: "assistant"; expert: Expert; text: string }
  | { role: "error"; text: string };

/** 依頼履歴 (DBの requests 行。snake_caseのまま扱う) */
export interface HistoryEntry {
  id: string;
  expert_slug: string;
  expert_name: string;
  specialty: string;
  request_text: string;
  attachments: string[];
  response_preview: string | null;
  artifact_url: string | null;
  status: "waiting" | "done" | "error";
  requested_at: string;
}

/** Anthropic Messages API のコンテンツブロック (クライアント→サーバー) */
export type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    }
  | {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
    }
  | { type: "image"; source: { type: "url"; url: string } }
  | { type: "document"; source: { type: "url"; url: string } };

export interface PlainTurn {
  role: "user" | "assistant";
  content: string;
}
