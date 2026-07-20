"use client";

import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import "./Entrance.css";

/* ============================================================
   Entrance — BUHI WORKS 近未来エントランス
   - ZERO ONE ロゴ (左上固定 / public/zeroone-logo.jpg)
   - グラデーション + 光ラインの背景 (ループ演出は Entrance.css)
   - タイトル・サブコピーは Framer Motion でフェード + スライドアップ
   - onEnter を渡すと「オフィスに入る」ボタンを表示 (省略可)
   ============================================================ */

type EntranceProps = {
  /** 入室ボタン押下時のコールバック。未指定ならボタンは表示しない */
  onEnter?: () => void;
  /** ZERO ONE ロゴのパス (public/ 配下) */
  logoSrc?: string;
};

export default function Entrance({
  onEnter,
  logoSrc = "/zeroone-logo.jpg",
}: EntranceProps) {
  const reduce = useReducedMotion();

  /* 入場演出: 親→子のスタッガーで順にフェード + スライドアップ */
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
  };
  const rise: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 28 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
  };
  const lineDraw: Variants = {
    hidden: { opacity: 0, scaleX: reduce ? 1 : 0 },
    show: {
      opacity: 1,
      scaleX: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <div className="bwEnt-root">
      {/* ---------- 背景演出 (ループ系は Entrance.css) ---------- */}
      <div className="bwEnt-aurora" aria-hidden />
      <div className="bwEnt-beams" aria-hidden>
        <span className="bwEnt-beam" />
        <span className="bwEnt-beam" />
        <span className="bwEnt-beam" />
        <span className="bwEnt-beam" />
      </div>
      <div className="bwEnt-vignette" aria-hidden />

      {/* ---------- ZERO ONE ロゴ (左上固定) ---------- */}
      <motion.div
        className="bwEnt-logo"
        initial={{ opacity: 0, y: reduce ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      >
        <Image src={logoSrc} alt="ZERO ONE" width={640} height={206} priority />
      </motion.div>

      {/* ---------- 中央コンテンツ ---------- */}
      <motion.main
        className="bwEnt-content"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div className="bwEnt-eyebrow" variants={rise}>
          <span className="bwEnt-lockup">
            <span className="bwEnt-l1">BUHI</span>
            <span className="bwEnt-l2">WORKS</span>
          </span>
          <span className="bwEnt-eyebrowCaption">AI EXPERT OFFICE</span>
        </motion.div>

        <motion.h1 className="bwEnt-title" variants={rise}>
          ようこそ、<span className="bwEnt-brand">BUHI&nbsp;WORKS</span>へ
        </motion.h1>

        <motion.div className="bwEnt-line" variants={lineDraw} aria-hidden />

        <motion.p className="bwEnt-sub" variants={rise}>
          AI × 専門知見が実現する、<em>顔の見える</em>業務パートナー。
          <br />
          受付のミルクが、あなたのご依頼を最適な専門家におつなぎします。
        </motion.p>

        {onEnter && (
          <motion.button
            type="button"
            className="bwEnt-cta"
            variants={rise}
            whileTap={{ scale: 0.97 }}
            onClick={onEnter}
          >
            オフィスに入る
          </motion.button>
        )}
      </motion.main>
    </div>
  );
}
