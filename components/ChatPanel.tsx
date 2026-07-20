"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import ChatThread from "./ChatThread";
import Composer from "./Composer";
import Avatar from "./avatars/Avatar";
import { fileToAttachment } from "@/lib/files";
import { createClient } from "@/lib/supabase/client";
import { SECRETARY_SLUG } from "@/lib/experts";
import { BG, MARU, MUTED } from "@/lib/theme";
import type { Attachment, ChatMessage, Expert } from "@/lib/types";
import type { DockEvent } from "@/lib/dock/DockState";

/* ============================================================
   ChatPanel — チャット画面 (添付なしの軽量版)
   - 入力欄は InputBar を統合 (自動リサイズ / 送信 / 入力中ドット)
   - 回答表示は ChatThread を内包
   - busy 状態を内部で管理し、InputBar(busyドット) と
     ChatThread(作業中インジケータ) の両方に渡す
   - 依頼テキストは onSend(text) で OfficeApp 側へ委譲する:
       OfficeApp が /api/assign → /api/answer → 履歴保存を実行し、
       ChatSendResult { expert, note, answer } を resolve して返す。
       reject(throw) された場合はエラー吹き出しを表示する
   - 最新の回答は Framer Motion でフェードイン (opacity 0→1 / y 10→0)
   - 添付が必要な画面は既存の Composer 構成をそのまま使用する
   ============================================================ */

/** OfficeApp 側の onSend が resolve すべき結果 */
export type ChatSendResult = {
  /** 担当した専門家 */
  expert: Expert;
  /** ルーティングの一言 (受付ミルクのコメント。省略可) */
  note?: string;
  /** 回答本文 (Markdown) */
  answer: string;
};

