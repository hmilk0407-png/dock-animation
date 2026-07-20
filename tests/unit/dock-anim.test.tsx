import { render, screen, act, renderHook, cleanup } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import MilkAnimation, { type MilkManifest } from "@/components/MilkAnimation";
import { useDockState } from "@/lib/dock/useDockState";
import { DockState } from "@/lib/dock/DockState";

/* next/dynamic(=Lottie) を null スタブに (jsdom で lottie-web を動かさない)。
   milk-clip-lottie の <div> は LottieClip 側で描画されるため判定に影響しない。 */
vi.mock("next/dynamic", () => ({ default: () => () => null }));

/** PngSeqClip の間隔と同一式: Math.round(1000/30) = 33ms */
const FRAME_MS = Math.round(1000 / 30);

const srcOf = (testid: string) =>
  screen.getByTestId(testid).getAttribute("src") ?? "";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  cleanup();
});

/* A. PNGseq (Thinking, 180f, loop=true) — 33ms×180 → ループ */
describe("A. PNGseq (Thinking) フレーム進行", () => {
  test("0001→0002→…→0180→0001 と決定的に進行・ループする", () => {
    render(
      <MilkAnimation state={DockState.Thinking} size={48} forceReduced={false} />
    );
    expect(srcOf("milk-clip-pngseq")).toContain("thinking_0001.png"); // i=0

    act(() => vi.advanceTimersByTime(FRAME_MS * 1)); // i=1
    expect(srcOf("milk-clip-pngseq")).toContain("thinking_0002.png");

    act(() => vi.advanceTimersByTime(FRAME_MS * 178)); // 合計179tick → i=179 (末尾0180)
    expect(srcOf("milk-clip-pngseq")).toContain("thinking_0180.png");

    act(() => vi.advanceTimersByTime(FRAME_MS * 1)); // 合計180tick → loop → i=0
    expect(srcOf("milk-clip-pngseq")).toContain("thinking_0001.png");
  });
});

/* B. Surprised — pngseq 36f 末尾静止 / useDockState 1200ms→Idle / Idle=lottie */
describe("B. Surprised (36f → 末尾静止 → 1200ms で Idle)", () => {
  test("pngseq 36f が末尾 0036 で静止する (loop=false)", () => {
    render(
      <MilkAnimation state={DockState.Surprised} size={48} forceReduced={false} />
    );
    expect(srcOf("milk-clip-pngseq")).toContain("surprised_0001.png");

    act(() => vi.advanceTimersByTime(FRAME_MS * 35)); // i=35 (末尾0036)
    expect(srcOf("milk-clip-pngseq")).toContain("surprised_0036.png");

    act(() => vi.advanceTimersByTime(FRAME_MS * 30)); // 進めても末尾静止
    expect(srcOf("milk-clip-pngseq")).toContain("surprised_0036.png");
  });

  test("useDockState: surprised:start → 1200ms 後に Idle へ自動戻り", () => {
    const { result } = renderHook(() => useDockState());
    expect(result.current.state).toBe(DockState.Idle);

    act(() => result.current.trigger({ type: "surprised:start" }));
    expect(result.current.state).toBe(DockState.Surprised);

    act(() => vi.advanceTimersByTime(1300)); // SURPRISED_HOLD_MS=1200 + 余裕
    expect(result.current.state).toBe(DockState.Idle);
  });

  test("Idle は lottie (milk-clip-lottie) を描画する (data 注入)", () => {
    const idleManifest: MilkManifest = {
      [DockState.Idle]: { kind: "lottie", data: { layers: [] }, loop: true },
    };
    render(
      <MilkAnimation
        state={DockState.Idle}
        manifest={idleManifest}
        forceReduced={false}
      />
    );
    expect(screen.getByTestId("milk-clip-lottie")).toBeInTheDocument();
  });
});

/* C. Success (webm, loop=false) — jsdom は再生しない → loop=false を主検証 */
describe("C. Success (webm, loop=false → 末尾静止)", () => {
  test("webm クリップが loop=false で描画される", () => {
    render(
      <MilkAnimation state={DockState.Success} size={48} forceReduced={false} />
    );
    const video = screen.getByTestId("milk-clip-video") as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.loop).toBe(false);
  });

  test("[参考] Success を pngseq(54f,loop=false) 化した場合、0054 で末尾静止", () => {
    const frames = Array.from({ length: 54 }, (_, i) =>
      `/milk/success/success_${String(i + 1).padStart(4, "0")}.png`
    );
    const m: MilkManifest = {
      [DockState.Success]: { kind: "pngseq", frames, fps: 30, loop: false },
    };
    render(
      <MilkAnimation state={DockState.Success} manifest={m} forceReduced={false} />
    );
    expect(srcOf("milk-clip-pngseq")).toContain("success_0001.png");

    act(() => vi.advanceTimersByTime(FRAME_MS * 53)); // i=53 (末尾0054)
    expect(srcOf("milk-clip-pngseq")).toContain("success_0054.png");

    act(() => vi.advanceTimersByTime(FRAME_MS * 10)); // 進めても末尾静止
    expect(srcOf("milk-clip-pngseq")).toContain("success_0054.png");
  });
});

/* D. MilkAnimation 即時切替 — MilkStatus のクロスフェードは単体では発生しない */
describe("D. MilkAnimation 即時切替 (クロスフェード無し)", () => {
  test("状態切替でクリップが即時に入れ替わる (旧クリップは残らない)", () => {
    const { rerender } = render(
      <MilkAnimation state={DockState.Thinking} forceReduced={false} />
    );
    expect(screen.getByTestId("milk-clip-pngseq")).toBeInTheDocument(); // Thinking=pngseq

    rerender(<MilkAnimation state={DockState.Focus} forceReduced={false} />);
    expect(screen.getByTestId("milk-clip-video")).toBeInTheDocument(); // Focus=webm 即時
    expect(screen.queryByTestId("milk-clip-pngseq")).toBeNull();
  });
});
