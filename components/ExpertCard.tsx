"use client";

import { AnimatePresence, motion } from "framer-motion";
import Avatar from "./avatars/Avatar";
import { BLUE, CARD, CHIP, LINE, MARU, MUTED, TEXT, WOOD } from "@/lib/theme";
import type { Expert } from "@/lib/types";

/* ============================================================
   ExpertCard — ドックに並ぶ専門家カード
   - 縮小(通常): アバター + 名前だけの省スペース表示
   - 展開(指名中): 専門分野・「指名中」チップ・✎指示書ボタンを表示
   - 切替は Framer Motion の layout アニメーションで滑らかに変形
   - クリック / Enter / Space = 担当の指名・解除 (onSelect)
   ============================================================ */

export default function ExpertCard({
  expert,
  selected = false,
  working = false,
  entered = true,
  enterDelay = 0,
  ackTs = null,
  onSelect,
  onOpen,
  onRemove,
}: {
  expert: Expert;
  /** 指名中 (trueで展開表示) */
  selected?: boolean;
  /** 作業中 (光輪 + アバターのタイピング演出) */
  working?: boolean;
  /** オフィスモードに入場済みか (スタッガー入場の制御) */
  entered?: boolean;
  /** 入場スタッガーの遅延秒 */
  enterDelay?: number;
  /** 再依頼アックのタイムスタンプ (値が変わると一跳ねする) */
  ackTs?: number | null;
  /** カード本体クリック = 指名/解除 */
  onSelect?: (e: Expert) => void;
  /** 展開中の「✎ 指示書」ボタン */
  onOpen?: (e: Expert) => void;
  /** 右上の×ボタン (未指定なら非表示 / デフォルト専門家は渡さない) */
  onRemove?: (e: Expert) => void;
}) {
  const ariaLabel = selected
    ? `${expert.name}の指名を解除`
    : `${expert.name}（${expert.specialty}）を担当に指名`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: entered ? enterDelay : 0,
        type: "spring",
        stiffness: 300,
        damping: 24,
      }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.96 }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={ariaLabel}
      title={`${expert.name}・${expert.specialty}`}
      onClick={() => onSelect?.(expert)}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          onSelect?.(expert);
        }
      }}
      className={`relative flex flex-col items-center rounded-xl flex-shrink-0 ${
        working ? "desk-active" : ""
      }`}
      style={{
        cursor: "pointer",
        overflow: "hidden",
        minWidth: selected ? 132 : 62,
        maxWidth: selected ? 172 : undefined,
        padding: selected ? "8px 10px 10px" : "6px 8px 8px",
        background: selected || working ? CHIP : "transparent",
        border: `1.5px solid ${selected || working ? BLUE : "transparent"}`,
      }}
    >
      {/* 再依頼「了解です」の一跳ね (ackTsが変わるたびに再生) */}
      <motion.div
        layout
        key={ackTs ? `ack-${ackTs}` : "idle"}
        animate={
          ackTs
            ? { y: [0, -6, 0, -2, 0], scale: [1, 1.08, 0.97, 1.02, 1] }
            : { y: 0, scale: 1 }
        }
        transition={{ duration: 0.55, ease: [0.34, 1.3, 0.64, 1] }}
      >
        <Avatar expert={expert} size={selected ? 46 : 40} working={working} />
      </motion.div>

      {/* 名前 */}
      <motion.div
        layout
        style={{
          fontSize: selected ? 11 : 10,
          fontWeight: 900,
          marginTop: 4,
          fontFamily: MARU,
          color: selected || working ? BLUE : TEXT,
          whiteSpace: "nowrap",
        }}
      >
        {expert.name}
      </motion.div>

      {/* 展開部 (指名中のみ): 専門分野 + アクション */}
      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            layout
            key="detail"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col items-center"
            style={{ marginTop: 3 }}
          >
            <div
              style={{
                fontSize: 9.5,
                color: MUTED,
                textAlign: "center",
                lineHeight: 1.5,
                maxWidth: 150,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {expert.specialty}
            </div>
            <div className="flex items-center gap-1.5" style={{ marginTop: 6 }}>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 900,
                  color: "#FFFFFF",
                  background: BLUE,
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontFamily: MARU,
                }}
              >
                指名中
              </span>
              {onOpen && (
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onOpen(expert);
                  }}
                  aria-label={`${expert.name}の指示書を開く`}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: BLUE,
                    background: CARD,
                    border: `1px solid ${LINE}`,
                    borderRadius: 999,
                    padding: "2px 8px",
                  }}
                >
                  ✎ 指示書
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* デスクの木目(ミニ) */}
      <div
        style={{
          position: "absolute",
          left: 7,
          right: 7,
          bottom: 0,
          height: 2.5,
          background: `linear-gradient(90deg, ${WOOD}, #B08F63)`,
          opacity: 0.8,
          borderRadius: 2,
        }}
      />

      {/* 削除 (カスタム専門家のみ) */}
      {onRemove && (
        <button
          onClick={(ev) => {
            ev.stopPropagation();
            onRemove(expert);
          }}
          aria-label={`${expert.name}を削除`}
          className="absolute rounded-full flex items-center justify-center"
          style={{
            top: 2,
            right: 2,
            width: 16,
            height: 16,
            background: CARD,
            border: `1.5px solid ${MUTED}`,
            color: MUTED,
            fontSize: 9,
            fontWeight: 900,
          }}
        >
          ×
        </button>
      )}
    </motion.div>
  );
}
