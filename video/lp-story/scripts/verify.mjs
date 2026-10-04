// LP（開発サーバー http://localhost:3107/lp）に動画が正しく載っているかを確かめる。
//   node scripts/verify.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { FPS, buildScenes } from "../src/timelineCore.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.VERIFY_BASE ?? "http://localhost:3107";
const manifest = JSON.parse(await readFile(path.join(ROOT, "src/voice-manifest.json"), "utf8"));
const scenes = buildScenes(manifest.lines);
const seconds = scenes.reduce((n, s) => n + s.frames, 0) / FPS;
const cueCount = manifest.lines.length;

const browser = await chromium.launch();
try {
  for (const [width, height, mobile] of [[1440, 1000, false], [390, 844, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
    await page.goto(`${BASE}/lp`, { waitUntil: "domcontentloaded" });
    const video = page.locator(".story-video");
    await video.scrollIntoViewIfNeeded();
    assert.equal(await video.getAttribute("preload"), "none");
    assert.equal(await video.getAttribute("autoplay"), null);
    const meta = await video.evaluate(async (v) => {
      v.load();
      await new Promise((resolve, reject) => {
        v.onloadedmetadata = resolve;
        v.onerror = () => reject(new Error(v.error?.message));
      });
      v.muted = true;
      await v.play();
      await new Promise((r) => setTimeout(r, 300));
      v.pause();
      v.textTracks[0].mode = "hidden";
      return { duration: v.duration, width: v.videoWidth, height: v.videoHeight, poster: v.poster };
    });
    assert.ok(Math.abs(meta.duration - seconds) < 0.5, `duration ${meta.duration} vs ${seconds}`);
    assert.equal(meta.width, 1920);
    assert.equal(meta.height, 1080);
    const posterOk = await page.evaluate(async (src) => (await fetch(src)).ok, meta.poster);
    assert.ok(posterOk, "poster");
    await page.waitForFunction((n) => document.querySelector(".story-video").textTracks[0].cues?.length === n, cueCount);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "horizontal overflow");
    console.log(`${width}px: ${meta.duration.toFixed(1)}s ${meta.width}x${meta.height}, ${cueCount} captions, poster ok, no overflow`);
    await page.close();
  }
} finally {
  await browser.close();
}
