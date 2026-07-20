"use client";
import { motion } from "framer-motion";
import Avatar from "./avatars/Avatar";
import { BG, BLUE, CARD, CHIP, LINE, MARU, MUTED, TEXT, WOOD } from "@/lib/theme";
import type { Expert } from "@/lib/types";

/* ---------- エントランス (初期の全画面キャラ配置) ----------
   依頼が来るまでの「全員出社」画面。
   Framer Motion: カードのスタッガー入場 / ホバーで浮き上がり /
   最初の依頼で全体が 0.8s かけて縮小フェード退場 (exit) → デスクトップへ。 */

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};
const cardVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 22 },
  },
};

export default function EntranceGrid({
  experts,
  secretaryName,
  onOpenExpert,
  onAddExpert,
  onRemoveExpert,
}: {
  experts: Expert[];
  secretaryName: string;
  onOpenExpert: (e: Expert) => void;
  onAddExpert: () => void;
  onRemoveExpert: (slug: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 0.92,
        y: 26,
        transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
      }}
      className="absolute inset-0 z-20 flex flex-col overflow-y-auto"
      style={{
        background: BG,
        backgroundImage: `radial-gradient(#E5E1D4 1px, transparent 1px), linear-gradient(180deg, ${BG} 0%, ${BG} 70%, #ECE7D8 70.3%, #E7E0CE 100%)`,
        backgroundSize: "22px 22px, 100% 100%",
      }}
    >
      {/* 幅木 (壁と床の境界ライン: オフィスの奥行き) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "70%",
          height: 3,
          background: `linear-gradient(90deg, ${WOOD}, #B08F63)`,
          opacity: 0.45,
          pointerEvents: "none",
        }}
      />
      <div className="m-auto w-full flex flex-col items-center px-4 py-8" style={{ maxWidth: 1000 }}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-5"
        >
          <div style={{ fontSize: 20, fontWeight: 900, fontFamily: MARU, color: TEXT }}>
            ようこそ、BUHI WORKSへ
          </div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 5, lineHeight: 1.75 }}>
            ご用件を下の受付カウンターへどうぞ。受付の{secretaryName}が最適な担当におつなぎします。
            <br />
            カードをタップすると、各専門家の指示書と写真を編集できます。
          </div>
        </motion.div>

        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="relative flex flex-wrap justify-center gap-3 sm:gap-4 w-full"
        >
          {experts.map((e) => (
            <motion.div
              key={e.slug}
              variants={cardVariants}
              whileHover={{ y: -4, boxShadow: "0 10px 24px rgba(20,38,62,.13)" }}
              role="button"
              tabIndex={0}
              onClick={() => onOpenExpert(e)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") onOpenExpert(e);
              }}
              aria-label={`${e.name}（${e.specialty}）の指示書を開く`}
              className="relative flex flex-col items-center rounded-2xl px-3 pt-4 pb-5"
              style={{
                width: "clamp(140px, 23vw, 200px)",
                background: CARD,
                border: `1px solid ${LINE}`,
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(20,38,62,0.06)",
              }}
            >
              <Avatar expert={e} size={88} />
              <div style={{ fontSize: 15, fontWeight: 900, marginTop: 8, color: TEXT, fontFamily: MARU }}>
                {e.name}
              </div>
              <div
                className="px-2 py-0.5 rounded-full mt-1"
                style={{ background: CHIP, color: BLUE, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}
              >
                {e.specialty}
              </div>
              {/* デスクの木目 */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 4,
                  background: `linear-gradient(90deg, ${WOOD}, #B08F63)`,
                  opacity: 0.85,
                  borderRadius: "0 0 14px 14px",
                }}
              />
              {!e.isDefault && (
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onRemoveExpert(e.slug);
                  }}
                  aria-label={`${e.name}を削除`}
                  className="absolute rounded-full flex items-center justify-center"
                  style={{
                    top: 6,
                    right: 6,
                    width: 20,
                    height: 20,
                    background: CARD,
                    border: `1.5px solid ${MUTED}`,
                    color: MUTED,
                    fontSize: 10,
                    fontWeight: 900,
                  }}
                >
                  ×
                </button>
              )}
            </motion.div>
          ))}

          {/* 採用カード */}
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -4, boxShadow: "0 10px 24px rgba(20,38,62,.13)" }}
            role="button"
            tabIndex={0}
            onClick={onAddExpert}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") onAddExpert();
            }}
            aria-label="新しい専門家を採用"
            className="flex flex-col items-center justify-center rounded-2xl gap-1"
            style={{
              width: "clamp(140px, 23vw, 200px)",
              minHeight: 172,
              border: `1.5px dashed ${BLUE}`,
              background: "rgba(255,255,255,0.6)",
              color: BLUE,
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900 }}>＋</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: MARU }}>専門家を採用</div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
