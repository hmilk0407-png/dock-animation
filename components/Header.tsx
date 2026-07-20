"use client";

import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/* ============================================================
   Header — BUHI WORKS ブランドヘッダー
   - ZERO ONE ロゴ (public/zeroone-logo.jpg) を左上に固定配置
     (ヘッダー自体を sticky top-0 にすることでスクロール時も左上に留まる)
   - 近未来グラデーション背景: Entrance と同じパレットで統一
   - タイトル「ようこそ、BUHI WORKSへ」を中央に強調表示
     (BUHI WORKS 部分は氷青→ブルーのグラデーション文字)
   - 光ラインのアクセント: 斜めに流れるビーム2本 + 下端の受付ライン
   - Framer Motion でフェードイン + スライドアップ (スタッガー)
   - スマホ対応: タイトルは text-xl、sm以上で text-2xl (2xl → xl)
   - actions に要素を渡すと右上に表示 (履歴・ログアウト等。省略可)
   ============================================================ */

/* Entrance.css と揃えた配色 (単一ファイル完結のためここに再定義) */
const BASE_1 = "#0E1B3E";
const BASE_2 = "#070D1F";
const BASE_3 = "#0A1230";
const BW_BLUE = "#2E5FD8"; // BUHI WORKS ブルー
const ICE = "#F2F6FF";
const GLOW = "#7FA8FF";
const MARU = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Noto Sans JP", sans-serif';

export default function Header({
  logoSrc = "/zeroone-logo.jpg",
  actions,
  compact = false,
  className = "",
}: {
  /** ZERO ONE ロゴのパス (public/ 配下) */
  logoSrc?: string;
  /** 右上に表示する操作ボタン群 (省略時は非表示) */
  actions?: React.ReactNode;
  /** 低背・簡潔表示の業務向けモード (既定 false) */
  compact?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
  };
  const rise: Variants = {
    hidden: { opacity: 0, y: reduce || compact ? 0 : 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };
  const lineDraw: Variants = {
    hidden: { opacity: 0, scaleX: reduce || compact ? 1 : 0 },
    show: {
      opacity: 1,
      scaleX: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.25 },
    },
  };

  /* BUHI WORKS グラデーション文字 (通常/コンパクト共用) */
  const brandGrad: React.CSSProperties = {
    background: `linear-gradient(92deg, #CFE0FF 0%, ${GLOW} 45%, ${BW_BLUE} 100%)`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    whiteSpace: "nowrap",
    textShadow: "none",
    filter: "drop-shadow(0 0 12px rgba(46,95,216,0.45))",
  };

  return (
    <motion.header
      role="banner"
      variants={container}
      initial="hidden"
      animate="show"
      className={`sticky top-0 z-30 relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(42rem 16rem at 50% 0%, rgba(46,95,216,0.22), transparent 65%),
          linear-gradient(160deg, ${BASE_1} 0%, ${BASE_2} 58%, ${BASE_3} 100%)`,
        color: ICE,
      }}
    >
      {/* ビーム用キーフレーム (このファイル内で完結させる) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes bwHdrBeam { from { transform: rotate(-18deg) translateX(-40vw); } to { transform: rotate(-18deg) translateX(140vw); } }
@media (prefers-reduced-motion: reduce) { .bwHdr-beam { animation: none !important; } }
`,
        }}
      />

      {/* ---------- 光ライン: 斜めに流れるビーム (compact時は非表示) ---------- */}
      {!compact && (
        <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <span
          className="bwHdr-beam absolute rounded-full"
          style={{
            top: "30%",
            left: "-30vw",
            height: 1.5,
            width: "46vw",
            background: `linear-gradient(90deg, transparent 8%, rgba(127,168,255,0.5) 45%, rgba(46,95,216,0.6) 55%, transparent 92%)`,
            filter: "drop-shadow(0 0 5px rgba(46,95,216,0.5))",
            animation: "bwHdrBeam 15s linear infinite",
            opacity: 0.6,
          }}
        />
        <span
          className="bwHdr-beam absolute rounded-full"
          style={{
            top: "72%",
            left: "-30vw",
            height: 1.5,
            width: "38vw",
            background: `linear-gradient(90deg, transparent 8%, rgba(127,168,255,0.5) 45%, rgba(46,95,216,0.6) 55%, transparent 92%)`,
            filter: "drop-shadow(0 0 5px rgba(46,95,216,0.5))",
            animation: "bwHdrBeam 21s linear infinite",
            animationDelay: "-9s",
            opacity: 0.35,
          }}
        />
        </div>
      )}

      {/* ---------- ZERO ONE ロゴ (左上固定 / 白プレート) ---------- */}
      <motion.div
        variants={rise}
        className="absolute inline-flex"
        style={{
          top: 10,
          left: 10,
          zIndex: 2,
          padding: "5px 9px",
          background: "#FFFFFF",
          borderRadius: 10,
          boxShadow:
            "0 3px 14px rgba(4,10,28,0.45), 0 0 0 1px rgba(127,168,255,0.25)",
        }}
      >
        <Image
          src={logoSrc}
          alt="ZERO ONE"
          width={640}
          height={206}
          priority
          style={{
            width: compact
              ? "clamp(72px, 10vw, 112px)"
              : "clamp(88px, 12vw, 128px)",
            height: "auto",
          }}
        />
      </motion.div>

      {/* ---------- 右上: 操作スロット (省略可) ---------- */}
      {actions && (
        <motion.div
          variants={rise}
          className="absolute flex items-center gap-2"
          style={{ top: 10, right: 10, zIndex: 2 }}
        >
          {actions}
        </motion.div>
      )}

      {/* ---------- 中央: タイトル ---------- */}
      <div
        className="relative flex flex-col items-center text-center px-4"
        style={{
          paddingTop: compact ? 26 : 52,
          paddingBottom: compact ? 9 : 18,
          zIndex: 1,
        }}
      >
        {!compact && (
          <motion.div
            variants={rise}
            style={{
              fontSize: 9,
              letterSpacing: "0.32em",
              textIndent: "0.32em",
              color: "rgba(226,236,255,0.6)",
              fontWeight: 700,
            }}
          >
            AI EXPERT OFFICE
          </motion.div>
        )}

        <motion.h1
          variants={rise}
          className={compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl"}
          style={{
            fontFamily: MARU,
            fontWeight: 900,
            letterSpacing: "0.02em",
            lineHeight: 1.35,
            marginTop: compact ? 0 : 4,
            textShadow: "0 0 22px rgba(46,95,216,0.35)",
          }}
        >
          {compact ? (
            <span style={brandGrad}>BUHI&nbsp;WORKS</span>
          ) : (
            <>
              ようこそ、<span style={brandGrad}>BUHI&nbsp;WORKS</span>へ
            </>
          )}
        </motion.h1>
      </div>

      {/* ---------- 光ライン: 下端の受付ライン (scaleXで描画) ---------- */}
      <motion.div
        variants={lineDraw}
        aria-hidden
        className="absolute inset-x-0 bottom-0"
        style={{
          height: 2,
          transformOrigin: "center",
          background: `linear-gradient(90deg, transparent, ${GLOW} 30%, ${BW_BLUE} 70%, transparent)`,
          boxShadow: "0 0 12px rgba(46,95,216,0.75)",
        }}
      />
    </motion.header>
  );
}
