import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

/* Dock アニメ 単体テスト用 Vitest 設定 (jsdom + fake timers)。 */
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, ".") } }, // tsconfig paths @/* -> ./*
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
});
