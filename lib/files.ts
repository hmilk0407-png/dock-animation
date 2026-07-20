/* ---------- ファイル読み込みヘルパー (ブラウザ専用 / v3移植) ---------- */
import type { Attachment } from "./types";

export const MAX_TEXT = 60000;

export function clip(s: string): string {
  const t = String(s || "").trim();
  if (t.length <= MAX_TEXT) return t;
  return t.slice(0, MAX_TEXT) + "\n…(以降は長いため省略されました)";
}

export function readAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("ファイルを読み込めませんでした"));
    r.readAsText(file);
  });
}

export function toB64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = () => rej(new Error("ファイルを読み込めませんでした"));
    r.readAsDataURL(file);
  });
}

/* 写真を正方形クロップ+縮小してdataURL化 (内蔵写真と同じフレーミング) */
export function compressPhoto(file: File, px = 320): Promise<string> {
  return new Promise((res, rej) => {
    if (file.size > 10 * 1024 * 1024) {
      rej(new Error("写真は10MBまで対応しています"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.width;
        const h = img.height;
        const side = Math.min(w, h);
        const crop = Math.round(side * 0.74);
        const sx = Math.round((w - crop) / 2);
        const sy = Math.max(0, Math.round((h - side) / 2 + side * 0.04));
        const canvas = document.createElement("canvas");
        canvas.width = px;
        canvas.height = px;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, sx, sy, crop, crop, 0, 0, px, px);
        URL.revokeObjectURL(url);
        res(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        URL.revokeObjectURL(url);
        rej(new Error("写真を変換できませんでした"));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("画像として読み込めませんでした"));
    };
    img.src = url;
  });
}

export function attIcon(a: Attachment): string {
  if (a.kind === "image") return "🖼️";
  if (/\.(xlsx|xls|xlsm|csv|tsv)$/i.test(a.name)) return "📊";
  return "📄";
}

/* 1ファイルをAttachmentに変換 (docx/xlsxは動的importでバンドルを軽量化) */
export async function fileToAttachment(file: File): Promise<Attachment> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const lower = file.name.toLowerCase();

  if (/\.(png|jpe?g|gif|webp)$/.test(lower)) {
    if (file.size > 3.5 * 1024 * 1024) throw new Error("画像は3.5MBまで対応しています");
    const b64 = await toB64(file);
    return { id, name: file.name, kind: "image", b64, media: file.type || "image/png" };
  }
  if (lower.endsWith(".pdf")) {
    if (file.size > 3.5 * 1024 * 1024) throw new Error("PDFは3.5MBまで対応しています");
    const b64 = await toB64(file);
    return { id, name: file.name, kind: "pdf", b64 };
  }
  if (lower.endsWith(".docx")) {
    const mammoth = (await import("mammoth")).default;
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return { id, name: file.name, kind: "text", text: clip(result.value) };
  }
  if (/\.(xlsx|xls|xlsm)$/.test(lower)) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const parts = wb.SheetNames.map(
      (sn) => `--- シート: ${sn} ---\n` + XLSX.utils.sheet_to_csv(wb.Sheets[sn])
    );
    return { id, name: file.name, kind: "text", text: clip(parts.join("\n\n")) };
  }
  if (lower.endsWith(".doc")) {
    throw new Error("旧形式(.doc)は非対応です。.docxで保存し直してください");
  }
  return { id, name: file.name, kind: "text", text: clip(await readAsText(file)) };
}

/* 添付合計サイズの概算 (Vercelボディ上限ガード) */
export function approxPayloadBytes(atts: Attachment[], text: string): number {
  return atts.reduce(
    (s, a) => s + (a.b64 ? Math.ceil(a.b64.length * 0.75) : a.text?.length || 0),
    text.length
  );
}
