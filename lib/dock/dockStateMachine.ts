import { DOCK_PRIORITY, DockEvent, DockState } from "./DockState";

/* ============================================================
   dockStateMachine — 純粋関数の状態遷移ロジック
   - resolveNextState: イベントから遷移先の論理状態を決める
   - shouldInterrupt:  現在状態を上書きしてよいかを優先度＋明示クリアで判定
   ============================================================ */

/** イベントから遷移先の論理状態を導く (割り込み可否は shouldInterrupt で別途判定) */
export function resolveNextState(current: DockState, event: DockEvent): DockState {
  switch (event.type) {
    case "input:start":
      // 入力開始 = 集中。Error中の再入力もここでクリアされ Focus へ
      return DockState.Focus;
    case "input:stop":
      return current === DockState.Focus ? DockState.Idle : current;
    case "api:start":
      // API送信 = 処理中/受付待機。states v2 では Loading を担当状態にする
      return DockState.Loading;
    case "api:success":
      return DockState.Success;
    case "api:error":
      return DockState.Error;
    case "listening:start":
      return DockState.Listening;
    case "thinking:start":
      return DockState.Thinking;
    case "surprised:start":
      return DockState.Surprised;
    case "error:retry":
      return DockState.Idle;
    case "success:timeout":
      return DockState.Idle;
    case "surprised:timeout":
      return DockState.Idle;
    default:
      return current;
  }
}

/** current → next の遷移を許可するか (優先度＋明示クリアイベントで判定) */
export function shouldInterrupt(
  current: DockState,
  next: DockState,
  event: DockEvent
): boolean {
  if (next === current) return false;

  /* --- 明示的にクリア(下降)するイベント --- */
  if (event.type === "error:retry") {
    return current === DockState.Error || current === DockState.Transition;
  }
  if (event.type === "success:timeout") {
    return current === DockState.Success;
  }
  if (event.type === "surprised:timeout") {
    return current === DockState.Surprised;
  }
  if (event.type === "input:stop") {
    return current === DockState.Focus;
  }

  /* --- Error は最優先(5)。再入力(input:start)でのみ下位へ抜けられる --- */
  if (current === DockState.Error) {
    return event.type === "input:start";
  }

  /* --- Success(4) は Error か「新規送信(api:start)」でのみ上書き --- */
  if (current === DockState.Success) {
    return next === DockState.Error || event.type === "api:start";
  }

  /* --- Surprised(3) は瞬間反応: Error / Success(api:success) / 入力開始(Focus)
         でのみ上書き。Thinking/Listening/Loading へは遷移しない
         (自動終了 surprised:timeout は上のクリア節で処理済み) --- */
  if (current === DockState.Surprised) {
    return (
      next === DockState.Error ||
      next === DockState.Success ||
      event.type === "input:start"
    );
  }

  /* --- 新規送信(api:start→Loading) は Focus など高優先からも処理開始を許可
         (Error/Success/Surprised は上の各節で既に判定済み) --- */
  if (event.type === "api:start") {
    return true;
  }

  /* --- Focus / Thinking / Listening / Loading / Idle:
         優先度が同等以上なら割り込み --- */
  return DOCK_PRIORITY[next] >= DOCK_PRIORITY[current];
}
