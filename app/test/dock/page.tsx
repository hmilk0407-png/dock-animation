"use client";

/* ============================================================
   app/test/dock/page.tsx — Dock UI アニメ自動テスト用ハーネス
   Playwright から page.goto("/test/dock") で開く。
   - 8 状態を発火するボタン (data-testid="dock-btn-{state}")
   - reduced-motion トグル (data-testid="toggle-reduced-motion")
   - 現在状態表示 (data-testid="dock-current-state")
   - reduced-motion 状態表示 (data-testid="dock-reduced-motion")
   - Surprised 発火後 SURPRISED_HOLD_MS=1200ms で Idle へ自動戻り (再現)

   注: 状態は直接制御 (useState)。任意状態を確実に描画してクリップを検証するため。
       実 useDockState の状態機械 (優先度/割り込み/SURPRISED_HOLD_MS) は
       renderHook + fake timers の単体テストで別途検証する (自動テスト仕様 §6)。
       下記 SURPRISED_HOLD_MS は useDockState の値と同期して維持すること。
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import TestDock from "./TestDock";
import { DockState, TEST_STATES } from "./state";

/** = lib/dock/useDockState.ts の SURPRISED_HOLD_MS (同期維持) */
const SURPRISED_HOLD_MS = 1200;

export default function DockTestPage() {
  const [state, setState] = useState<DockState>(DockState.Idle);
  const [reduced, setReduced] = useState(false);
  const surprisedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Surprised の自動戻り (1.2s → Idle) を再現。実 useDockState の挙動に整合。
  useEffect(() => {
    if (surprisedTimer.current) {
      clearTimeout(surprisedTimer.current);
      surprisedTimer.current = null;
    }
    if (state === DockState.Surprised) {
      surprisedTimer.current = setTimeout(
        () => setState(DockState.Idle),
        SURPRISED_HOLD_MS
      );
    }
    return () => {
      if (surprisedTimer.current) clearTimeout(surprisedTimer.current);
    };
  }, [state]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 16, fontWeight: 700 }}>Dock Anim Test Harness</h1>

      {/* 受付ミルク (MilkStatus 相当・クロスフェード付き) */}
      <div style={{ marginTop: 16 }}>
        <TestDock state={state} reduced={reduced} size={48} />
      </div>

      {/* 状態表示 */}
      <div style={{ marginTop: 12, fontSize: 13 }}>
        state: <b data-testid="dock-current-state">{state}</b>
        {"  |  reduced-motion: "}
        <b data-testid="dock-reduced-motion">{reduced ? "on" : "off"}</b>
      </div>

      {/* 状態切替ボタン (dock-btn-{state}) */}
      <div
        style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        {TEST_STATES.map((s) => (
          <button
            key={s}
            data-testid={`dock-btn-${s}`}
            onClick={() => setState(s)}
            style={{
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: state === s ? 700 : 400,
              border: "1px solid #999",
              borderRadius: 6,
              background: state === s ? "#e8f0ff" : "#fff",
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* reduced-motion トグル */}
      <div style={{ marginTop: 12 }}>
        <button
          data-testid="toggle-reduced-motion"
          onClick={() => setReduced((r) => !r)}
          style={{
            padding: "6px 10px",
            fontSize: 12,
            border: "1px solid #999",
            borderRadius: 6,
            background: reduced ? "#ffe8e8" : "#fff",
            cursor: "pointer",
          }}
        >
          toggle reduced-motion ({reduced ? "on" : "off"})
        </button>
      </div>
    </main>
  );
}
