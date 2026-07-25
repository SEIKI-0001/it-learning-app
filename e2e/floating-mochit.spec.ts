import { expect, test } from "@playwright/test";

test("the floating Mochit is available on public routes", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "モチットを触る" }),
  ).toBeVisible();

  await page.goto("/onboarding");
  await expect(
    page.getByRole("button", { name: "モチットを触る" }),
  ).toBeVisible();
});
