"use client";
import { motion } from "framer-motion";
import Avatar from "./avatars/Avatar";
import Markdown from "./Markdown";
import { attIcon } from "@/lib/files";
import { BLUE, CARD, CHIP, LINE, MARU, MUTED, TEXT } from "@/lib/theme";
import type { ChatMessage, Expert } from "@/lib/types";

const pop = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1 },
  transition: { type: "spring", stiffness: 380, damping: 20 },
} as const;

/* ---------- チャット本文 (v3のメッセージ描画を移植) ---------- */
export default function ChatThread({
  messages,
  phase,
  workingExpert,
  secretaryName,
  onExportDoc,
  docBusyIndex = null,
  indexOffset = 0,
}: {
  messages: ChatMessage[];
  phase: "idle" | "routing" | "working";
  workingExpert: Expert | null;
  secretaryName: string;
  /** 回答の「Googleドキュメントに出力」。引数は ChatPanel 全体でのメッセージ index */
  onExportDoc?: (index: number) => void;
  /** 出力処理中のメッセージ index (ボタンを無効化する) */
  docBusyIndex?: number | null;
  /** messages が全体の一部 (fresh) のとき、全体 index に直すためのオフセット */
  indexOffset?: number;
}) {
  return (
    <>
      {messages.map((m, i) => {
        if (m.role === "user")
          return (
            <div key={i} className="flex justify-end my-3">
              <div className="max-w-[85%] flex flex-col items-end">
                {m.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1 justify-end">
                    {m.attachments.map((a) => (
                      <span
                        key={a.id}
                        className="px-2 py-1 rounded-full"
                        style={{ background: CHIP, border: "1px solid #3A4E75", fontSize: 11, color: TEXT }}
                      >
                        {attIcon(a)} {a.name}
                      </span>
                    ))}
                  </div>
                )}
                {m.text && (
                  <div
                    className="px-4 py-3 rounded-2xl"
                    style={{
                      background: BLUE,
                      color: "#FFF",
                      fontSize: 14,
                      lineHeight: 1.75,
                      whiteSpace: "pre-wrap",
                      borderBottomRightRadius: 4,
                      boxShadow: "0 1px 4px rgba(46,95,216,0.25)",
                    }}
                  >
                    {m.text}
                  </div>
                )}
              </div>
            </div>
          );

        if (m.role === "route")
          return (
            <div key={i} className="flex justify-center my-2">
              <div
                className="px-3 py-1 rounded-full flex items-center gap-1"
                style={{ background: CHIP, color: BLUE, fontSize: 11, fontWeight: 700, border: "1px solid #3A4E75" }}
              >
                {[0, 0.15, 0.3].map((d) => (
                  <motion.span
                    key={d}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: d, duration: 0.4 }}
                  >
                    🐾
                  </motion.span>
                ))}
                <span style={{ marginLeft: 2 }}>
                  担当: {m.expert.name}（{m.expert.specialty}）{m.note ? ` ─ ${m.note}` : ""}
                </span>
              </div>
            </div>
          );

        if (m.role === "error")
          return (
            <div
              key={i}
              className="my-3 px-4 py-3 rounded-xl"
              style={{ background: "#3A2A2C", border: "1px solid #6B3B3B", color: "#FFB4AE", fontSize: 13 }}
            >
              {m.text}
            </div>
          );

        return (
          <div key={i} className="flex gap-2 my-3 items-start">
            <motion.div {...pop} className="flex-shrink-0">
              <Avatar expert={m.expert} size={40} />
            </motion.div>
            <div className="max-w-[85%]">
              <div style={{ fontSize: 11, fontWeight: 900, color: BLUE, marginBottom: 2, fontFamily: MARU }}>
                {m.expert.name}・{m.expert.specialty}
              </div>
              <div
                className="px-4 py-3 rounded-2xl"
                style={{
                  background: CARD,
                  border: `1px solid ${LINE}`,
                  fontSize: 14,
                  lineHeight: 1.8,
                  borderTopLeftRadius: 4,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                }}
              >
                <Markdown text={m.text} />
              </div>
              {onExportDoc && (
                <div className="flex gap-2 mt-1" style={{ fontSize: 11 }}>
                  {m.docUrl ? (
                    <a
                      href={m.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded-full"
                      style={{ background: CHIP, border: "1px solid #3A4E75", color: BLUE, textDecoration: "none", fontWeight: 700 }}
                      data-testid="gdoc-link"
                    >
                      📄 ドキュメントを開く
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onExportDoc(i + indexOffset)}
                      disabled={docBusyIndex !== null}
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        background: "transparent",
                        border: `1px solid ${LINE}`,
                        color: docBusyIndex === i + indexOffset ? MUTED : TEXT,
                        cursor: docBusyIndex !== null ? "wait" : "pointer",
                        opacity: docBusyIndex !== null && docBusyIndex !== i + indexOffset ? 0.5 : 1,
                      }}
                      data-testid="gdoc-export"
                    >
                      {docBusyIndex === i + indexOffset ? "📄 作成中…" : "📄 Googleドキュメントに出力"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {phase !== "idle" && workingExpert && (
        <div
          className="flex gap-3 my-3 items-center p-3 rounded-2xl"
          style={{ background: CARD, border: `1px solid ${LINE}`, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}
        >
          <motion.div {...pop} className="flex-shrink-0">
            <Avatar expert={workingExpert} size={76} working />
          </motion.div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: TEXT, fontFamily: MARU }}>
              {phase === "routing" ? `${secretaryName}が担当を選定中` : `${workingExpert.name}が作業中`}
              <span className="buhi-dot" />
              <span className="buhi-dot" style={{ animationDelay: "0.15s" }} />
              <span className="buhi-dot" style={{ animationDelay: "0.3s" }} />
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
              {phase === "routing"
                ? "依頼内容と添付を確認しています"
                : `${workingExpert.specialty}の指示書に沿って対応しています`}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
