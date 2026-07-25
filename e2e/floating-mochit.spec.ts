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

test("a pet hidden before onboarding can be restored from More", async ({
  page,
}) => {
  await page.goto("/login");
  const pet = page.getByRole("button", { name: "モチットを触る" });
  await pet.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Hide" }).click();
  await expect(pet).toBeHidden();

  await page.goto("/more");
  await page
    .getByRole("button", { name: "フローティングモチットを表示" })
    .click();

  await expect(
    page.getByRole("button", { name: "モチットを触る" }),
  ).toBeVisible();
});

test("dragging moves the pet and preserves its position across routes", async ({
  page,
}) => {
  await page.goto("/login");
  const pet = page.getByRole("button", { name: "モチットを触る" });
  const before = await pet.boundingBox();
  expect(before).not.toBeNull();

  await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
  await page.mouse.down();
  await page.mouse.move(420, 260, { steps: 8 });
  await page.mouse.up();
  await expect(pet).toHaveAttribute("data-motion", "idle");

  const afterDrag = await pet.boundingBox();
  expect(afterDrag).not.toBeNull();
  expect(afterDrag!.x).toBeLessThan(before!.x - 100);
  expect(afterDrag!.y).toBeGreaterThan(before!.y + 100);

  await page.goto("/onboarding");
  const afterNavigation = await page
    .getByRole("button", { name: "モチットを触る" })
    .boundingBox();
  expect(afterNavigation?.x).toBeCloseTo(afterDrag!.x, 0);
  expect(afterNavigation?.y).toBeCloseTo(afterDrag!.y, 0);
});

test.describe("touch-sized viewport", () => {
  test.use({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });

  test("a stationary touch long-press opens Hide", async ({ page }) => {
    await page.goto("/login");
    const pet = page.getByRole("button", { name: "モチットを触る" });

    await pet.dispatchEvent("pointerdown", {
      pointerId: 7,
      pointerType: "touch",
      button: 0,
      clientX: 338,
      clientY: 52,
    });
    await page.waitForTimeout(600);

    await expect(page.getByRole("menuitem", { name: "Hide" })).toBeVisible();
  });
});

test.describe("reduced motion", () => {
  test("keeps tap interaction functional without decorative rebound", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/login");
    const pet = page.getByRole("button", { name: "モチットを触る" });

    expect(
      await page.evaluate(
        () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    await expect(pet).toHaveAttribute("data-reduced-motion", "true");
    await pet.click();
    await expect(pet).toHaveAttribute("data-motion", "idle");
  });
});
