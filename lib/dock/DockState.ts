/* ============================================================
   DockState — ミルク(受付)の状態モデル (states v2 / 8状態)
   Idle / Focus / Success / Error /
   Thinking / Listening / Loading / Surprised / Transition
   種別: ループ(180f)= Idle/Focus/Thinking/Listening/Loading
         ワンショット(36f系)= Success/Error/Surprised
   優先度: Error(5) > Success(4) > Surprised(3) > Focus(2)
           > Thinking/Listening/Loading(1) > Idle(0)
   (Transition は遷移中のフェード表現でありN/A)
   ============================================================ */

export enum DockState {
  Idle = "idle",
  Focus = "focus",
  Success = "success",
  Error = "error",
  Thinking = "thinking",
  Listening = "listening",
  Loading = "loading",
  Surprised = "surprised",
  Transition = "transition",
}

/** ミルクの状態を動かすイベント。*:timeout はフック内部用 */
export type DockEvent =
  | { type: "input:start" }
  | { type: "input:stop" }
  | { type: "api:start" }
  | { type: "api:success" }
  | { type: "api:error" }
  | { type: "listening:start" }
  | { type: "thinking:start" }
  | { type: "surprised:start" }
  | { type: "error:retry" }
  | { type: "success:timeout" }
  | { type: "surprised:timeout" };

/** 割り込み判定に使う優先度テーブル (数値が大きいほど強い) */
export const DOCK_PRIORITY: Record<DockState, number> = {
  [DockState.Idle]: 0,
  [DockState.Thinking]: 1,
  [DockState.Listening]: 1,
  [DockState.Loading]: 1,
  [DockState.Focus]: 2,
  [DockState.Surprised]: 3,
  [DockState.Success]: 4,
  [DockState.Error]: 5,
  [DockState.Transition]: -1,
};
