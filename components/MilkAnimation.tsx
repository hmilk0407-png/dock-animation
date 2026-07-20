"use client";

import {
  useEffect,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import Frenchie from "./avatars/Frenchie";
import { DockState } from "@/lib/dock/DockState";

/* ============================================================
   MilkAnimation — 受付ミルクの状態別アニメーション
   Dock の状態機械 (useDockState) の state に応じて表情を切り替える。

   本番アセット (Lottie / WebM / PNG連番) を MILK_ASSETS に登録すると
   その形式で再生し、未登録の状態は SVG(Frenchie)+Framer にフォールバックする。
   ゼロ依存で動作 (WebM=<video>, PNG連番=<img>差替) し、Lottie のみ
   プレイヤーコンポーネントの注入 (lottiePlayer) が必要。

   クロスフェード(AnimatePresence)は Dock 側 MilkStatus が担当するため、
   本コンポーネントは「現在stateの1枚」を描画することに徹する。

   状態別の意図:
     Idle      … ゆっくり瞬き＋呼吸 (ループ)
     Focus     … 前のめり＋耳ピクッ (ループ)
     Success   … 舌ペロッ＋笑顔 (ワンショット 1.5〜2.0s)
     Error     … 首かしげ＋眉寄せ (困り顔を保持=ループ)
     Thinking  … 上目づかいで思案 (ループ 180f)
     Listening … 少し前で受け止め (ループ 180f)
     Loading   … 伏し目で処理待機 (ループ 180f)
     Surprised … ぴょこっと驚く (ワンショット 1.2s / 36f)
   ============================================================ */

/** Lottie プレイヤーの最小インターフェース (lottie-react 等を注入) */
export type LottiePlayer = ComponentType<{
  animationData: unknown;
  loop?: boolean;
  autoplay?: boolean;
  style?: CSSProperties;
}>;

/** 状態ごとのアセット定義 */
export type MilkAssetEntry =
  | { kind: "lottie"; src?: string; data?: unknown; loop?: boolean }
  | { kind: "webm"; src: string; loop?: boolean; poster?: string }
  | { kind: "pngseq"; frames: string[]; fps?: number; loop?: boolean }
  | { kind: "svg" }; // 明示的にSVGフォールバックを使う

export type MilkManifest = Partial<Record<DockState, MilkAssetEntry>>;

/* ------------------------------------------------------------
   ★アセット登録ポイント★
   本番アニメを入れる場合はここを差し替える (public/ 配下に配置)。
   未登録の状態は自動的に SVG フォールバック。Dock 側の変更は不要。

   例:
   const MILK_ASSETS: MilkManifest = {
     [DockState.Idle]:    { kind: "webm", src: "/milk/idle.webm", loop: true },
     [DockState.Focus]:   { kind: "pngseq", frames: focusFrames, fps: 24, loop: true },
     [DockState.Success]: { kind: "webm", src: "/milk/success.webm", loop: false },
     [DockState.Error]:   { kind: "lottie", data: errorLottieJson, loop: true },
   };
   ※ Lottie を使う状態がある場合のみ、MilkStatus から
     <MilkAnimation ... lottiePlayer={Lottie} /> を渡す (下記 Dock 差分の注記参照)。
   ------------------------------------------------------------ */
const MILK_ASSETS: MilkManifest = {
  // Idle: Lottie版に差し替え (URL src・loop:true。内蔵 LottieClip が dynamic import で fetch 再生。player 注入不要)
  [DockState.Idle]: { kind: "lottie", src: "/milk/idle/milk_idle.json", loop: true },
  [DockState.Focus]: { kind: "webm", src: "/milk/focus/milk_focus.webm", loop: true },
  [DockState.Success]: { kind: "webm", src: "/milk/success/milk_success.webm", loop: false },
  [DockState.Error]: { kind: "webm", src: "/milk/error/milk_error.webm", loop: true },
  /* --- states v2 正典命名: /public/milk/{state}/milk_{state}.webm に統一 ---
     fps/frames/version/pngCount は meta.json 側が正典。MilkAssetEntry は
     kind/src/loop のみ保持するため、ここでは webm を登録する。
     PNG連番/Lottie に差し替える場合は kind:"pngseq"/"lottie" を使う (下の例参照)。 */
  // Thinking: PNG連番版に差し替え (180f/30fps・loop:true。frames は string[] を生成)
  [DockState.Thinking]: {
    kind: "pngseq",
    frames: Array.from({ length: 180 }, (_, i) =>
      `/milk/thinking/thinking_${String(i + 1).padStart(4, "0")}.png`
    ),
    fps: 30,
    loop: true,
  },
  [DockState.Listening]: { kind: "webm", src: "/milk/listening/milk_listening.webm", loop: true }, // ループ 180f
  [DockState.Loading]: { kind: "webm", src: "/milk/loading/milk_loading.webm", loop: true }, // ループ 180f
  // Surprised: PNG連番版に差し替え (36f/30fps・loop:false=ワンショット維持)
  [DockState.Surprised]: {
    kind: "pngseq",
    frames: Array.from({ length: 36 }, (_, i) =>
      `/milk/surprised/surprised_${String(i + 1).padStart(4, "0")}.png`
    ),
    fps: 30,
    loop: false,
  },
  /* --- 形式を変える場合の例 (public/milk/ に配置) ---
  [DockState.Idle]: { kind: "lottie", src: "/milk/idle.json", loop: true },
  [DockState.Focus]: {
    kind: "pngseq",
    frames: Array.from({ length: 24 }, (_, i) =>
      `/milk/focus_${String(i + 1).padStart(4, "0")}.png`
    ),
    fps: 24,
    loop: true,
  },
  */
};

/* lottie-react を SSR無効で読み込む (アニメライブラリのため client 限定) */
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/** 状態ごとの既定ループ設定 (Success / Surprised はワンショット) */
function defaultLoop(state: DockState): boolean {
  return state !== DockState.Success && state !== DockState.Surprised;
}

/** 状態ごとの表示秒数の目安 (SVGフォールバックのワンショット長に使用) */
const ONESHOT_MS: Partial<Record<DockState, number>> = {
  [DockState.Success]: 1800, // 1.5〜2.0s
  [DockState.Error]: 2200, // 1.8〜2.5s
  [DockState.Surprised]: 1200, // 1.2s (36f)
};

export default function MilkAnimation({
  state,
  size = 34,
  manifest,
  lottiePlayer,
  forceReduced,
}: {
  state: DockState;
  size?: number;
  /** MILK_ASSETS を上書きしたい場合に渡す */
  manifest?: MilkManifest;
  /** Lottie を使う場合のプレイヤー (lottie-react の Lottie 等) */
  lottiePlayer?: LottiePlayer;
  /** テスト用: reduced-motion を明示上書き (未指定時は useReducedMotion。本番は未指定=従来挙動) */
  forceReduced?: boolean;
}) {
  const prefersReduced = useReducedMotion();
  const reduce = forceReduced ?? prefersReduced;
  const entry: MilkAssetEntry = (manifest ?? MILK_ASSETS)[state] ?? { kind: "svg" };

  /* モーション配慮: 動きを抑える設定なら静止した表情を表示 */
  if (reduce) return <StaticMilk size={size} />;

  switch (entry.kind) {
    case "webm":
      return (
        <WebmClip
          src={entry.src}
          poster={entry.poster}
          loop={entry.loop ?? defaultLoop(state)}
          size={size}
        />
      );
    case "pngseq":
      return (
        <PngSeqClip
          frames={entry.frames}
          fps={entry.fps ?? 24}
          loop={entry.loop ?? defaultLoop(state)}
          size={size}
        />
      );
    case "lottie":
      // 注入プレイヤーがあれば優先、なければ内蔵の LottieClip (URL/データ両対応)
      if (lottiePlayer && entry.data) {
        const Injected = lottiePlayer;
        return (
          <Injected
            animationData={entry.data}
            loop={entry.loop ?? defaultLoop(state)}
            autoplay
            style={{ width: size, height: size }}
          />
        );
      }
      return (
        <LottieClip
          src={entry.src}
          data={entry.data}
          loop={entry.loop ?? defaultLoop(state)}
          size={size}
        />
      );
    case "svg":
    default:
      return <SvgMilk state={state} size={size} />;
  }
}

/* ---------- Lottie: public/ のJSONをランタイム取得して lottie-react で再生 ---------- */
function LottieClip({
  src,
  data,
  loop,
  size,
}: {
  src?: string;
  data?: unknown;
  loop: boolean;
  size: number;
}) {
  const [json, setJson] = useState<unknown>(data ?? null);
  useEffect(() => {
    if (data) {
      setJson(data);
      return;
    }
    if (!src) return;
    let alive = true;
    fetch(src)
      .then((r) => r.json())
      .then((j) => {
        if (alive) setJson(j);
      })
      .catch(() => {
        /* 取得失敗時は何も描画しない (状態切替で再試行) */
      });
    return () => {
      alive = false;
    };
  }, [src, data]);

  if (!json) return null; // ロード中は空 (MilkStatusのフェードで自然に見える)
  return (
    <div data-testid="milk-clip-lottie" style={{ width: size, height: size }}>
      <Lottie
        animationData={json}
        loop={loop}
        autoplay
        style={{ width: size, height: size }}
      />
    </div>
  );
}

/* ---------- WebM: ネイティブ<video>で再生 (ゼロ依存) ---------- */
function WebmClip({
  src,
  poster,
  loop,
  size,
}: {
  src: string;
  poster?: string;
  loop: boolean;
  size: number;
}) {
  return (
    <video
      data-testid="milk-clip-video"
      src={src}
      poster={poster}
      width={size}
      height={size}
      autoPlay
      muted
      playsInline
      loop={loop}
      style={{ display: "block", width: size, height: size, objectFit: "contain" }}
    />
  );
}

/* ---------- PNG連番: <img>を fps で差し替え (ゼロ依存) ---------- */
function PngSeqClip({
  frames,
  fps,
  loop,
  size,
}: {
  frames: string[];
  fps: number;
  loop: boolean;
  size: number;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    if (frames.length <= 1) return;
    let idx = 0;
    const id = setInterval(() => {
      idx += 1;
      if (idx >= frames.length) {
        if (loop) {
          idx = 0;
        } else {
          idx = frames.length - 1;
          clearInterval(id);
        }
      }
      setI(idx);
    }, Math.max(1, Math.round(1000 / fps)));
    return () => clearInterval(id);
  }, [frames, fps, loop]);

  return (
    <img
      data-testid="milk-clip-pngseq"
      src={frames[i]}
      width={size}
      height={size}
      alt=""
      style={{ display: "block", width: size, height: size, objectFit: "contain" }}
    />
  );
}

