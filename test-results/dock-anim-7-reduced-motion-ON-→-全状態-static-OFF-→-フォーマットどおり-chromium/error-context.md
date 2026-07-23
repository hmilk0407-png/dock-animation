# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dock-anim.spec.ts >> 7. reduced-motion >> ON → 全状態 static / OFF → フォーマットどおり
- Location: e2e/dock-anim.spec.ts:148:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('milk-clip-static')
Expected: visible
Error: strict mode violation: getByTestId('milk-clip-static') resolved to 2 elements:
    1) <span data-testid="milk-clip-static">…</span> aka getByTestId('milk-clip-static').first()
    2) <span data-testid="milk-clip-static">…</span> aka getByTestId('milk-clip-static').nth(1)

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByTestId('milk-clip-static')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - heading "🐶 ミルク アニメーション確認ページ" [level=1] [ref=e4]
      - paragraph [ref=e5]: Dock 受付キャラ「ミルク」の8状態を確認できます(開発用ハーネス・CI 共用)
      - generic [ref=e6]:
        - img [ref=e10]
        - generic [ref=e38]:
          - generic [ref=e39]: 現在の状態
          - generic [ref=e40]:
            - text: 待機
            - generic [ref=e41]: idle
          - generic [ref=e42]: 呼吸しながらときどき瞬き(Lottie・6秒ループ)
          - generic [ref=e43]:
            - generic [ref=e44]: "Dock実寸(48px):"
            - img [ref=e48]
      - generic [ref=e76]:
        - button "待機 idle" [active] [ref=e77] [cursor=pointer]:
          - text: 待機
          - generic [ref=e78]: idle
        - button "集中 focus" [ref=e79] [cursor=pointer]:
          - text: 集中
          - generic [ref=e80]: focus
        - button "成功 success" [ref=e81] [cursor=pointer]:
          - text: 成功
          - generic [ref=e82]: success
        - button "エラー error" [ref=e83] [cursor=pointer]:
          - text: エラー
          - generic [ref=e84]: error
        - button "考え中 thinking" [ref=e85] [cursor=pointer]:
          - text: 考え中
          - generic [ref=e86]: thinking
        - button "傾聴 listening" [ref=e87] [cursor=pointer]:
          - text: 傾聴
          - generic [ref=e88]: listening
        - button "処理中 loading" [ref=e89] [cursor=pointer]:
          - text: 処理中
          - generic [ref=e90]: loading
        - button "びっくり surprised" [ref=e91] [cursor=pointer]:
          - text: びっくり
          - generic [ref=e92]: surprised
      - generic [ref=e93]:
        - 'button "動きを減らす(reduced-motion): on" [ref=e94] [cursor=pointer]'
        - generic [ref=e95]: on にすると全状態が静止画になります(アクセシビリティ確認用)
  - alert [ref=e96]
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | 
  3   | /* Dock UI アニメ E2E (ハーネス /test/dock を駆動)。
  4   |    実装整合: clip testid(video/pngseq/lottie/static) / フォーマット(Idle=lottie,
  5   |    Thinking・Surprised=pngseq, 他=webm) / Surprised 1200ms→Idle /
  6   |    MilkStatus 0.45s フェード(切替後 600ms 待機で判定)。
  7   |    Lottie は fetch 成功後のみ描画 → JSON を最小 Lottie でモック(欠損は 404)。 */
  8   | 
  9   | const MINIMAL_LOTTIE = {
  10  |   v: "5.7.4", fr: 30, ip: 0, op: 30, w: 100, h: 100,
  11  |   nm: "e2e", ddd: 0, assets: [], layers: [],
  12  | };
  13  | 
  14  | const CLIP_BY_STATE: Record<string, string> = {
  15  |   idle: "milk-clip-lottie",
  16  |   focus: "milk-clip-video",
  17  |   success: "milk-clip-video",
  18  |   error: "milk-clip-video",
  19  |   thinking: "milk-clip-pngseq",
  20  |   listening: "milk-clip-video",
  21  |   loading: "milk-clip-video",
  22  |   surprised: "milk-clip-pngseq",
  23  | };
  24  | const ALL_CLIPS = [
  25  |   "milk-clip-video",
  26  |   "milk-clip-pngseq",
  27  |   "milk-clip-lottie",
  28  |   "milk-clip-static",
  29  | ];
  30  | const CROSSFADE_MS = 600; // MilkStatus 0.45s フェード + 余裕
  31  | 
  32  | async function goToState(page: Page, state: string) {
  33  |   await page.getByTestId(`dock-btn-${state}`).click();
  34  |   await expect(page.getByTestId("dock-current-state")).toHaveText(state);
  35  |   await page.waitForTimeout(CROSSFADE_MS);
  36  | }
  37  | 
  38  | async function expectOnlyClip(page: Page, testid: string) {
> 39  |   await expect(page.getByTestId(testid)).toBeVisible();
      |                                          ^ Error: expect(locator).toBeVisible() failed
  40  |   for (const other of ALL_CLIPS) {
  41  |     if (other !== testid) await expect(page.getByTestId(other)).toHaveCount(0);
  42  |   }
  43  | }
  44  | 
  45  | test.beforeEach(async ({ page }) => {
  46  |   await page.route("**/milk/**/*.json", (route) =>
  47  |     route.fulfill({
  48  |       contentType: "application/json",
  49  |       body: JSON.stringify(MINIMAL_LOTTIE),
  50  |     })
  51  |   );
  52  |   await page.goto("/test/dock");
  53  | });
  54  | 
  55  | test.describe("1. セットアップ", () => {
  56  |   test("初期状態 Idle で lottie が描画される", async ({ page }) => {
  57  |     await expect(page.getByTestId("dock-current-state")).toHaveText("idle");
  58  |     await expect(page.getByTestId("dock-reduced-motion")).toHaveText("off");
  59  |     await page.waitForTimeout(CROSSFADE_MS);
  60  |     await expect(page.getByTestId("milk-clip-lottie")).toBeVisible();
  61  |   });
  62  | });
  63  | 
  64  | test.describe("2. 状態切替 (8状態) → 対応クリップ", () => {
  65  |   for (const [state, clip] of Object.entries(CLIP_BY_STATE)) {
  66  |     test(`${state} → ${clip}`, async ({ page }) => {
  67  |       await goToState(page, state);
  68  |       await expectOnlyClip(page, clip);
  69  |     });
  70  |   }
  71  | });
  72  | 
  73  | test.describe("3. Surprised → 1200ms → Idle (expect.poll で安定化)", () => {
  74  |   test("Surprised(pngseq) が 1200ms 後に Idle(lottie) へ戻る", async ({ page }) => {
  75  |     await page.getByTestId("dock-btn-surprised").click();
  76  |     await expect(page.getByTestId("dock-current-state")).toHaveText("surprised");
  77  |     await page.waitForTimeout(CROSSFADE_MS); // <1200ms なのでまだ surprised
  78  |     await expect(page.getByTestId("milk-clip-pngseq")).toBeVisible();
  79  | 
  80  |     // 1200ms 自動戻りを expect.poll で待つ (retry/timing 揺らぎに強い)
  81  |     await expect
  82  |       .poll(async () => (await page.getByTestId("dock-current-state").textContent())?.trim(), {
  83  |         timeout: 3000,
  84  |       })
  85  |       .toBe("idle");
  86  |     await page.waitForTimeout(CROSSFADE_MS); // Idle への crossfade
  87  |     await expect(page.getByTestId("milk-clip-lottie")).toBeVisible();
  88  |     await expect(page.getByTestId("milk-clip-pngseq")).toHaveCount(0);
  89  |   });
  90  | });
  91  | 
  92  | test.describe("4. PNGseq フレーム進行 (簡易)", () => {
  93  |   test("Thinking の <img> src が連番で変化する", async ({ page }) => {
  94  |     await goToState(page, "thinking");
  95  |     const img = page.getByTestId("milk-clip-pngseq");
  96  |     await expect(img).toBeVisible();
  97  | 
  98  |     const seen = new Set<string>();
  99  |     for (let k = 0; k < 6; k++) {
  100 |       seen.add((await img.getAttribute("src")) ?? "");
  101 |       await page.waitForTimeout(80);
  102 |     }
  103 |     expect(seen.size).toBeGreaterThan(1);
  104 |     expect([...seen].every((s) => /thinking_\d{4}\.png$/.test(s))).toBeTruthy();
  105 |   });
  106 | });
  107 | 
  108 | test.describe("5. Lottie 描画", () => {
  109 |   test("Idle で milk-clip-lottie が描画される (fetch 成功)", async ({ page }) => {
  110 |     await goToState(page, "idle");
  111 |     await expect(page.getByTestId("milk-clip-lottie")).toBeVisible();
  112 |   });
  113 | 
  114 |   test("JSON 欠損時は null (milk-clip-lottie が現れない)", async ({ page }) => {
  115 |     await page.route("**/milk/**/*.json", (route) => route.fulfill({ status: 404 }));
  116 |     await page.goto("/test/dock");
  117 |     await expect(page.getByTestId("dock-current-state")).toHaveText("idle");
  118 |     await page.waitForTimeout(700);
  119 |     await expect(page.getByTestId("milk-clip-lottie")).toHaveCount(0);
  120 |     await expect(page.getByTestId("milk-clip-video")).toHaveCount(0);
  121 |     await expect(page.getByTestId("milk-clip-pngseq")).toHaveCount(0);
  122 |   });
  123 | });
  124 | 
  125 | test.describe("6. WebM 描画", () => {
  126 |   for (const state of ["focus", "error", "listening", "loading"]) {
  127 |     test(`${state} で milk-clip-video が loop=true`, async ({ page }) => {
  128 |       await goToState(page, state);
  129 |       const v = page.getByTestId("milk-clip-video");
  130 |       await expect(v).toBeVisible();
  131 |       await expect(v).toHaveJSProperty("loop", true);
  132 |     });
  133 |   }
  134 | 
  135 |   test("Success は loop=false (ワンショット)", async ({ page }) => {
  136 |     await goToState(page, "success");
  137 |     const v = page.getByTestId("milk-clip-video");
  138 |     await expect(v).toBeVisible();
  139 |     await expect(v).toHaveJSProperty("loop", false);
```