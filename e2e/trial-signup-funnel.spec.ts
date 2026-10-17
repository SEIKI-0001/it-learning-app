import { devices, expect, test, type Page } from "@playwright/test";

// 無料体験 → 登録 → 最初の学習問題まで（スマホ）。
// 計測は自動操作のブラウザからは送らない作りなので、navigator.webdriver を偽って送らせ、
// /api/funnel は DB に書かずにここで受け取る。Google 認可の往復はできないので、
// 登録後は /auth/callback の戻り先（/onboarding）を直接開いて続ける。

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { defaultBrowserType, ...pixel } = devices["Pixel 7"];
test.use(pixel);

type Sent = { event: string; path: string; placement?: string | null; targetPath?: string | null };

async function captureFunnel(page: Page): Promise<Sent[]> {
  const sent: Sent[] = [];
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
  });
  await page.route("**/api/funnel", async (route) => {
    sent.push(JSON.parse(route.request().postData() ?? "{}") as Sent);
    await route.fulfill({ status: 204 });
  });
  return sent;
}

// 固定バーが要るのは、最後のスライドの下に登録ボタンが隠れる小さめの画面（iPhone SE 相当）。
const SMALL_PHONE = { width: 375, height: 667 };

const events = (sent: Sent[]) => sent.map((s) => s.event);

async function expectInViewport(page: Page, selector: ReturnType<Page["locator"]>) {
  const box = await selector.boundingBox();
  const vh = page.viewportSize()!.height;
  expect(box, "要素が描画されている").not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vh);
}

test("体験を最後まで進めると、続きのメリットと押しやすい登録ボタンが出て、流入元を保ったまま登録画面へ進む", async ({
  page,
  context,
}) => {
  const sent = await captureFunnel(page);
  await page.setViewportSize(SMALL_PHONE);
  await page.goto("/lp/try?utm_source=x&utm_medium=social&utm_campaign=trial");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => events(sent)).toContain("view");

  // 体験は登録なしで最後まで使える。完了前は登録の固定バーを出さない。
  const sticky = page.getByRole("region", { name: "体験の続き" });
  await expect(sticky).toHaveCount(0);
  const next = page.getByRole("button", { name: "次の解説へ" });
  while (await next.isEnabled()) {
    await next.click();
    await page.waitForTimeout(150);
  }
  await expect.poll(() => events(sent)).toEqual(expect.arrayContaining(["trial_start", "trial_complete"]));
  expect(events(sent).filter((e) => e === "trial_complete")).toHaveLength(1);

  await expect(page.getByRole("heading", { name: "この続きを、あなたの試験日に合わせて。" })).toBeAttached();
  await expect(page.getByText(/全\d+トピックの教材と確認問題、公式過去問\d+問を無料で使えます/)).toBeAttached();
  await expect(page.getByText(/記録の保存は登録から\d+日間無料/)).toBeAttached();

  // スマホでは最後のスライドを見たまま押せるよう、画面下に固定の登録ボタンが出る。
  await expect(sticky).toBeVisible();
  const stickyCta = sticky.getByRole("link", { name: "無料で登録して続きを学ぶ" });
  await expectInViewport(page, stickyCta);
  expect((await stickyCta.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/trial-complete-mobile.png" });

  await stickyCta.click();
  await expect(page).toHaveURL(/\/login\?next=%2Fonboarding&from=trial$|\/login\?next=\/onboarding&from=trial$/);
  expect(sent).toContainEqual(
    expect.objectContaining({ event: "click", placement: "trial_sticky_signup", targetPath: "/login" }),
  );

  // 体験から来たことと、この後の流れを示し、ログイン手段を最初の画面に入れる。
  await expect(page.getByRole("heading", { name: /この続きを、.*合格プラン.*で。/ })).toBeVisible();
  await expectInViewport(page, page.getByText(/Google ログインは現在準備中|Google で続ける/).first());
  await expect.poll(() => sent.some((s) => s.event === "view" && s.path === "/login")).toBe(true);
  await page.screenshot({ path: "test-results/login-from-trial-mobile.png" });

  // 流入元（first-touch）は登録画面でも残り、別の utm で来ても上書きされない。
  const attr = async () =>
    decodeURIComponent((await context.cookies()).find((c) => c.name === "fq_attr")?.value ?? "");
  expect(await attr()).toContain('"s":"x"');
  expect(await attr()).toContain('"lp":"/lp/try"');
  await page.goto("/lp?utm_source=other");
  expect(await attr()).toContain('"s":"x"');
});

test("体験完了後の固定バーは閉じられ、完了カードが見えている間は重ねない", async ({ page }) => {
  await captureFunnel(page);
  await page.setViewportSize(SMALL_PHONE);
  await page.goto("/lp/try");
  const next = page.getByRole("button", { name: "次の解説へ" });
  await expect(next).toBeVisible({ timeout: 30_000 });
  while (await next.isEnabled()) await next.click();
  const sticky = page.getByRole("region", { name: "体験の続き" });
  await expect(sticky).toBeVisible();

  await page
    .getByRole("region", { name: "この続きを、あなたの試験日に合わせて。" })
    .getByRole("link", { name: "無料で登録して続きを学ぶ" })
    .scrollIntoViewIfNeeded();
  await expect(sticky).toHaveCount(0);
  await page.getByRole("button", { name: "前の解説へ" }).scrollIntoViewIfNeeded();
  await expect(sticky).toBeVisible();
  await sticky.getByRole("button", { name: "閉じる" }).click();
  await expect(sticky).toHaveCount(0);
});

test("登録後、初回設定から最初の確認問題に答えるまでの段階を順に数え、設定済みなら初回設定をやり直させない", async ({
  page,
}) => {
  const sent = await captureFunnel(page);
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "試験はいつ受けますか？" })).toBeVisible({
    timeout: 30_000,
  });
  await expect.poll(() => events(sent)).toContain("onboarding_view");

  // 途中の質問は既定値のまま「おまかせ」で完了できる。
  await page.getByRole("button", { name: "残りはおまかせで始める" }).click();
  await page.getByRole("button", { name: "今日の学習をはじめる" }).click();
  await expect(page).toHaveURL(/\/today\?guide=1$/);
  const guide = page.getByRole("dialog", { name: "ようこそ！ここが毎日のスタート地点です" });
  await guide.getByRole("button", { name: "スキップ", exact: true }).click();

  await page.getByRole("link", { name: "レッスンを始める" }).or(page.getByRole("button", { name: "レッスンを始める" })).first().click();
  await expect(page).toHaveURL(/\/learn\//);
  const question = page.locator("[data-funnel-question]").first();
  await question.scrollIntoViewIfNeeded();
  await expect.poll(() => events(sent)).toContain("first_question_view");
  await question.getByRole("button").first().click();

  const steps = [
    "onboarding_view",
    "onboarding_complete",
    "today_view",
    "lesson_open",
    "first_question_view",
    "first_answer",
  ];
  await expect.poll(() => events(sent).filter((e) => steps.includes(e))).toEqual(steps);

  // 以後は数えない（同じ端末で Today を開き直しても送らない）。
  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "今日の学習" })).toBeVisible();
  expect(events(sent).filter((e) => e === "today_view")).toHaveLength(1);

  // 設定済みの人が体験ページの「登録」経由で /onboarding に来ても、プランを作り直させない。
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/today$/);
});
