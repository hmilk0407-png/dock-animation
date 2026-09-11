/**
 * 添付ファイル (Supabase Storage, bucket: attachments) の共通ヘルパー
 *
 * - バケットは private。閲覧・Claude への送信時にその場で署名URLを発行する
 * - 保存パスは `${userId}/${uuid}/${asciiName}` (ポリシーで自分のフォルダのみ読み書き可)
 * - requests.attachments には {path, name} を保存。旧データ (公開URL文字列) も読める
 */
import { createClient } from "@/lib/supabase/client";
import type { StoredAttachment } from "@/lib/types";

export const ATTACH_BUCKET = "attachments";
/** 署名URLの有効期間 (秒)。Claude 側の取得と履歴からの閲覧に十分な長さ */
export const SIGNED_URL_TTL = 10 * 60;

/** Storage のキーは ASCII 英数字・-_. 以外を受け付けないため、元名から安全なキー名を作る */
export function safeStorageName(originalName: string): string {
  const ext = (originalName.match(/\.([A-Za-z0-9]{1,8})$/)?.[1] || "bin").toLowerCase();
  const base =
    originalName
      .replace(/\.[^.]*$/, "")
      .replace(/[^A-Za-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "file";
  return `${base}.${ext}`;
}

export function isPublicUrl(ref: string): boolean {
  return /^https?:\/\//.test(ref);
}

/** 保存形式 → 参照 (Storage パス、または旧データの公開URL) */
export function attachRef(a: StoredAttachment): string {
  return typeof a === "string" ? a : a.path;
}

/** 保存形式 → 人間可読な名前 */
export function attachName(a: StoredAttachment): string {
  if (typeof a !== "string") return a.name;
  try {
    return decodeURIComponent(a.split("/").pop() || a);
  } catch {
    return a;
  }
}

export function kindFromName(n: string): "image" | "pdf" | "text" {
  const ext = (n.toLowerCase().split(".").pop() || "").trim();
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "text";
}

/**
 * 参照から実際に取得できるURLを得る。
 * Storage パスなら署名URLを発行 (自分のファイルのみ成功)。旧公開URLはそのまま返す。
 */
export async function resolveAttachUrl(
  ref: string,
  expiresSec: number = SIGNED_URL_TTL
): Promise<string> {
  if (isPublicUrl(ref)) return ref;
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(ATTACH_BUCKET)
    .createSignedUrl(ref, expiresSec);
  if (error || !data?.signedUrl) {
    throw new Error(`添付の署名URL発行に失敗しました: ${error?.message || ""}`);
  }
  return data.signedUrl;
}

/** 別タブで開く (署名URLを発行してから) */
export async function openAttachment(ref: string): Promise<void> {
  const url = await resolveAttachUrl(ref, 60);
  window.open(url, "_blank", "noopener,noreferrer");
}
