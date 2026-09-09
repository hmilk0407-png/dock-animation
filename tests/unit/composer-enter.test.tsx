import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, test, expect, afterEach, vi } from "vitest";
import Composer, { shouldSendOnEnter } from "@/components/Composer";

/* Composer のキー操作: Enter=送信 / Shift+Enter=改行 / IME変換中Enter=無視 */

afterEach(() => cleanup());

describe("shouldSendOnEnter (判定関数)", () => {
  test("Enter 単独は送信", () => {
    expect(shouldSendOnEnter({ key: "Enter", shiftKey: false })).toBe(true);
  });
  test("Shift+Enter は改行なので送信しない", () => {
    expect(shouldSendOnEnter({ key: "Enter", shiftKey: true })).toBe(false);
  });
  test("IME変換中 (isComposing) は送信しない", () => {
    expect(
      shouldSendOnEnter({ key: "Enter", shiftKey: false, nativeEvent: { isComposing: true } })
    ).toBe(false);
  });
  test("IME変換中 (keyCode 229) は送信しない", () => {
    expect(shouldSendOnEnter({ key: "Enter", shiftKey: false, keyCode: 229 })).toBe(false);
  });
  test("Enter 以外のキーは送信しない", () => {
    expect(shouldSendOnEnter({ key: "a", shiftKey: false })).toBe(false);
  });
});

function renderComposer(onSend = vi.fn(), sendDisabled = false) {
  render(
    <Composer
      input="こんにちは"
      setInput={() => {}}
      attachments={[]}
      removeAttachment={() => {}}
      attBusy={0}
      onPickFiles={() => {}}
      onSend={onSend}
      sendDisabled={sendDisabled}
    />
  );
  return onSend;
}

describe("Composer 実コンポーネント", () => {
  test("Enter で onSend が呼ばれる", () => {
    const onSend = renderComposer();
    fireEvent.keyDown(screen.getByTestId("composer-input"), { key: "Enter" });
    expect(onSend).toHaveBeenCalledTimes(1);
  });
  test("Shift+Enter では onSend が呼ばれない", () => {
    const onSend = renderComposer();
    fireEvent.keyDown(screen.getByTestId("composer-input"), { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });
  test("送信不可 (sendDisabled) のときは Enter でも呼ばれない", () => {
    const onSend = renderComposer(vi.fn(), true);
    fireEvent.keyDown(screen.getByTestId("composer-input"), { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });
});
