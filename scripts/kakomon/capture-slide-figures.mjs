// 公開過去問ページに載せる「解説の1枚」の静止画を、テーマ別解説ページから撮る。
//
// 対応表 data/kakomon/slideFigures.json（年度 → 問番号 → [トピックid, スライド番号]）に載った
// スライドを1枚ずつ開いて撮影し、public/kakomon/slides/<トピックid>-<番号>.webp に保存する。
// 画像の寸法と見出しは data/kakomon/slideFigureImages.json に書く（ページはこれを読む）。
//
// 使い方（解説のスライドを直したら撮り直す）:
//   1. 開発サーバを起動する（例: npx next dev -p 3124）
//   2. node scripts/kakomon/capture-slide-figures.mjs http://localhost:3124
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MAP_PATH = path.join(ROOT, "data/kakomon/slideFigures.json");
const OUT_JSON = path.join(ROOT, "data/kakomon/slideFigureImages.json");
const OUT_DIR = path.join(ROOT, "public/kakomon/slides");
const BASE = process.argv[2] || "http://localhost:3124";

(async () => {
  const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  const slides = new Map();
  for (const byNo of Object.values(map)) {
    for (const [topicId, n] of Object.values(byNo)) slides.set(`${topicId}-${n}`, { topicId, n });
  }
  // 前回の画像は消してから撮る（対応表から外した絵を残さない）
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ channel: "chrome" });
  // スマホ幅で撮る（過去問ページはスマホで読む人が多く、PC幅で撮った絵を縮めると文字が読めなくなる）
  const page = await browser.newPage({ viewport: { width: 412, height: 1600 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  // 自動で進む演出を止め、撮るたびに同じ絵になるようにする
  await page.emulateMedia({ reducedMotion: "reduce" });

  const images = {};
  for (const [key, { topicId, n }] of [...slides].sort()) {
    await page.goto(`${BASE}/kaisetsu/${topicId}`, { waitUntil: "networkidle" });
    const picker = page.locator('main [aria-label="解説を選ぶ"]').first();
    if ((await picker.count()) > 0) {
      await picker.locator(`button[aria-label="解説${n}"]`).click();
    } else if (n !== 1) {
      throw new Error(`${key}: スライドの切り替えが見つかりません`);
    }
    await page.waitForTimeout(900);

    // 表示中のスライドの見出しから上へたどり、枠（border か ring の影）と角丸のある「スライドのカード」を撮る
    // （カードが無い解説は、進み具合（前へ／次へ）を含まない一番外側の箱）
    const handle = await page.evaluateHandle(() => {
      const prog = document.querySelector('main [aria-label="解説の進み具合"]');
      const scope = (prog && prog.closest("section")) || document.querySelector("main");
      const heading = [...scope.querySelectorAll("h3,h4")].find(
        (h) => h.offsetParent !== null && !h.closest('[aria-hidden="true"]'),
      );
      if (!heading) return null;
      const wide = scope.getBoundingClientRect().width * 0.8;
      let fallback = heading;
      for (let box = heading; box && box !== scope; box = box.parentElement) {
        if (prog && box.contains(prog)) break;
        fallback = box;
        const cs = getComputedStyle(box);
        const outlined = parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== "none";
        if (outlined && parseFloat(cs.borderTopLeftRadius) > 0 && box.getBoundingClientRect().width >= wide) {
          return { box, heading };
        }
      }
      return { box: fallback, heading };
    });
    const el = await handle.evaluateHandle((r) => r && r.box).then((h) => h.asElement());
    if (!el) throw new Error(`${key}: スライドが見つかりません`);
    // 見出し先頭の番号バッジ（「4」など）は除いて見出しの文だけを使う
    const caption = await handle.evaluate((r) => {
      const h = r.heading.cloneNode(true);
      const badge = h.firstElementChild;
      if (badge && /^\d+$/.test(badge.textContent.trim())) badge.remove();
      return h.textContent.replace(/\s+/g, " ").trim();
    });
    const png = await el.screenshot();
    const { data: webp, info } = await sharp(png)
      .resize({ width: 840, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    // 撮り直したら URL が変わるよう、中身のハッシュをファイル名に入れる（古い絵がキャッシュに残らない）
    const file = `${key}-${crypto.createHash("sha256").update(webp).digest("hex").slice(0, 8)}.webp`;
    fs.writeFileSync(path.join(OUT_DIR, file), webp);
    images[key] = { src: `/kakomon/slides/${file}`, width: info.width, height: info.height, caption };
    console.log(key, info.width, info.height, caption);
  }
  await browser.close();
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(images, null, 2)}\n`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
