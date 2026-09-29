import { expect, test } from "@playwright/test";

test("a new learner can complete onboarding and open today's learning", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ITパスポート学習コーチ" })).toBeVisible({
    timeout: 15_000,
  });

  await expect(page.getByRole("heading", { name: "まず、勉強の進め方を知ろう" })).toBeVisible();
  await page.getByRole("link", { name: "1分で使い方を見る ▶" }).click();
  await expect(page.getByRole("heading", { name: "勉強の進め方を知ろう" })).toBeVisible();
  await page.getByRole("link", { name: "スキップして設定を始める" }).click();
  await expect(
    page.getByRole("heading", { name: "あなたに合わせて学習プランを作ります" }),
  ).toBeVisible();

  // 初回設定後は今日の学習に移動し、初回操作ガイドが開く。
  await page.getByRole("button", { name: /この内容でプランを作る/ }).click();
  await expect(page).toHaveURL(/\/today\?guide=1$/);
  const guide = page.getByRole("dialog", {
    name: "ようこそ！ここが毎日のスタート地点です",
  });
  await expect(guide).toBeVisible();
  await guide.getByRole("button", { name: "スキップ", exact: true }).click();
  await expect(guide).not.toBeVisible();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: "今日の学習" })).toBeVisible();
  const bottomNav = page.getByRole("navigation", { name: "メインナビゲーション" });
  await expect(bottomNav.getByRole("link")).toHaveCount(5);
  await expect(bottomNav.getByRole("link", { name: /その他/ })).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/today$/);

  await page.goto("/checkpoint/cp-technology-foundations");
  await expect(page.getByRole("heading", { name: "CP1 テクノロジ基礎" })).toBeVisible();
  await expect(page.getByText("12問・70%で合格")).toBeVisible();
});
