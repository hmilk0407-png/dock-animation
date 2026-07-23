"use client";

/* ============================================================
   app/test/dock/page.tsx — Dock UI アニメ確認ページ (テストハーネス)
   - Playwright 用 testid はすべて維持 (dock-btn-{state} / toggle-reduced-motion /
     dock-current-state / dock-reduced-motion)。CI 互換。
   - 人間の目視確認用に: 大プレビュー(160px) + Dockサイズ(48px) 併記、
     日本語ラベル、状態説明を追加。
   - Surprised 発火後 SURPRISED_HOLD_MS=1200ms で Idle へ自動戻り (再現)。
     ※ useDockState の値と同期して維持すること。
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import TestDock from "./TestDock";
import { DockState, TEST_STATES } from "./state";

/** = lib/dock/useDockState.ts の SURPRISED_HOLD_MS (同期維持) */
const SURPRISED_HOLD_MS = 1200;

const JP: Record<string, { label: string; desc: string }> = {
  idle:      { label: "待機",     desc: "呼吸しながらときどき瞬き(Lottie・6秒ループ)" },
  focus:     { label: "集中",     desc: "入力に注目。耳ピン(WebM・1.4秒ループ)" },
  success:   { label: "成功",     desc: "跳ねて舌ペロ→末尾静止(WebM・1.8秒/1回・1.8秒後に待機へ)" },
  error:     { label: "エラー",   desc: "首をかしげて困り顔(WebM・2.3秒ループ)" },
  thinking:  { label: "考え中",   desc: "上目づかいで思案(PNG連番180枚・6秒ループ)" },
  listening: { label: "傾聴",     desc: "耳を前に向けて聞いている(WebM・6秒ループ)" },
  loading:   { label: "処理中",   desc: "伏し目でじっと待つ(WebM・6秒ループ)" },
  surprised: { label: "びっくり", desc: "ぴょこっと驚く(PNG連番36枚・1.2秒後に自動で待機へ)" },
};

export default function DockTestPage() {
  const [state, setState] = useState<DockState>(DockState.Idle);
  const [reduced, setReduced] = useState(false);
  const surprisedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const cur = JP[state] ?? { label: state, desc: "" };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#FDFBF7 0%,#F4EFE8 100%)",
        fontFamily:
          '"Hiragino Kaku Gothic ProN","Hiragino Sans","Yu Gothic UI","Meiryo",system-ui,sans-serif',
        padding: "32px 24px",
        color: "#4A423A",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          🐶 ミルク アニメーション確認ページ
        </h1>
        <p style={{ fontSize: 13, color: "#8A8178", marginTop: 6 }}>
          Dock 受付キャラ「ミルク」の8状態を確認できます(開発用ハーネス・CI 共用)
        </p>

        {/* 大プレビュー + Dock実寸 */}
        <div
          style={{
            marginTop: 20, padding: "28px 24px", background: "#fff",
            borderRadius: 20, boxShadow: "0 4px 20px rgba(74,66,58,.08)",
            display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap",
          }}
        >
          <TestDock state={state} reduced={reduced} size={160} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: "#B0A79C" }}>現在の状態</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }}>
              {cur.label}
              <span style={{ fontSize: 13, fontWeight: 400, color: "#B0A79C", marginLeft: 10 }}>
                <span data-testid="dock-current-state">{state}</span>
              </span>
            </div>
            <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>{cur.desc}</div>
          </div>
        </div>

        {/* 状態ボタン */}
        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
          {TEST_STATES.map((s) => (
            <button
              key={s}
              data-testid={`dock-btn-${s}`}
              onClick={() => setState(s)}
              style={{
                padding: "12px 10px", fontSize: 14, fontWeight: state === s ? 700 : 500,
                border: state === s ? "2px solid #E8A87C" : "1px solid #E2DAD0",
                borderRadius: 12, cursor: "pointer",
                background: state === s ? "#FFF4EA" : "#fff", color: "#4A423A",
                boxShadow: state === s ? "0 2px 8px rgba(232,168,124,.25)" : "none",
              }}
            >
              {(JP[s] ?? { label: s }).label}
              <span style={{ display: "block", fontSize: 10, color: "#B0A79C", marginTop: 2 }}>{s}</span>
            </button>
          ))}
        </div>

        {/* reduced-motion */}
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            data-testid="toggle-reduced-motion"
            onClick={() => setReduced((r) => !r)}
            style={{
              padding: "10px 16px", fontSize: 13, borderRadius: 10, cursor: "pointer",
              border: reduced ? "2px solid #D98C8C" : "1px solid #E2DAD0",
              background: reduced ? "#FBEDED" : "#fff", color: "#4A423A",
            }}
          >
            動きを減らす(reduced-motion): <b data-testid="dock-reduced-motion">{reduced ? "on" : "off"}</b>
          </button>
          <span style={{ fontSize: 12, color: "#B0A79C" }}>
            on にすると全状態が静止画になります(アクセシビリティ確認用)
          </span>
        </div>
      </div>
    </main>
  );
}