/* ---------- SVG フォールバック: Frenchie + Framer で状態表現 ---------- */
function SvgMilk({ state, size }: { state: DockState; size: number }) {
  const motionByState: Record<
    DockState,
    { animate: object; transition: object }
  > = {
    // Idle: 呼吸 (ゆっくり上下)。瞬きは Frenchie 内蔵のCSSで表現
    [DockState.Idle]: {
      animate: { y: [0, -2, 0] },
      transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
    },
    // Focus: 前のめり＋わずかに傾ける (耳ピクッの代替)
    [DockState.Focus]: {
      animate: { scale: [1, 1.05, 1.03], rotate: [0, -3, 0] },
      transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" },
    },
    // Success: ぴょこっと弾む喜び (ワンショット)
    [DockState.Success]: {
      animate: { y: [0, -6, 0, -3, 0], scale: [1, 1.08, 1] },
      transition: { duration: (ONESHOT_MS[DockState.Success] ?? 1800) / 1000, ease: [0.34, 1.3, 0.64, 1] },
    },
    // Error: 首かしげを保持 (困り顔をゆっくりループ)
    [DockState.Error]: {
      animate: { rotate: [0, -8, -6, -8, 0] },
      transition: {
        duration: (ONESHOT_MS[DockState.Error] ?? 2200) / 1000,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    // Thinking: 上を見て思案 (ゆっくりループ)
    [DockState.Thinking]: {
      animate: { y: [0, -2.4, 0], rotate: [0, 3, 0] },
      transition: { duration: 2.0, repeat: Infinity, ease: "easeInOut" },
    },
    // Listening: 少し前で受け止め (ゆっくりループ)
    [DockState.Listening]: {
      animate: { y: [0, -1.8, 0], rotate: [0, 1, 0] },
      transition: { duration: 2.0, repeat: Infinity, ease: "easeInOut" },
    },
    // Loading: 伏し目で処理待機 (ゆっくりループ)
    [DockState.Loading]: {
      animate: { y: [0, -1.2, 0], rotate: [0, -3, 0] },
      transition: { duration: 2.0, repeat: Infinity, ease: "easeInOut" },
    },
    // Surprised: ぴょこっと驚く (ワンショット)
    [DockState.Surprised]: {
      animate: { y: [0, -6, -3, 0], scale: [1, 1.1, 1] },
      transition: {
        duration: (ONESHOT_MS[DockState.Surprised] ?? 1200) / 1000,
        ease: [0.34, 1.3, 0.64, 1],
      },
    },
    [DockState.Transition]: { animate: {}, transition: {} },
  };
  const m = motionByState[state];
  return (
    <motion.div animate={m.animate as never} transition={m.transition as never}>
      <Frenchie size={size} coat="white" accessory="glasses" />
    </motion.div>
  );
}

/* ---------- 静止表示 (prefers-reduced-motion 用) ---------- */
function StaticMilk({ size }: { size: number }) {
  return (
    <span
      data-testid="milk-clip-static"
      style={{ display: "inline-flex", width: size, height: size }}
    >
      <Frenchie size={size} coat="white" accessory="glasses" />
    </span>
  );
}
