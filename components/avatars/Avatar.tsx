"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Frenchie from "./Frenchie";
import WorkBadge from "./WorkBadge";
import { BUILTIN_PHOTO_SLUGS } from "@/lib/experts";
import { LINE, NAVY } from "@/lib/theme";
import type { Expert, HistoryEntry } from "@/lib/types";

/* ---------- 統合アバター ----------
   写真の解決順: ユーザー設定写真(Supabase) → 内蔵写真(/avatars/{slug}.jpg) → SVGフレブル
   内蔵写真は scripts/extract-avatars.mjs で配置。無い場合は onError でSVGへ自動フォールバック */
export default function Avatar({
  expert,
  size = 46,
  working = false,
  badge = true,
}: {
  expert: Expert;
  size?: number;
  working?: boolean;
  badge?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const builtin = BUILTIN_PHOTO_SLUGS.has(expert.slug)
    ? `/avatars/${expert.slug}.jpg`
    : null;
  const src = !broken ? expert.photoUrl || builtin : null;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <div
          className={working ? "photo-bob" : ""}
          style={{
            width: size,
            height: size,
            borderRadius: "24%",
            overflow: "hidden",
            border: `1.5px solid ${LINE}`,
            background: "#EDEAE0",
            boxShadow: "0 1px 3px rgba(20,38,62,0.10)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={expert.name}
            draggable={false}
            onError={() => setBroken(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      ) : (
        <Frenchie coat={expert.coat} accessory={expert.accessory} size={size} working={working} />
      )}
      {working && badge && (
        <WorkBadge slug={expert.slug} size={Math.max(22, Math.round(size * 0.42))} />
      )}
    </div>
  );
}

/* ---------- 表情バッジ (MoodBadge) ----------
   履歴データから表情を導出: 回答前=通常顔 / 回答後=満足顔 / エラー=困り顔
   添付ありの場合は前足でメモを持つ (Framer Motion でポップイン) */
export function MoodBadge({ entry, size = 17 }: { entry: HistoryEntry; size?: number }) {
  const mood =
    entry.status === "error" ? "error" : entry.status === "done" ? "done" : "waiting";
  const hasMemo = (entry.attachments || []).length > 0;
  const label =
    (mood === "done" ? "回答済み" : mood === "error" ? "エラーで中断" : "回答待ち") +
    (hasMemo ? "・添付あり" : "");

  return (
    <motion.div
      title={label}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      className="absolute flex items-center justify-center"
      style={{
        right: -5,
        bottom: -5,
        width: size,
        height: size,
        background: "#FFF",
        border: `1px solid ${LINE}`,
        borderRadius: "50%",
        boxShadow: "0 1px 3px rgba(20,38,62,0.15)",
      }}
    >
      <svg width={size - 3} height={size - 3} viewBox="0 0 20 20" style={{ overflow: "visible" }}>
        <path d="M4.5 8 Q3 2.5 7 3.5 Z" fill="#FBFAF6" stroke={NAVY} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M15.5 8 Q17 2.5 13 3.5 Z" fill="#FBFAF6" stroke={NAVY} strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="10" cy="11" r="6.5" fill="#FBFAF6" stroke={NAVY} strokeWidth="1.3" />
        {mood === "waiting" && (
          <g>
            <circle cx="7.8" cy="10" r="0.95" fill={NAVY} />
            <circle cx="12.2" cy="10" r="0.95" fill={NAVY} />
            <path d="M8.8 13.4h2.4" stroke={NAVY} strokeWidth="1.2" strokeLinecap="round" />
          </g>
        )}
        {mood === "done" && (
          <g>
            <path d="M6.8 10.2 q1 -1.5 2 0" fill="none" stroke={NAVY} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M11.2 10.2 q1 -1.5 2 0" fill="none" stroke={NAVY} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M8.3 12.7 q1.7 1.7 3.4 0" fill="none" stroke={NAVY} strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="6.2" cy="12.3" r="0.85" fill="#F5B9C0" />
            <circle cx="13.8" cy="12.3" r="0.85" fill="#F5B9C0" />
          </g>
        )}
        {mood === "error" && (
          <g>
            <path d="M6.9 9.3 l1.7 0.8 M13.1 9.3 l-1.7 0.8" stroke={NAVY} strokeWidth="1.1" strokeLinecap="round" />
            <path d="M8.2 13.5 q0.9 -1 1.8 0 q0.9 1 1.8 0" fill="none" stroke={NAVY} strokeWidth="1.2" strokeLinecap="round" />
          </g>
        )}
        {hasMemo && (
          <g>
            <g transform="rotate(8 14.8 16)">
              <rect x="11.8" y="12.6" width="6" height="6.8" rx="1" fill="#FFF" stroke="#2E5FD8" strokeWidth="1.1" />
              <path d="M13.1 14.7h3.4 M13.1 16.4h3.4" stroke="#B9C4D6" strokeWidth="0.9" />
            </g>
            <rect x="10.4" y="15.4" width="3.6" height="2.8" rx="1.4" fill="#FBFAF6" stroke={NAVY} strokeWidth="1" />
          </g>
        )}
      </svg>
    </motion.div>
  );
}
