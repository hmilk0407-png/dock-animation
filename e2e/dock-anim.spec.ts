import { test, expect, type Page } from "@playwright/test";

/* Dock UI アニメ E2E (ハーネス /test/dock を駆動)。
   実装整合: clip testid(video/pngseq/lottie/static) / フォーマット(Idle=lottie,
   Thinking・Surprised=pngseq, 他=webm) / Surprised 1200ms→Idle /
   MilkStatus 0.45s フェード(切替後 600ms 待機で判定)。
   Lottie は fetch 成功後のみ描画 → JSON を最小 Lottie でモック(欠損は 404)。 */

const MINIMAL_LOTTIE = {
  v: "5.7.4", fr: 30, ip: 0, op: 30, w: 100, h: 100,
  nm: "e2e", ddd: 0, assets: [], layers: [],
};

const CLIP_BY_STATE: Record<string, string> = {
  idle: "milk-clip-lottie",
  focus: "milk-clip-video",
  success: "milk-clip-video",
  error: "milk-clip-video",
  thinking: "milk-clip-pngseq",
  listening: "milk-clip-video",
  loading: "milk-clip-video",
  surprised: "milk-clip-pngseq",
};
const ALL_CLIPS = [
  "milk-clip-video",
  "milk-clip-pngseq",
  "milk-clip-lottie",
  "milk-clip-static",
];
const CROSSFADE_MS = 600; // MilkStatus 0.45s フェード + 余裕

async function goToState(page: Page, state: string) {
  await page.getByTestId(`dock-btn-${state}`).click();
  await expect(page.getByTestId("dock-current-state")).toHaveText(state);
  await page.waitForTimeout(CROSSFADE_MS);
}

async function expectOnlyClip(page: Page, testid: string) {
  await expect(page.getByTestId(testid)).toBeVisible();
  for (const other of ALL_CLIPS) {
    if (other !== testid) await expect(page.getByTestId(other)).toHaveCount(0);
  }
}

test.beforeEach(async ({ page }) => {
  await page.route("**/milk/**/*.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(MINIMAL_LOTTIE),
    })
  );
  await page.goto("/test/dock");
});

test.describe("1. セットアップ", () => {
  test("初期状態 Idle で lottie が描画される", async ({ page }) => {
    await expect(page.getByTestId("dock-current-state")).toHaveText("idle");
    await expect(page.getByTestId("dock-reduced-motion")).toHaveText("off");
    await page.waitForTimeout(CROSSFADE_MS);
    await expect(page.getByTestId("milk-clip-lottie")).toBeVisible();
  });
});

test.describe("2. 状態切替 (8状態) → 対応クリップ", () => {
  for (const [state, clip] of Object.entries(CLIP_BY_STATE)) {
    test(`${state} → ${clip}`, async ({ page }) => {
      await goToState(page, state);
      await expectOnlyClip(page, clip);
    });
  }
});

test.describe("3. Surprised → 1200ms → Idle (expect.poll で安定化)", () => {
  test("Surprised(pngseq) が 1200ms 後に Idle(lottie) へ戻る", async ({ page }) => {
    await page.getByTestId("dock-btn-surprised").click();
    await expect(page.getByTestId("dock-current-state")).toHaveText("surprised");
    await page.waitForTimeout(CROSSFADE_MS); // <1200ms なのでまだ surprised
    await expect(page.getByTestId("milk-clip-pngseq")).toBeVisible();

    // 1200ms 自動戻りを expect.poll で待つ (retry/timing 揺らぎに強い)
    await expect
      .poll(async () => (await page.getByTestId("dock-current-state").textContent())?.trim(), {
        timeout: 3000,
      })
      .toBe("idle");
    await page.waitForTimeout(CROSSFADE_MS); // Idle への crossfade
    await expect(page.getByTestId("milk-clip-lottie")).toBeVisible();
    await expect(page.getByTestId("milk-clip-pngseq")).toHaveCount(0);
  });
});

test.describe("4. PNGseq フレーム進行 (簡易)", () => {
  test("Thinking の <img> src が連番で変化する", async ({ page }) => {
    await goToState(page, "thinking");
    const img = page.getByTestId("milk-clip-pngseq");
    await expect(img).toBeVisible();

    const seen = new Set<string>();
    for (let k = 0; k < 6; k++) {
      seen.add((await img.getAttribute("src")) ?? "");
      await page.waitForTimeout(80);
    }
    expect(seen.size).toBeGreaterThan(1);
    expect([...seen].every((s) => /thinking_\d{4}\.png$/.test(s))).toBeTruthy();
  });
});

test.describe("5. Lottie 描画", () => {
  test("Idle で milk-clip-lottie が描画される (fetch 成功)", async ({ page }) => {
    await goToState(page, "idle");
    await expect(page.getByTestId("milk-clip-lottie")).toBeVisible();
  });

  test("JSON 欠損時は null (milk-clip-lottie が現れない)", async ({ page }) => {
    await page.route("**/milk/**/*.json", (route) => route.fulfill({ status: 404 }));
    await page.goto("/test/dock");
    await expect(page.getByTestId("dock-current-state")).toHaveText("idle");
    await page.waitForTimeout(700);
    await expect(page.getByTestId("milk-clip-lottie")).toHaveCount(0);
    await expect(page.getByTestId("milk-clip-video")).toHaveCount(0);
    await expect(page.getByTestId("milk-clip-pngseq")).toHaveCount(0);
  });
});

test.describe("6. WebM 描画", () => {
  for (const state of ["focus", "error", "listening", "loading"]) {
    test(`${state} で milk-clip-video が loop=true`, async ({ page }) => {
      await goToState(page, state);
      const v = page.getByTestId("milk-clip-video");
      await expect(v).toBeVisible();
      await expect(v).toHaveJSProperty("loop", true);
    });
  }

  test("Success は loop=false (ワンショット)", async ({ page }) => {
    await goToState(page, "success");
    const v = page.getByTestId("milk-clip-video");
    await expect(v).toBeVisible();
    await expect(v).toHaveJSProperty("loop", false);
    // 注: 実際の末尾静止(paused=true)は再生可能な webm 実ファイルが必要。
    //     実アセット配置時は下記で検証可 (要 milk_success.webm):
    // await page.waitForTimeout(1900);
    // await expect(v).toHaveJSProperty("paused", true);
  });
});

test.describe("7. reduced-motion", () => {
  test("ON → 全状態 static / OFF → フォーマットどおり", async ({ page }) => {
    await page.getByTestId("toggle-reduced-motion").click();
    await expect(page.getByTestId("dock-reduced-motion")).toHaveText("on");
    for (const state of ["idle", "focus", "thinking", "surprised"]) {
      await goToState(page, state);
      await expectOnlyClip(page, "milk-clip-static");
    }
    await page.getByTestId("toggle-reduced-motion").click();
    await expect(page.getByTestId("dock-reduced-motion")).toHaveText("off");
    await goToState(page, "focus");
    await expectOnlyClip(page, "milk-clip-video");
    await goToState(page, "thinking");
    await expectOnlyClip(page, "milk-clip-pngseq");
  });
});
