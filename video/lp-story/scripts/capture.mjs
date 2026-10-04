// LP紹介動画で使う実画面を、スマホ幅（390×844・3倍密度）で撮る。
// 開発サーバー（http://localhost:3107）を最新 main で起動してから実行する。
// 個人の学習履歴は使わず、撮影用の学習データを localStorage に入れて表示する。
//   node scripts/capture.mjs
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/shots");
const BASE = process.env.CAPTURE_BASE ?? "http://localhost:3107";
const HIDE = "nextjs-portal{display:none!important} *{scroll-behavior:auto!important}";

const STATE = {
  profile: { itExperience: "beginner", dailyMinutes: "30", examPlan: "decided", examDate: "2026-11-15", confidence: 1, weekdayMinutes: 30, holidayMinutes: 45, studyStyle: "balanced" },
  progress: { level: 3, exp: 260, streakCount: 7, weakTags: [], completedTopics: ["tech-lan-wan", "tech-network-devices"], topicMastery: { "tech-lan-wan": 100, "tech-network-devices": 100 }, reviewQueue: [], weeklyPlan: null, currentDay: 8, completedDays: [] },
  answers: [],
};
const READINESS = {
  score: 68, band: "approaching", confidence: { score: 80, level: "medium", reasons: [] },
  fields: [{ fieldId: "strategy", label: "ストラテジ", score: 72 }, { fieldId: "management", label: "マネジメント", score: 70 }, { fieldId: "technology", label: "テクノロジ", score: 62 }],
  components: {}, calculation: { appliedCaps: [] }, evidence: { uniqueQuestionCount: 120 }, weakTopics: [], primaryImprovement: null,
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await ctx.addInitScript(([s, r]) => {
  localStorage.setItem("fequest:appstate", JSON.stringify(s));
  localStorage.setItem("fequest:progressBootstrapCache", JSON.stringify({ userId: null, savedAt: Date.now(), data: { integratedStatus: null, examReadiness: r, planAdjustmentProposal: null } }));
}, [STATE, READINESS]);
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

for (const [name, url] of [["today", "/today"], ["progress", "/progress"]]) {
  await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(4000);
  await page.addStyleTag({ content: HIDE });
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(name, (await page.locator("body").innerText()).slice(0, 300).replace(/\n+/g, " / "));
}

// 確認問題（スマホ画面そのまま。回答前と回答後）
const LESSON = BASE + "/learn/network/internet-web/tech-web-internet-basics";
await page.goto(LESSON, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(2500);
await page.addStyleTag({ content: HIDE });
await page.locator("#lesson-quiz").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 60));
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/quiz.png` });
await page.getByRole("button", { name: /プロトコル/ }).evaluate((el) => el.click());
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/quiz-answer.png` });
console.log("quiz:", (await page.locator("#lesson-quiz").innerText()).replace(/\n+/g, " / ").slice(0, 200));

// 図解（パケット）：PC幅・2倍密度で、経路全体が見える固定アングルのまま6ステップ
const wide = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await wide.addInitScript((s) => localStorage.setItem("fequest:appstate", JSON.stringify(s)), STATE);
const pc = await wide.newPage();
await pc.goto(LESSON, { waitUntil: "domcontentloaded", timeout: 120000 });
await pc.waitForTimeout(2500);
await pc.addStyleTag({ content: HIDE });
const next = pc.getByRole("button", { name: "次の解説へ" });
await next.waitFor();
await next.click(); await pc.waitForTimeout(400);
await next.click(); await pc.waitForTimeout(600);
const scene = pc.getByTestId("packet-scene");
await scene.scrollIntoViewIfNeeded();
for (let i = 0; i < 6; i++) {
  if (i > 0) await pc.getByRole("button", { name: "1ステップ進む", exact: true }).evaluate((el) => el.click());
  await pc.waitForTimeout(1000);
  await scene.screenshot({ path: `${OUT}/packet-${i}.png` });
}
await browser.close();