export default function ChatPanel({
  experts,
  onSend,
  onAttachMeta,
  onDockEvent,
  reuseText = null,
  className = "flex flex-col h-full min-h-0",
}: {
  /** 専門家名簿 (受付 secretary の表示・空状態あいさつに使用) */
  experts: Expert[];
  /** 依頼の実行を OfficeApp 側へ委譲するハンドラ (添付を同送) */
  onSend: (text: string, attachments: Attachment[]) => Promise<ChatSendResult>;
  /** Composer → OfficeApp の添付メタ通知の中継 (OfficeAppのhandleAttachMetaを渡す) */
  onAttachMeta?: (meta: { count: number; names: string[]; kinds: string[] }) => void;
  /** 入力イベントを Dock(ミルク状態機械) へ通知する trigger */
  onDockEvent?: (event: DockEvent) => void;
  /** 履歴↺再依頼: ts が変わるたび text を InputBar に流し込みフォーカスする */
  reuseText?: { text: string; ts: number } | null;
  /** 外枠のクラス (省略時は親いっぱいの縦フレックス) */
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attBusy, setAttBusy] = useState(0);

  const supabase = useMemo(() => createClient(), []);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const secretary =
    experts.find((e) => e.slug === SECRETARY_SLUG) || experts[0] || null;
  const secretaryName = secretary?.name || "ミルク";

  /* 新着メッセージ・busy変化で最下部へ自動スクロール */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  /* 履歴↺再依頼: InputBar へ流し込んでフォーカス */
  useEffect(() => {
    if (!reuseText) return;
    setInput(reuseText.text);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [reuseText?.ts]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- 入力イベント: input:start / (1.1s無操作で) input:stop ---------- */
  function handleInputChange(v: string) {
    setInput(v);
    onDockEvent?.({ type: "input:start" });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(
      () => onDockEvent?.({ type: "input:stop" }),
      1100
    );
  }

  /* ---------- 添付ファイルの取り込み: 変換 + Storageアップロード ---------- */
  async function addFiles(fileList: FileList | null) {
    const files = Array.from(fileList || []);
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        setMessages((m) => [
          ...m,
          { role: "error", text: `「${file.name}」は20MBを超えるため添付できません。` },
        ]);
        continue;
      }
      setAttBusy((n) => n + 1);
      try {
        /* プレビュー・テキスト抽出用に従来通り変換 (画像サムネイルはb64を使用) */
        const att = await fileToAttachment(file);
        /* Storageへ保存: `${uuid}/${originalName}` (bucket: attachments) */
        const path = `${crypto.randomUUID()}/${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("attachments")
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("attachments").getPublicUrl(path);
        att.url = pub.publicUrl;
        setAttachments((a) => [...a, att]);
      } catch (err) {
        setMessages((m) => [
          ...m,
          {
            role: "error",
            text: `「${file.name}」を添付できませんでした: ${err instanceof Error ? err.message : ""}`,
          },
        ]);
      } finally {
        setAttBusy((n) => n - 1);
      }
    }
  }

  /* ---------- 添付の取り外し: Storageからも best-effort で削除 ---------- */
  function removeAttachment(id: string) {
    const target = attachments.find((a) => a.id === id);
    setAttachments((a) => a.filter((x) => x.id !== id));
    if (target?.url) {
      const path = target.url.split("/attachments/")[1];
      if (path) void supabase.storage.from("attachments").remove([decodeURIComponent(path)]);
    }
  }

  /* ---------- 送信: Composer から受け取り OfficeApp へ渡す (添付同送) ---------- */
  async function handleSend() {
    const text = input.trim();
    const atts = attachments;
    if ((!text && atts.length === 0) || busy || attBusy > 0) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    setInput("");
    setAttachments([]);
    setMessages((m) => [...m, { role: "user", text, attachments: atts }]);
    setBusy(true);
    try {
      const result = await onSend(text, atts);
      setMessages((m) => [
        ...m,
        { role: "route", expert: result.expert, note: result.note || "" },
        { role: "assistant", expert: result.expert, text: result.answer },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "error",
          text: `通信に失敗しました: ${err instanceof Error ? err.message : ""}。もう一度お試しください。`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  /* ---------- 回答フェードイン用の分割 ----------
     末尾が assistant のとき、その1件だけを motion.div 側で描画して
     フェードイン (0.45s easeOut) させる。次のメッセージが来たら
     安定側の ChatThread に合流する */
  const lastIsAnswer =
    messages.length > 0 && messages[messages.length - 1].role === "assistant";
  const stable = lastIsAnswer ? messages.slice(0, -1) : messages;
  const fresh = lastIsAnswer ? messages.slice(-1) : [];

  return (
    <div className={className}>
      {/* 回答表示エリア */}
      <main
        className="flex-1 overflow-y-auto px-4 py-4 buhi-scroll"
        style={{
          background: BG,
          backgroundImage: "radial-gradient(#E5E1D4 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto w-full" style={{ maxWidth: 760 }}>
          {/* 空状態: 受付の一言 */}
          {messages.length === 0 && !busy && secretary && (
            <div className="flex items-center gap-3 mt-6">
              <Avatar expert={secretary} size={46} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, fontFamily: MARU }}>
                  {secretaryName}
                </div>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
                  ご依頼内容をどうぞ。内容を拝見して、最適な専門家におつなぎします。
                </div>
              </div>
            </div>
          )}

          {/* 確定済みメッセージ */}
          <ChatThread
            messages={stable}
            phase={busy ? "routing" : "idle"}
            workingExpert={busy ? secretary : null}
            secretaryName={secretaryName}
          />

          {/* 最新の回答: Framer Motion でフェードイン */}
          {fresh.length > 0 && (
            <motion.div
              key={`answer-${messages.length}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <ChatThread
                messages={fresh}
                phase="idle"
                workingExpert={null}
                secretaryName={secretaryName}
              />
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* 入力欄: Composer (添付対応) — マウント時フェードイン */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex-shrink-0"
      >
        <Composer
          ref={inputRef}
          input={input}
          setInput={handleInputChange}
          attachments={attachments}
          removeAttachment={removeAttachment}
          attBusy={attBusy}
          onPickFiles={addFiles}
          onSend={handleSend}
          sendDisabled={
            busy || attBusy > 0 || (!input.trim() && attachments.length === 0)
          }
          onAttachMeta={onAttachMeta}
        />
      </motion.div>
    </div>
  );
}
