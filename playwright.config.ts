import { defineConfig, devices } from "@playwright/test";

/* Dock アニメ E2E 用 Playwright 設定。
   - retries=2 (CI): on-first-retry の trace を有効化
   - expect.timeout=10s: クロスフェード/描画待ちの余裕
   - webServer: CI では .next(build artifact)を再利用して next start */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  expect: { timeout: 10_000 },
  reporter: [["html"], ["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "dummy",
      ANTHROPIC_API_KEY: "dummy",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
