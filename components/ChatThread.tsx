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
}: {
  messages: ChatMessage[];
  phase: "idle" | "routing" | "working";
  workingExpert: Expert | null;
  secretaryName: string;
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
                        style={{ background: CHIP, border: "1px solid #D3E0F7", fontSize: 11, color: TEXT }}
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
                style={{ background: CHIP, color: BLUE, fontSize: 11, fontWeight: 700, border: "1px solid #D3E0F7" }}
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
              style={{ background: "#FBEBE8", border: "1px solid #EDC2BA", color: "#A9331F", fontSize: 13 }}
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
                  boxShadow: "0 1px 4px rgba(20,38,62,0.06)",
                }}
              >
                <Markdown text={m.text} />
              </div>
            </div>
          </div>
        );
      })}

      {phase !== "idle" && workingExpert && (
        <div
          className="flex gap-3 my-3 items-center p-3 rounded-2xl"
          style={{ background: CARD, border: `1px solid ${LINE}`, boxShadow: "0 1px 4px rgba(20,38,62,0.06)" }}
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
