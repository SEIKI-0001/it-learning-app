import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "../..");
const outputDir = "/private/tmp/it-learning-app-august-campaign";
const screenshotPath = path.join(outputDir, "campaign-mobile.png");
const webmPath = path.join(outputDir, "august-2026-short.webm");
const campaignUrl = "https://it-learning-app.vercel.app/campaign/august-2026";

const toDataUrl = async (filePath, mediaType) => {
  const contents = await readFile(filePath);
  return `data:${mediaType};base64,${contents.toString("base64")}`;
};

const formatBytes = (bytes) => new Intl.NumberFormat("en-US").format(bytes);

await mkdir(outputDir, { recursive: true });

const thinkingMochit = await toDataUrl(
  path.join(repositoryRoot, "public/characters/mochit/thinking.webp"),
  "image/webp",
);
const cheeringMochit = await toDataUrl(
  path.join(repositoryRoot, "public/characters/mochit/cheering.webp"),
  "image/webp",
);

const screenshotBrowser = await chromium.launch();
try {
  const screenshotPage = await screenshotBrowser.newPage({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 1,
  });
  await screenshotPage.goto(campaignUrl, { waitUntil: "networkidle" });
  await screenshotPage.screenshot({ path: screenshotPath, fullPage: true });
} finally {
  await screenshotBrowser.close();
}

const campaignScreenshot = await toDataUrl(screenshotPath, "image/png");
const renderBrowser = await chromium.launch();
const renderContext = await renderBrowser.newContext({
  viewport: { width: 1080, height: 1920 },
  recordVideo: {
    dir: outputDir,
    size: { width: 1080, height: 1920 },
  },
});

const page = await renderContext.newPage();
const video = page.video();

await page.setContent(
  `<!doctype html>
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        :root {
          color-scheme: dark;
          font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif;
        }

        * { box-sizing: border-box; }

        html, body {
          width: 1080px;
          height: 1920px;
          margin: 0;
          overflow: hidden;
          background: #103a6b;
        }

        .slide {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 130px 84px 120px;
          overflow: hidden;
          color: #fff;
          text-align: center;
          opacity: 0;
          visibility: hidden;
          background:
            radial-gradient(circle at 86% 10%, rgba(79, 157, 242, 0.75), transparent 31%),
            radial-gradient(circle at 10% 92%, rgba(8, 104, 201, 0.85), transparent 36%),
            linear-gradient(160deg, #103a6b 0%, #0756a8 55%, #0868c9 100%);
        }

        .slide.active {
          opacity: 1;
          visibility: visible;
        }

        .eyebrow {
          position: absolute;
          top: 94px;
          left: 84px;
          font-size: 30px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #dbecff;
        }

        h1 {
          position: relative;
          z-index: 2;
          margin: 0;
          font-size: 83px;
          line-height: 1.38;
          letter-spacing: -0.035em;
          text-wrap: balance;
          text-shadow: 0 5px 22px rgba(10, 36, 69, 0.42);
        }

        .mochit {
          position: relative;
          z-index: 2;
          width: 430px;
          height: 430px;
          margin-top: 104px;
          object-fit: contain;
          filter: drop-shadow(0 24px 28px rgba(10, 36, 69, 0.28));
        }

        .slide-two {
          justify-content: flex-start;
          padding-top: 205px;
        }

        .slide-two h1 {
          font-size: 70px;
          line-height: 1.32;
        }

        .phone {
          position: relative;
          z-index: 1;
          width: 720px;
          height: 1080px;
          margin-top: 70px;
          overflow: hidden;
          border: 18px solid #0a2445;
          border-radius: 76px;
          background: #fff;
          box-shadow: 0 40px 90px rgba(10, 36, 69, 0.5);
        }

        .phone::before {
          content: "";
          position: absolute;
          z-index: 2;
          top: 14px;
          left: 50%;
          width: 190px;
          height: 34px;
          border-radius: 999px;
          background: #0a2445;
          transform: translateX(-50%);
        }

        .phone img {
          display: block;
          width: 100%;
          height: auto;
        }

        .slide-three h1 {
          font-size: 76px;
          line-height: 1.42;
        }

        .slide-three .mochit {
          width: 380px;
          height: 380px;
          margin-top: 74px;
        }

        .notice {
          position: absolute;
          bottom: 92px;
          left: 50%;
          padding: 18px 34px;
          border: 2px solid rgba(255, 255, 255, 0.5);
          border-radius: 999px;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #eff7ff;
          background: rgba(10, 36, 69, 0.32);
          transform: translateX(-50%);
          white-space: nowrap;
        }
      </style>
    </head>
    <body>
      <section class="slide slide-one active" data-slide="0">
        <div class="eyebrow">ITパスポート学習コーチ</div>
        <h1>参考書を開いても<br />次に何をやるか迷う</h1>
        <img class="mochit" src="${thinkingMochit}" alt="" />
      </section>

      <section class="slide slide-two" data-slide="1">
        <div class="eyebrow">ITパスポート学習コーチ</div>
        <h1>試験日から逆算して<br />今日の1問を決める</h1>
        <div class="phone">
          <img src="${campaignScreenshot}" alt="" />
        </div>
      </section>

      <section class="slide slide-three" data-slide="2">
        <div class="eyebrow">ITパスポート学習コーチ</div>
        <h1>Pro 6か月 3,480円<br />買い切り・自動更新なし<br />8月10日 23:59まで</h1>
        <img class="mochit" src="${cheeringMochit}" alt="" />
        <div class="notice">合格保証ではありません</div>
      </section>

      <script>
        const slides = [...document.querySelectorAll(".slide")];
        const startedAt = performance.now();

        const renderSlide = () => {
          const elapsed = performance.now() - startedAt;
          const activeIndex = Math.min(2, Math.floor(elapsed / 8000));
          slides.forEach((slide, index) => {
            slide.classList.toggle("active", index === activeIndex);
          });
          requestAnimationFrame(renderSlide);
        };

        requestAnimationFrame(renderSlide);
      </script>
    </body>
  </html>`,
  { waitUntil: "load" },
);

await page.waitForTimeout(24_000);
await renderContext.close();

if (!video) {
  throw new Error("Playwright did not create a video recording.");
}

const recordedPath = await video.path();
await copyFile(recordedPath, webmPath);
await renderBrowser.close();

const screenshotBytes = (await stat(screenshotPath)).size;
const webmBytes = (await stat(webmPath)).size;

console.log(`Screenshot: ${screenshotPath} (${formatBytes(screenshotBytes)} bytes)`);
console.log(`WebM: ${webmPath} (${formatBytes(webmBytes)} bytes)`);
