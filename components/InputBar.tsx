"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { BLUE, CARD, FIELD, LINE, MUTED, TEXT } from "@/lib/theme";

/* ============================================================
   InputBar — 汎用の入力欄コンポーネント
   - textarea 自動リサイズ (minHeight〜maxHeight、超過分はスクロール)
   - 送信ボタン (Cmd/Ctrl + Enter でも送信)
   - 入力中ドットアニメーション:
       * ユーザーがタイプしている間「● ● ● 入力中」を表示 (1.1秒無操作で消灯)
       * busy=true の間は busyLabel 付きでドットを表示し送信を無効化
   - value/onChange を渡せば制御コンポーネント、省略時は内部stateで動作
     (制御モードでは送信後のクリアは親側で行う)
   - ドットの見た目は app/globals.css の .buhi-dot (buhiDot keyframes) を使用
   ============================================================ */

type InputBarProps = {
  /** 入力値 (省略時は内部stateの非制御モード) */
  value?: string;
  onChange?: (v: string) => void;
  /** 送信時に trim 済みテキストを渡す (非制御時は送信後に自動クリア) */
  onSend: (text: string) => void;
  /** 送信ボタンを強制無効化 */
  disabled?: boolean;
  /** 処理中フラグ: ドット + busyLabel を表示し送信を無効化 */
  busy?: boolean;
  busyLabel?: string;
  placeholder?: string;
  sendLabel?: string;
  /** 自動リサイズの下限/上限(px)。上限を超えるとスクロールに切替 */
  minHeight?: number;
  maxHeight?: number;
};

const InputBar = forwardRef<HTMLTextAreaElement, InputBarProps>(
  function InputBar(
    {
      value,
      onChange,
      onSend,
      disabled = false,
      busy = false,
      busyLabel = "対応中",
      placeholder = "依頼内容を入力（Ctrl+Enterで送信）",
      sendLabel = "依頼",
      minHeight = 80,
      maxHeight = 240,
    },
    taRef
  ) {
    const isControlled = value !== undefined;
    const [inner, setInner] = useState("");
    const val = isControlled ? (value as string) : inner;

    const [typing, setTyping] = useState(false);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    /* ---------- textarea 自動リサイズ ---------- */
    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      const h = Math.max(minHeight, el.scrollHeight);
      el.style.height = Math.min(h, maxHeight) + "px";
      el.style.overflowY = h > maxHeight ? "auto" : "hidden";
    }, [val, minHeight, maxHeight]);

    /* ---------- 入力中判定: 変更のたびに点灯、1.1秒無操作で消灯 ---------- */
    function markTyping() {
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 1100);
    }
    useEffect(
      () => () => {
        if (typingTimer.current) clearTimeout(typingTimer.current);
      },
      []
    );

    function setVal(v: string) {
      if (!isControlled) setInner(v);
      onChange?.(v);
      markTyping();
    }

    const sendDisabled = disabled || busy || !val.trim();

    function send() {
      const text = val.trim();
      if (!text || sendDisabled) return;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      setTyping(false);
      onSend(text);
      if (!isControlled) setInner("");
      innerRef.current?.focus();
    }

    const showBusyDots = busy;
    const showTypingDots = !busy && typing;

    return (
      <div
        className="flex flex-col p-2 rounded-2xl"
        style={{
          background: CARD,
          border: `1px solid ${LINE}`,
          boxShadow: "0 2px 10px rgba(20,38,62,0.08)",
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={(el) => {
              innerRef.current = el;
              if (typeof taRef === "function") taRef(el);
              else if (taRef) taRef.current = el;
            }}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none outline-none px-2 py-2"
            style={{
              fontSize: 14,
              background: "transparent",
              fontFamily: "inherit",
              color: TEXT,
              lineHeight: 1.7,
              minHeight,
              overflow: "hidden",
            }}
          />
          <button
            onClick={send}
            disabled={sendDisabled}
            aria-label="依頼を送信"
            className="px-4 py-2 rounded-lg flex-shrink-0"
            style={{
              background: sendDisabled ? "#D6D9E0" : BLUE,
              color: sendDisabled ? "#8B94A6" : "#FFFFFF",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: sendDisabled ? "none" : "0 2px 10px rgba(46,95,216,0.30)",
              transition: "background 0.15s ease",
            }}
          >
            {sendLabel}
          </button>
        </div>

        {/* ステータス行 (高さ固定でレイアウトのガタつきを防ぐ) */}
        <div
          className="flex items-center px-2"
          style={{ height: 18 }}
          aria-live="polite"
        >
          {(showBusyDots || showTypingDots) && (
            <span className="flex items-center">
              <span className="buhi-dot" />
              <span className="buhi-dot" style={{ animationDelay: "0.15s" }} />
              <span className="buhi-dot" style={{ animationDelay: "0.3s" }} />
              <span
                style={{
                  marginLeft: 7,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: showBusyDots ? BLUE : MUTED,
                }}
              >
                {showBusyDots ? busyLabel : "入力中"}
              </span>
            </span>
          )}
        </div>
      </div>
    );
  }
);

export default InputBar;
