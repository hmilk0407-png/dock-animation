"use client";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import Frenchie from "./avatars/Frenchie";
import { ACCESSORIES, BUILTIN_PHOTO_SLUGS, COATS } from "@/lib/experts";
import { compressPhoto, readAsText, toB64 } from "@/lib/files";
import { BLUE, CARD, CHIP, FIELD, LINE, MARU, MUTED, TEXT } from "@/lib/theme";
import type { Accessory, Coat, Expert } from "@/lib/types";

/* ---------- 専門家の採用・指示書編集モーダル ----------
   pendingPhoto: undefined=変更なし / null=写真削除(既定に戻す) / dataURL=新しい写真 */
export default function ExpertModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Expert;
  onClose: () => void;
  onSave: (expert: Expert, pendingPhoto: string | null | undefined) => Promise<void> | void;
}) {
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name || "");
  const [specialty, setSpecialty] = useState(initial?.specialty || "");
  const [prompt, setPrompt] = useState(initial?.prompt || "");
  const [coat, setCoat] = useState<Coat>(initial?.coat || "white");
  const [accessory, setAccessory] = useState<Accessory>(initial?.accessory || "glasses");
  const [pendingPhoto, setPendingPhoto] = useState<string | null | undefined>(undefined);
  const [fileBusy, setFileBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileStatus, setFileStatus] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const valid = Boolean(name.trim() && specialty.trim() && prompt.trim()) && !saving;

  const slug = initial?.slug || null;
  const builtin = slug && BUILTIN_PHOTO_SLUGS.has(slug) ? `/avatars/${slug}.jpg` : null;
  /* プレビューに使う写真の解決 */
  const previewSrc =
    pendingPhoto !== undefined
      ? pendingPhoto || builtin
      : initial?.photoUrl || builtin;
  /* 「写真を削除」は上書き設定された写真がある場合のみ */
  const hasOverride =
    pendingPhoto !== undefined ? Boolean(pendingPhoto) : Boolean(initial?.photoUrl);

  async function handlePhoto(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setPhotoStatus("写真を変換中…");
    try {
      const dataUrl = await compressPhoto(file);
      setPendingPhoto(dataUrl);
      setPhotoStatus("保存すると反映されます");
    } catch (err) {
      setPhotoStatus(`設定できませんでした: ${err instanceof Error ? err.message : ""}`);
    }
  }

  async function handleFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setFileBusy(true);
    setFileStatus(`「${file.name}」を読み込み中…`);
    try {
      const lower = file.name.toLowerCase();
      let text = "";

      if (lower.endsWith(".docx")) {
        const mammoth = (await import("mammoth")).default;
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        text = (result.value || "").trim();
      } else if (lower.endsWith(".pdf")) {
        if (file.size > 3.5 * 1024 * 1024) throw new Error("PDFは3.5MBまで対応しています");
        const b64 = await toB64(file);
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ b64 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "抽出に失敗しました");
        text = String(data.text || "").trim();
      } else if (lower.endsWith(".doc")) {
        throw new Error("旧形式(.doc)は非対応です。.docxで保存し直してください");
      } else {
        text = (await readAsText(file)).trim();
      }

      if (!text) throw new Error("テキストを取り出せませんでした");

      if (prompt.trim()) {
        const replace = window.confirm(
          "現在の指示書を置き換えますか？\nOK: 置き換える ／ キャンセル: 末尾に追加する"
        );
        setPrompt(replace ? text : prompt.trimEnd() + "\n\n" + text);
      } else {
        setPrompt(text);
      }
      setFileStatus(`「${file.name}」を読み込みました`);
    } catch (err) {
      setFileStatus(`読み込めませんでした: ${err instanceof Error ? err.message : ""}`);
    } finally {
      setFileBusy(false);
    }
  }

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave(
        {
          id: initial?.id,
          slug: initial?.slug || `custom-${Date.now()}`,
          name: name.trim(),
          specialty: specialty.trim(),
          prompt: prompt.trim(),
          coat,
          accessory,
          isDefault: initial?.isDefault || false,
          photoUrl: initial?.photoUrl ?? null,
          sortOrder: initial?.sortOrder,
        },
        pendingPhoto
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "保存に失敗しました");
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-end sm:items-center justify-center p-3"
      style={{ background: "rgba(20,38,62,0.45)", zIndex: 50 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 30, scale: 0.97, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-md rounded-2xl p-4 overflow-y-auto buhi-scroll"
        style={{
          background: CARD,
          border: `1px solid ${LINE}`,
          boxShadow: "0 12px 40px rgba(20,38,62,0.30)",
          maxHeight: "90vh",
          color: TEXT,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontSize: 17, fontWeight: 900, fontFamily: MARU }}>
            {isEdit ? `${initial!.name}の指示書` : "新しい専門家を採用"}
          </h2>
          <button onClick={onClose} aria-label="閉じる" style={{ fontSize: 20, fontWeight: 900, color: MUTED }}>
            ×
          </button>
        </div>

        {/* プロフィール + 写真設定 */}
        <div className="flex items-center gap-3 mb-3 p-3 rounded-xl" style={{ background: FIELD, border: `1.5px dashed ${BLUE}` }}>
          {previewSrc ? (
            <div style={{ width: 64, height: 64, borderRadius: "24%", overflow: "hidden", border: `1.5px solid ${LINE}`, background: "#EDEAE0", flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc} alt={name || "専門家"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} draggable={false} />
            </div>
          ) : (
            <Frenchie coat={coat} accessory={accessory} size={64} />
          )}
          <div className="flex-1">
            <div style={{ fontSize: 13, fontWeight: 900, fontFamily: MARU }}>{name || "なまえ"}</div>
            <div style={{ fontSize: 11, color: MUTED }}>{specialty || "専門分野"}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button
                onClick={() => photoRef.current?.click()}
                className="px-2 py-1 rounded-full"
                style={{ fontSize: 11, fontWeight: 700, color: BLUE, background: CHIP }}
              >
                📷 写真を設定
              </button>
              {hasOverride && (
                <button
                  onClick={() => {
                    setPendingPhoto(null);
                    setPhotoStatus("保存すると既定の画像に戻ります");
                  }}
                  className="px-2 py-1 rounded-full"
                  style={{ fontSize: 11, fontWeight: 700, color: "#A9331F", background: "#FBEBE8" }}
                >
                  写真を削除
                </button>
              )}
            </div>
            {photoStatus && (
              <div style={{ fontSize: 10, color: photoStatus.includes("できません") ? "#A9331F" : BLUE, fontWeight: 700, marginTop: 3 }}>
                {photoStatus}
              </div>
            )}
          </div>
          <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
        </div>
        <div style={{ fontSize: 10, color: MUTED, marginTop: -6, marginBottom: 10 }}>
          顔が中央にある正方形に近い写真がきれいに表示されます（あなたのアカウント専用データとしてクラウドに保存されます）
        </div>

        <label style={{ fontSize: 12, fontWeight: 900, color: BLUE }}>なまえ</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: コテツ"
          className="w-full px-3 py-2 rounded-lg mb-3 mt-1 outline-none"
          style={{ background: FIELD, border: `1px solid ${LINE}`, fontSize: 14, fontFamily: "inherit", color: TEXT }}
        />

        <label style={{ fontSize: 12, fontWeight: 900, color: BLUE }}>専門分野</label>
        <input
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          placeholder="例: 契約書レビュー"
          className="w-full px-3 py-2 rounded-lg mb-3 mt-1 outline-none"
          style={{ background: FIELD, border: `1px solid ${LINE}`, fontSize: 14, fontFamily: "inherit", color: TEXT }}
        />

        <div className="flex items-center justify-between mt-1">
          <label style={{ fontSize: 12, fontWeight: 900, color: BLUE }}>指示書（この専門家への仕事の指示）</label>
          <button
            onClick={() => !fileBusy && fileRef.current?.click()}
            disabled={fileBusy}
            className="px-2 py-1 rounded-full"
            style={{ fontSize: 11, fontWeight: 700, color: fileBusy ? MUTED : BLUE, background: CHIP }}
          >
            {fileBusy ? "読み込み中…" : "📎 ファイルから読み込む"}
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.docx,.pdf" onChange={handleFile} style={{ display: "none" }} />
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例: あなたは契約書レビューの専門家です。業務委託契約書を確認し、リスク条項と修正案を…"
          rows={4}
          className="w-full px-3 py-2 rounded-lg mt-1 outline-none resize-none"
          style={{ background: FIELD, border: `1px solid ${LINE}`, fontSize: 13, fontFamily: "inherit", lineHeight: 1.7, color: TEXT }}
        />
        {fileStatus && (
          <div style={{ fontSize: 11, color: fileStatus.includes("読み込めません") ? "#A9331F" : BLUE, fontWeight: 700, marginTop: 2 }}>
            {fileStatus}
          </div>
        )}
        <div style={{ fontSize: 10, color: MUTED, marginTop: 2, marginBottom: 10 }}>
          対応形式: .txt / .md / .docx / .pdf（PDFはAIで本文を抽出するため、長い文書は途中までになる場合があります）
        </div>

        <label style={{ fontSize: 12, fontWeight: 900, color: BLUE }}>毛色（写真がない場合のイラスト用）</label>
        <div className="flex gap-2 flex-wrap my-2">
          {(Object.keys(COATS) as Coat[]).map((key) => (
            <button
              key={key}
              onClick={() => setCoat(key)}
              aria-label={COATS[key].label}
              className="rounded-full"
              style={{
                width: 34,
                height: 34,
                background: COATS[key].base,
                border: coat === key ? `3px solid ${BLUE}` : `1.5px solid ${LINE}`,
              }}
            />
          ))}
        </div>

        <label style={{ fontSize: 12, fontWeight: 900, color: BLUE }}>アクセサリー</label>
        <div className="flex gap-2 flex-wrap my-2">
          {(Object.keys(ACCESSORIES) as Accessory[]).map((key) => (
            <button
              key={key}
              onClick={() => setAccessory(key)}
              className="px-3 py-1 rounded-full"
              style={{
                fontSize: 12,
                fontWeight: 700,
                background: accessory === key ? BLUE : FIELD,
                color: accessory === key ? "#FFF" : TEXT,
                border: `1px solid ${accessory === key ? BLUE : LINE}`,
              }}
            >
              {ACCESSORIES[key]}
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={!valid}
          className="w-full py-3 rounded-lg mt-2"
          style={{
            background: valid ? BLUE : "#D6D9E0",
            color: valid ? "#FFF" : "#8B94A6",
            fontWeight: 900,
            fontSize: 15,
            boxShadow: valid ? "0 2px 10px rgba(46,95,216,0.30)" : "none",
          }}
        >
          {saving ? "保存中…" : isEdit ? "指示書を保存する" : "チームに迎える"}
        </button>
      </motion.div>
    </motion.div>
  );
}
