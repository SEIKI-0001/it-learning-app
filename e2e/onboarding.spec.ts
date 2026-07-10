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

  await page.getByRole("button", { name: /今日の学習へ進む/ }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByText("今日の学習メニュー")).toBeVisible();

  await page.goto("/checkpoint/cp-technology-foundations");
  await expect(page.getByRole("heading", { name: "CP1 テクノロジ基礎" })).toBeVisible();
  await expect(page.getByText("12問・70%で合格")).toBeVisible();
});
