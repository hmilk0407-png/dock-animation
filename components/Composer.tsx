"use client";
import { forwardRef, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { attIcon } from "@/lib/files";
import { BG } from "@/lib/theme";
import type { Attachment } from "@/lib/types";

/* Header / Dock と揃えた近未来配色 */
const BASE_1 = "#0E1B3E";
const BASE_3 = "#0A1230";
const ICE = "#F2F6FF";
const GLOW = "#7FA8FF";

/* ---------- 受付カウンター (入力欄) ----------
   文字量に応じて自動で高さが広がる (min 80px / 上限なし)。Cmd/Ctrl+Enterで送信。 */
const Composer = forwardRef<
  HTMLTextAreaElement,
  {
    input: string;
    setInput: (v: string) => void;
    attachments: Attachment[];
    removeAttachment: (id: string) => void;
    attBusy: number;
    onPickFiles: (files: FileList | null) => void;
    onSend: () => void;
    sendDisabled: boolean;
    /** 添付メタ情報の通知 (HistoryPanelの「添付あり」アイコン用) */
    onAttachMeta?: (meta: { count: number; names: string[]; kinds: string[] }) => void;
  }
>(function Composer(
  {
    input,
    setInput,
    attachments,
    removeAttachment,
    attBusy,
    onPickFiles,
    onSend,
    sendDisabled,
    onAttachMeta,
  },
  taRef
) {
  const attRef = useRef<HTMLInputElement>(null);
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  /* 入力欄の自動リサイズ: 文字量に合わせて高さを再計算 */
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(80, el.scrollHeight) + "px";
  }, [input]);

  /* 添付処理中は送信を抑止 (InputBarと同じ挙動) */
  const disabled = sendDisabled || attBusy > 0;

  /* 添付メタ情報を親(OfficeApp)へ通知 */
  useEffect(() => {
    onAttachMeta?.({
      count: attachments.length,
      names: attachments.map((a) => a.name),
      kinds: attachments.map((a) => a.kind),
    });
  }, [attachments]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <footer className="p-3 flex-shrink-0" style={{ background: BG }}>
      <div className="mx-auto w-full" style={{ maxWidth: 760 }}>
        <div
          className="flex flex-col p-2 rounded-2xl"
          style={{
            background: `linear-gradient(160deg, ${BASE_1} 0%, ${BASE_3} 100%)`,
            border: "1px solid rgba(127,168,255,0.35)",
            boxShadow: "0 4px 18px rgba(4,10,28,0.35), 0 0 0 1px rgba(46,95,216,0.15)",
          }}
        >
          {(attachments.length > 0 || attBusy > 0) && (
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              <AnimatePresence initial={false}>
                {attachments.map((a) => (
                  <motion.span
                    key={a.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                    style={{
                      background: "rgba(46,95,216,0.18)",
                      border: "1px solid rgba(127,168,255,0.45)",
                      fontSize: 11,
                      color: ICE,
                    }}
                  >
                    {a.kind === "image" && a.b64 ? (
                      <img
                        src={`data:${a.media || "image/png"};base64,${a.b64}`}
                        alt=""
                        style={{
                          width: 26,
                          height: 26,
                          objectFit: "cover",
                          borderRadius: 6,
                          border: "1px solid rgba(127,168,255,0.5)",
                        }}
                      />
                    ) : (
                      <span aria-hidden>{attIcon(a)}</span>
                    )}
                    {a.name.length > 22 ? a.name.slice(0, 20) + "…" : a.name}
                    <button
                      onClick={() => removeAttachment(a.id)}
                      aria-label={`${a.name}を外す`}
                      style={{
                        color: "rgba(242,246,255,0.7)",
                        fontWeight: 900,
                        fontSize: 12,
                        marginLeft: 2,
                      }}
                    >
                      ×
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
              {attBusy > 0 && (
                <span
                  className="flex items-center px-2 py-1 rounded-full"
                  style={{
                    background: "rgba(46,95,216,0.20)",
                    border: "1px solid rgba(127,168,255,0.4)",
                  }}
                >
                  <span className="buhi-dot" />
                  <span className="buhi-dot" style={{ animationDelay: "0.15s" }} />
                  <span className="buhi-dot" style={{ animationDelay: "0.3s" }} />
                  <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, color: GLOW }}>
                    ミルクが確認中
                  </span>
                </span>
              )}
            </div>
          )}
          <div className="flex items-end gap-2">
            <motion.button
              whileHover={{ boxShadow: "0 0 16px rgba(46,95,216,0.55)" }}
              onClick={() => attRef.current?.click()}
              aria-label="ファイルを添付"
              className="rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                width: 38,
                height: 38,
                background: "rgba(46,95,216,0.20)",
                border: "1px solid rgba(127,168,255,0.5)",
                fontSize: 16,
              }}
            >
              📎
            </motion.button>
            <input
              ref={attRef}
              type="file"
              multiple
              accept=".txt,.md,.markdown,.csv,.tsv,.docx,.xlsx,.xls,.xlsm,.pdf,.png,.jpg,.jpeg,.gif,.webp"
              onChange={(e) => {
                onPickFiles(e.target.files);
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />
            <textarea
              ref={(el) => {
                innerRef.current = el;
                if (typeof taRef === "function") taRef(el);
                else if (taRef) taRef.current = el;
              }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !disabled) onSend();
              }}
              placeholder="依頼内容を入力（📎でデータや資料を添付できます）"
              rows={1}
              className="flex-1 resize-none outline-none px-2 py-2 placeholder:text-[#8FA7DA]"
              style={{
                fontSize: 14,
                background: "transparent",
                fontFamily: "inherit",
                color: ICE,
                caretColor: GLOW,
                lineHeight: 1.7,
                minHeight: 80,
                overflow: "hidden",
              }}
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{
                boxShadow:
                  "0 6px 22px rgba(46,95,216,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
              onClick={onSend}
              disabled={disabled}
              className="px-4 py-2 rounded-lg flex-shrink-0"
              style={{
                background: disabled
                  ? "rgba(214,217,224,0.18)"
                  : "linear-gradient(180deg, rgba(46,95,216,0.95), rgba(27,68,156,0.95))",
                color: disabled ? "rgba(242,246,255,0.45)" : ICE,
                border: "1px solid rgba(127,168,255,0.55)",
                fontWeight: 700,
                fontSize: 14,
                boxShadow: disabled
                  ? "none"
                  : "0 4px 16px rgba(46,95,216,0.4), inset 0 1px 0 rgba(255,255,255,0.22)",
              }}
            >
              依頼
            </motion.button>
          </div>
        </div>
      </div>
    </footer>
  );
});

export default Composer;
