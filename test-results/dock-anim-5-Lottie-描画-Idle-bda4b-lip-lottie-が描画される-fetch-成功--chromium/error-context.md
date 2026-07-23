# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dock-anim.spec.ts >> 5. Lottie 描画 >> Idle で milk-clip-lottie が描画される (fetch 成功)
- Location: e2e/dock-anim.spec.ts:109:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('milk-clip-lottie')
Expected: visible
Error: strict mode violation: getByTestId('milk-clip-lottie') resolved to 2 elements:
    1) <div data-testid="milk-clip-lottie">…</div> aka getByTestId('milk-clip-lottie').first()
    2) <div data-testid="milk-clip-lottie">…</div> aka getByTestId('milk-clip-lottie').nth(1)

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByTestId('milk-clip-lottie')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - heading "🐶 ミルク アニメーション確認ページ" [level=1] [ref=e4]
      - paragraph [ref=e5]: Dock 受付キャラ「ミルク」の8状態を確認できます(開発用ハーネス・CI 共用)
      - generic [ref=e6]:
        - img [ref=e11]
        - generic [ref=e12]:
          - generic [ref=e13]: 現在の状態
          - generic [ref=e14]:
            - text: 待機
            - generic [ref=e15]: idle
          - generic [ref=e16]: 呼吸しながらときどき瞬き(Lottie・6秒ループ)
          - generic [ref=e17]:
            - generic [ref=e18]: "Dock実寸(48px):"
            - img [ref=e23]
      - generic [ref=e24]:
        - button "待機 idle" [active] [ref=e25] [cursor=pointer]:
          - text: 待機
          - generic [ref=e26]: idle
        - button "集中 focus" [ref=e27] [cursor=pointer]:
          - text: 集中
          - generic [ref=e28]: focus
        - button "成功 success" [ref=e29] [cursor=pointer]:
          - text: 成功
          - generic [ref=e30]: success
        - button "エラー error" [ref=e31] [cursor=pointer]:
          - text: エラー
          - generic [ref=e32]: error
        - button "考え中 thinking" [ref=e33] [cursor=pointer]:
          - text: 考え中
          - generic [ref=e34]: thinking
        - button "傾聴 listening" [ref=e35] [cursor=pointer]:
          - text: 傾聴
          - generic [ref=e36]: listening
        - button "処理中 loading" [ref=e37] [cursor=pointer]:
          - text: 処理中
          - generic [ref=e38]: loading
        - button "びっくり surprised" [ref=e39] [cursor=pointer]:
          - text: びっくり
          - generic [ref=e40]: surprised
      - generic [ref=e41]:
        - 'button "動きを減らす(reduced-motion): off" [ref=e42] [cursor=pointer]'
        - generic [ref=e43]: on にすると全状態が静止画になります(アクセシビリティ確認用)
  - alert [ref=e44]
```

# Test source

```ts
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
  39  |   await expect(page.getByTestId(testid)).toBeVisible();
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
> 111 |     await expect(page.getByTestId("milk-clip-lottie")).toBeVisible();
      |                                                        ^ Error: expect(locator).toBeVisible() failed
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
  140 |     // 注: 実際の末尾静止(paused=true)は再生可能な webm 実ファイルが必要。
  141 |     //     実アセット配置時は下記で検証可 (要 milk_success.webm):
  142 |     // await page.waitForTimeout(1900);
  143 |     // await expect(v).toHaveJSProperty("paused", true);
  144 |   });
  145 | });
  146 | 
  147 | test.describe("7. reduced-motion", () => {
  148 |   test("ON → 全状態 static / OFF → フォーマットどおり", async ({ page }) => {
  149 |     await page.getByTestId("toggle-reduced-motion").click();
  150 |     await expect(page.getByTestId("dock-reduced-motion")).toHaveText("on");
  151 |     for (const state of ["idle", "focus", "thinking", "surprised"]) {
  152 |       await goToState(page, state);
  153 |       await expectOnlyClip(page, "milk-clip-static");
  154 |     }
  155 |     await page.getByTestId("toggle-reduced-motion").click();
  156 |     await expect(page.getByTestId("dock-reduced-motion")).toHaveText("off");
  157 |     await goToState(page, "focus");
  158 |     await expectOnlyClip(page, "milk-clip-video");
  159 |     await goToState(page, "thinking");
  160 |     await expectOnlyClip(page, "milk-clip-pngseq");
  161 |   });
  162 | });
  163 | 
```