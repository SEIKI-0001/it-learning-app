import { expect, test } from "@playwright/test";

test("a new learner can complete onboarding and open today's learning", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ITパスポート学習コーチ" })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("link", { name: /学習をはじめる/ }).click();
  await expect(
    page.getByRole("heading", { name: "あなたに合わせて学習プランを作ります" }),
  ).toBeVisible();

  // 初回設定は1画面のみ。プラン作成後は確認画面を挟まず今日の学習へ直行する
  // （アバター選択ステップは Mochit 導入時に廃止済み）。
  await page.getByRole("button", { name: /この内容でプランを作る/ }).click();
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
