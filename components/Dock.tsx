"use client";

import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import ExpertCard from "./ExpertCard";
import MilkAnimation from "./MilkAnimation";
import { DockState } from "@/lib/dock/DockState";
import { BLUE, CARD, CHIP, LINE, MARU, RED } from "@/lib/theme";
import type { Expert } from "@/lib/types";

/* ============================================================
   Dock — 画面下部に縮小して並ぶ専門家カードの列
   - カードクリックで担当を指名/解除 (指名中カードは展開表示)
   - 指名中は上部に案内ストリップを表示
   - Framer Motion:
     * オフィスモード移行時に key 切替で再マウントし、下からスタッガー入場
     * LayoutGroup + layout で、1枚の展開に合わせて隣のカードが滑らかに詰め直る
     * 履歴の再依頼時、担当キャラが一度だけ跳ねて「了解」を返す (ackTs)
   - selectedSlug / onSelectExpert を渡せば制御コンポーネントとして動作。
     省略時は内部stateで指名を管理する (既存の呼び出し互換)
   ============================================================ */

export default function Dock({
  experts,
  workingExpert,
  uiMode,
  reuseSignal,
  onOpenExpert,
  onAddExpert,
  onRemoveExpert,
  selectedSlug: selectedSlugProp,
  onSelectExpert,
  milkState = DockState.Idle,
  milkTransitioning = false,
}: {
  experts: Expert[];
  workingExpert: Expert | null;
  uiMode: "entrance" | "office";
  reuseSignal: { expertSlug: string; ts: number } | null;
  onOpenExpert: (e: Expert) => void;
  onAddExpert: () => void;
  onRemoveExpert: (slug: string) => void;
  /** 指名中の専門家slug (省略時は内部stateで管理する非制御モード) */
  selectedSlug?: string | null;
  /** 指名/解除の通知 (解除時は null) */
  onSelectExpert?: (e: Expert | null) => void;
  /** 受付ミルクの状態 (省略時は idle。状態機械 useDockState から渡す) */
  milkState?: DockState;
  /** 遷移中フラグ (Transition Layer 表示の補助) */
  milkTransitioning?: boolean;
}) {
  const entered = uiMode === "office";

  /* 制御/非制御の両対応 */
  const [internalSel, setInternalSel] = useState<string | null>(null);
  const selected =
    selectedSlugProp !== undefined ? selectedSlugProp : internalSel;
  const selectedExpert = experts.find((e) => e.slug === selected) || null;

  function handleSelect(e: Expert) {
    const next = selected === e.slug ? null : e;
    if (selectedSlugProp === undefined) setInternalSel(next ? next.slug : null);
    onSelectExpert?.(next);
  }

  return (
    <div className="flex-shrink-0" style={{ background: CARD, borderTop: `1px solid ${LINE}` }}>
      {/* 受付ミルクの状態レイヤー (状態機械 useDockState 連動) */}
      <MilkStatus state={milkState} transitioning={milkTransitioning} />

      {/* 指名中の案内ストリップ */}
      <AnimatePresence initial={false}>
        {selectedExpert && (
          <motion.div
            key="pin-hint"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden", background: CHIP, borderBottom: `1px solid ${LINE}` }}
          >
            <div
              className="px-3 py-1 text-center"
              style={{ fontSize: 10.5, color: BLUE, fontWeight: 700 }}
            >
              <b style={{ fontFamily: MARU }}>{selectedExpert.name}</b>
              を指名中 — 次のご依頼は受付を通さず直接届きます（もう一度タップで解除）
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* カード列 */}
      <div className="flex items-end gap-2 px-3 pt-2 pb-1.5 overflow-x-auto buhi-scroll">
        <LayoutGroup>
          {experts.map((e, i) => (
            <ExpertCard
              key={`${e.slug}-${entered ? "in" : "pre"}`}
              expert={e}
              selected={selected === e.slug}
              working={workingExpert?.slug === e.slug}
              entered={entered}
              enterDelay={i * 0.06}
              ackTs={
                reuseSignal?.expertSlug === e.slug ? reuseSignal.ts : null
              }
              onSelect={handleSelect}
              onOpen={onOpenExpert}
              onRemove={
                e.isDefault ? undefined : () => onRemoveExpert(e.slug)
              }
            />
          ))}

          {/* 採用ボタン */}
          <motion.button
            layout
            key={`add-${entered ? "in" : "pre"}`}
            initial={{ opacity: 0, y: 16, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: entered ? experts.length * 0.06 : 0,
              type: "spring",
              stiffness: 300,
              damping: 24,
            }}
            onClick={onAddExpert}
            title="専門家を採用"
            aria-label="新しい専門家を採用"
            className="flex-shrink-0 rounded-xl flex items-center justify-center"
            style={{
              width: 42,
              height: 58,
              border: `1.5px dashed ${BLUE}`,
              color: BLUE,
              fontWeight: 900,
              fontSize: 16,
              background: "transparent",
            }}
          >
            ＋
          </motion.button>
        </LayoutGroup>
      </div>
    </div>
  );
}

/* ============================================================
   MilkStatus — 受付ミルクの状態表示 (Transition Layer)
   状態変化を AnimatePresence でクロスフェード (0.45s = 0.3〜0.6s)
   ============================================================ */

const MILK_LABEL: Record<DockState, string> = {
  [DockState.Idle]: "受付でお待ちしています",
  [DockState.Focus]: "ご依頼を確認しています",
  [DockState.Success]: "おつなぎできました！",
  [DockState.Error]: "うまくいきませんでした",
  [DockState.Thinking]: "ご提案を考えています",
  [DockState.Listening]: "お話をうかがっています",
  [DockState.Loading]: "受付からおつなぎしています",
  [DockState.Surprised]: "少し驚いています",
  [DockState.Transition]: "",
};

function MilkStatus({
  state,
  transitioning,
}: {
  state: DockState;
  transitioning: boolean;
}) {
  const accent =
    state === DockState.Success
      ? "#1E9E6A"
      : state === DockState.Error
        ? RED
        : state === DockState.Surprised
          ? "#E8912D"
          : BLUE;
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5"
      style={{ borderBottom: `1px solid ${LINE}`, background: CHIP }}
    >
      <div style={{ width: 34, height: 34 }} className="relative flex-shrink-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: transitioning ? 0.85 : 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <MilkAnimation state={state} />
          </motion.div>
        </AnimatePresence>
      </div>
      <span
        style={{ fontSize: 10.5, fontWeight: 700, fontFamily: MARU, color: accent }}
      >
        {MILK_LABEL[state]}
      </span>
    </div>
  );
}


