import { expect, test, type Page } from "@playwright/test";

const APP_STATE = {
  profile: {
    itExperience: "beginner",
    dailyMinutes: "15",
    examPlan: "undecided",
    confidence: 1,
    weekdayMinutes: 15,
    holidayMinutes: 20,
    studyStyle: "balanced",
  },
  progress: {
    level: 1,
    exp: 0,
    streakCount: 0,
    weakTags: [],
    completedTopics: [],
    topicMastery: {},
    reviewQueue: [],
    weeklyPlan: null,
    currentDay: 1,
    completedDays: [],
  },
  answers: [],
};

async function prepareConfiguredUser(page: Page) {
  await page.addInitScript((state) => {
    window.localStorage.setItem("fequest:appstate", JSON.stringify(state));
  }, APP_STATE);
}

test.beforeEach(async ({ page }) => {
  await prepareConfiguredUser(page);
});

test("shows a 108px floating Mochit only on configured app routes", async ({
  page,
}) => {
  await page.goto("/today");
  const pet = page.getByRole("button", { name: "モチットを触る" });
  await expect(pet).toBeVisible();
  const box = await pet.boundingBox();
  expect(Math.round(box!.width)).toBe(108);
  expect(Math.round(box!.height)).toBe(108);

  await page.goto("/avatar");
  await expect(
    page.getByRole("button", { name: "モチットを触る" }),
  ).toBeHidden();
});

test("opens the quick menu by tap and navigates to the exact shortcuts", async ({
  page,
}) => {
  await page.goto("/today");
  const pet = page.getByRole("button", { name: "モチットを触る" });
  await pet.click();

  const menu = page.getByRole("menu", {
    name: "モチットクイックメニュー",
  });
  await expect(menu).toBeVisible();
  const links = [
    ["今日の学習", "/today"],
    ["復習する", "/review"],
    ["ロードマップ", "/plan"],
    ["進捗を見る", "/progress"],
    ["モチットの成長", "/avatar"],
  ] as const;
  for (const [name, href] of links) {
    await expect(page.getByRole("menuitem", { name })).toHaveAttribute(
      "href",
      href,
    );
  }

  await page.getByRole("menuitem", { name: "復習する" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(menu).toBeHidden();
});

test("a hidden pet can still be restored from More", async ({ page }) => {
  await page.goto("/today");
  const pet = page.getByRole("button", { name: "モチットを触る" });
  await pet.click({ button: "right" });
  await page
    .getByRole("menuitem", { name: "モチットを非表示" })
    .click();
  await expect(pet).toBeHidden();

  await page.goto("/more");
  await page
    .getByRole("button", { name: "フローティングモチットを表示" })
    .click();
  await expect(
    page.getByRole("button", { name: "モチットを触る" }),
  ).toBeVisible();
});

test("dragging moves the pet, does not open the menu, and preserves position", async ({
  page,
}) => {
  await page.goto("/today");
  const pet = page.getByRole("button", { name: "モチットを触る" });
  const before = await pet.boundingBox();
  expect(before).not.toBeNull();

  await page.mouse.move(
    before!.x + before!.width / 2,
    before!.y + before!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(420, 260, { steps: 8 });
  await page.mouse.up();
  await expect(pet).toHaveAttribute("data-motion", "idle");
  await expect(
    page.getByRole("menu", { name: "モチットクイックメニュー" }),
  ).toBeHidden();

  const afterDrag = await pet.boundingBox();
  expect(afterDrag).not.toBeNull();
  expect(afterDrag!.x).toBeLessThan(before!.x - 100);
  expect(afterDrag!.y).toBeGreaterThan(before!.y + 100);

  await page.goto("/review");
  const afterNavigation = await page
    .getByRole("button", { name: "モチットを触る" })
    .boundingBox();
  expect(afterNavigation?.x).toBeCloseTo(afterDrag!.x, 0);
  expect(afterNavigation?.y).toBeCloseTo(afterDrag!.y, 0);
});

test("Escape and outside pointer close the quick menu", async ({ page }) => {
  await page.goto("/today");
  const pet = page.getByRole("button", { name: "モチットを触る" });

  await pet.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu", {
    name: "モチットクイックメニュー",
  });
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(pet).toBeFocused();

  await page.keyboard.press("Space");
  await expect(menu).toBeVisible();
  await page.locator("main").first().click({ position: { x: 8, y: 8 } });
  await expect(menu).toBeHidden();
});

test.describe("touch-sized viewport", () => {
  test.use({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });

  test("long-press opens the menu and the pet remains above bottom navigation", async ({
    page,
  }) => {
    await page.goto("/today");
    const pet = page.getByRole("button", { name: "モチットを触る" });
    const box = await pet.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(16);
    expect(box!.x + box!.width).toBeLessThanOrEqual(374);
    expect(box!.y).toBeGreaterThanOrEqual(16);
    expect(box!.y + box!.height).toBeLessThanOrEqual(764);

    await pet.dispatchEvent("pointerdown", {
      pointerId: 7,
      pointerType: "touch",
      button: 0,
      clientX: box!.x + box!.width / 2,
      clientY: box!.y + box!.height / 2,
    });
    await page.waitForTimeout(600);

    await expect(
      page.getByRole("menuitem", { name: "モチットを非表示" }),
    ).toBeVisible();
    const menuBox = await page
      .getByRole("menu", { name: "モチットクイックメニュー" })
      .boundingBox();
    expect(menuBox).not.toBeNull();
    expect(menuBox!.x).toBeGreaterThanOrEqual(16);
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(374);
    expect(menuBox!.y).toBeGreaterThanOrEqual(16);
    expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(764);
  });
});

test.describe("reduced motion", () => {
  test("keeps tap and menu functional without decorative rebound", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/today");
    const pet = page.getByRole("button", { name: "モチットを触る" });

    expect(
      await page.evaluate(
        () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    await expect(pet).toHaveAttribute("data-reduced-motion", "true");
    await pet.click();
    await expect(pet).toHaveAttribute("data-motion", "idle");
    await expect(
      page.getByRole("menu", { name: "モチットクイックメニュー" }),
    ).toBeVisible();
  });
});
