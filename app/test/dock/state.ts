/* ============================================================
   app/test/dock/state.ts
   テストハーネス用: DockState 列挙の再エクスポート
   (Playwright テストからも import しやすいように集約)
   ============================================================ */
export { DockState } from "@/lib/dock/DockState";
export type { DockEvent } from "@/lib/dock/DockState";

/** UI に並べる 8 状態の順序 (Playwright のボタン走査用) */
import { DockState } from "@/lib/dock/DockState";
export const TEST_STATES: DockState[] = [
  DockState.Idle,
  DockState.Focus,
  DockState.Success,
  DockState.Error,
  DockState.Thinking,
  DockState.Listening,
  DockState.Loading,
  DockState.Surprised,
];
