import { expect, test, type Page } from "@playwright/test";
import { INITIAL_CHECKPOINT_PROGRESS } from "../types/checkpoint";

const APP_STATE = {
  profile: {
    itExperience: "beginner", dailyMinutes: "15", examPlan: "undecided",
    confidence: 1, weekdayMinutes: 15, holidayMinutes: 20, studyStyle: "balanced",
  },
  progress: {
    level: 5, exp: 750, streakCount: 0, weakTags: [], completedTopics: [],
    topicMastery: {}, topicMasteryStats: {}, reviewQueue: [], weeklyPlan: null,
    currentDay: 1, completedDays: [],
    checkpointProgress: {
      ...INITIAL_CHECKPOINT_PROGRESS,
      currentCheckpointId: "cp2",
      clearedCheckpointIds: ["cp1"],
      earnedBadges: [
        { badgeId: "b-cp1-touch-tech", earnedAt: "2026-09-20T00:00:00.000Z" },
        { badgeId: "b-cp1-final", earnedAt: "2026-09-20T00:00:01.000Z" },
      ],
      gameful: { rewards: {
        unlockedCosmetics: ["title-steady", "title-reviewer"],
        equippedTitleId: "title-steady",
      } },
    },
  },
  answers: [],
};

async function prepare(page: Page) {
  await page.addInitScript((state) => {
    if (!window.localStorage.getItem("fequest:appstate")) {
      window.localStorage.setItem("fequest:appstate", JSON.stringify(state));
    }
  }, APP_STATE);
}

for (const width of [390, 1280]) {
  test(`growth hierarchy and Mochit profile at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await prepare(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/today");
    await expect(page.getByRole("heading", { name: "今日の学習" })).toBeVisible();
    await expect(page.getByRole("link", { name: "合格準備度を見る" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("today.png"), fullPage: true });

    await page.goto("/progress");
    await expect(page.getByText("いちばん大切な指標 · 合格準備度")).toBeVisible();
    await expect(page.getByRole("link", { name: "今日の学習を進める" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("progress.png"), fullPage: true });

    await page.goto("/avatar");
    await expect(page.getByText("モチット Lv.11")).toBeVisible();
    await expect(page.getByText("モチットランク：上級チャレンジャー")).toBeVisible();
    await expect(page.getByText("装備中：こつこつ研究員")).toBeVisible();
    await page.getByRole("listitem").filter({ hasText: "見直しの達人" })
      .getByRole("button", { name: "装備する" }).click();
    await expect(page.getByText("装備中：見直しの達人")).toBeVisible();
    await page.reload();
    await expect(page.getByText("装備中：見直しの達人")).toBeVisible();
    await expect(page.locator("#collection")).toContainText("全体像マスター");
    await expect(page.locator("#collection")).not.toContainText("テクノロジ探訪");
    await page.screenshot({ path: testInfo.outputPath("avatar.png"), fullPage: true });

    await page.goto("/badges");
    await expect(page.getByRole("heading", { name: "CP達成条件" })).toBeVisible();
    await expect(page.getByText("テクノロジ探訪")).toBeVisible();
    await expect(page.getByText("全体像マスター")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("conditions.png"), fullPage: true });

    await page.goto("/plan");
    await expect(page.getByText("CP達成条件", { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("plan.png"), fullPage: true });

    await page.goto("/more");
    await expect(page.getByRole("link", { name: /モチットのプロフィール/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /CP達成条件/ })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("more.png"), fullPage: true });

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
