"use client";

/* ============================================================
   app/test/dock/TestDock.tsx
   Dock の受付ミルク表示 (MilkStatus 相当) を単体で描画するラッパー。
   - 実 Dock の MilkStatus と同じ AnimatePresence クロスフェード(0.45s)を再現し、
     「遷移完了後の状態」を Playwright が観測できるようにする。
   - forceReduced で reduced-motion を明示上書き (トグル観測用)。
   - クリップ判別用 data-testid は MilkAnimation 内の各クリップに付与済み
     (<video>=milk-clip-video / <img>=milk-clip-pngseq /
      <Lottie>=milk-clip-lottie / <Frenchie>=milk-clip-static)。
   ============================================================ */

import { AnimatePresence, motion } from "framer-motion";
import MilkAnimation from "@/components/MilkAnimation";
import { DockState } from "./state";

export default function TestDock({
  state,
  reduced = false,
  size = 48,
}: {
  state: DockState;
  reduced?: boolean;
  size?: number;
}) {
  return (
    <div
      data-testid="dock-milk"
      style={{ position: "relative", width: size, height: size }}
    >
      {/* 実 MilkStatus と同じクロスフェード: key={state} で旧→新を差し替え、
          0.45s のフェード。遷移完了後に現在stateのクリップだけが残る。 */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0 }}
        >
          <MilkAnimation state={state} size={size} forceReduced={reduced} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
