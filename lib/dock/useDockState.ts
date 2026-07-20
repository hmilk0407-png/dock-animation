"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DockEvent, DockState } from "./DockState";
import { resolveNextState, shouldInterrupt } from "./dockStateMachine";

/* ============================================================
   useDockState — ミルクの状態管理フック
   - trigger(event) で状態機械を駆動
   - Transition Layer: 状態切替時に isTransitioning を TRANSITION_MS の間 true
     (実際のクロスフェード描画は Dock 側の AnimatePresence が担当)
   - Success は SUCCESS_HOLD_MS 後に自動で Idle へ
   - Surprised は SURPRISED_HOLD_MS 後に自動で Idle へ (ワンショット36f)
   - Error は自動では消えず、input:start / error:retry で解除
   ============================================================ */

const SUCCESS_HOLD_MS = 1800; // Success → Idle への保持時間
const SURPRISED_HOLD_MS = 1200; // Surprised(36f) → Idle への保持時間 (ワンショット)
const TRANSITION_MS = 450; // 0.3〜0.6s のフェード時間

export function useDockState(initial: DockState = DockState.Idle) {
  const [state, setState] = useState<DockState>(initial);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const surprisedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSuccess = useCallback(() => {
    if (successTimer.current) {
      clearTimeout(successTimer.current);
      successTimer.current = null;
    }
  }, []);

  const clearSurprised = useCallback(() => {
    if (surprisedTimer.current) {
      clearTimeout(surprisedTimer.current);
      surprisedTimer.current = null;
    }
  }, []);

  /* Transition Layer: フェードを挟んで論理状態を切り替える */
  const commit = useCallback((next: DockState) => {
    setIsTransitioning(true);
    setState(next);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(
      () => setIsTransitioning(false),
      TRANSITION_MS
    );
  }, []);

  const trigger = useCallback(
    (event: DockEvent) => {
      const current = stateRef.current;
      const next = resolveNextState(current, event);
      if (!shouldInterrupt(current, next, event)) return;

      clearSuccess();
      clearSurprised();
      commit(next);

      /* Success は一定時間後に自動で Idle へ (その時点でもSuccessなら) */
      if (next === DockState.Success) {
        successTimer.current = setTimeout(() => {
          if (stateRef.current === DockState.Success) commit(DockState.Idle);
        }, SUCCESS_HOLD_MS);
      }

      /* Surprised もワンショット: 一定時間後に自動で Idle へ */
      if (next === DockState.Surprised) {
        surprisedTimer.current = setTimeout(() => {
          if (stateRef.current === DockState.Surprised) commit(DockState.Idle);
        }, SURPRISED_HOLD_MS);
      }
    },
    [clearSuccess, clearSurprised, commit]
  );

  useEffect(
    () => () => {
      clearSuccess();
      clearSurprised();
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    },
    [clearSuccess, clearSurprised]
  );

  return { state, isTransitioning, trigger };
}
