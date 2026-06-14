/**
 * ITパスポート学習コーチ の LINE リッチメニューを登録・公開するセットアップスクリプト。
 *
 * 行うこと:
 *   1. richmenu-image.mjs で 2500x1686 の PNG を生成
 *   2. 同名の既存リッチメニューを掃除（重複登録を防ぐ）
 *   3. リッチメニュー本体（JSON）を作成 → richMenuId を取得
 *   4. 画像をアップロード
 *   5. 全ユーザーのデフォルトリッチメニューに設定
 *
 * 各エリアは message アクションで「今日 / 復習 / 進捗 / ヘルプ」を送るだけなので、
 * タップ時の挙動は既存の webhook（buildReplyText）がそのまま処理する。
 * → リッチメニュー追加によって既存のテキスト応答仕様は一切変えていない。
 *
 * 実行（LINE_CHANNEL_ACCESS_TOKEN が必要。Vercel と同じ長期トークン）:
 *   LINE_CHANNEL_ACCESS_TOKEN=xxxx node scripts/richmenu/setup-richmenu.mjs
 *   # もしくは .env.local に書いておけば自動で読み込む
 *
 * 確認だけしたい場合:
 *   node scripts/richmenu/setup-richmenu.mjs --dry-run   # 画像生成と内容表示のみ（送信しない）
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRichMenuPng, RICH_MENU_SIZE, BUTTONS } from "./richmenu-image.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const API = "https://api.line.me/v2/bot";
const API_DATA = "https://api-data.line.me/v2/bot";

const RICH_MENU_NAME = "IP Coach Main Menu";

/** .env.local があれば、未設定の環境変数だけ取り込む（依存追加なしの簡易ローダー）。 */
function loadEnvLocal() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined && val !== "") process.env[key] = val;
  }
}

/** 各エリアのタップ範囲（2x2）。BUTTONS の順序＝左上→右上→左下→右下。 */
function buildAreas() {
  const w = RICH_MENU_SIZE.width / 2;
  const h = RICH_MENU_SIZE.height / 2;
  const cells = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: 0, y: h },
    { x: w, y: h },
  ];
  return BUTTONS.map((btn, i) => ({
    bounds: { x: cells[i].x, y: cells[i].y, width: w, height: h },
    action: { type: "message", text: btn.text, label: btn.title },
  }));
}

function buildRichMenuObject() {
  return {
    size: RICH_MENU_SIZE,
    selected: true,
    name: RICH_MENU_NAME,
    chatBarText: "メニュー",
    areas: buildAreas(),
  };
}

async function lineFetch(url, init, token) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`LINE API ${res.status} ${url}\n${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function deleteExistingMenus(token) {
  const { richmenus = [] } = await lineFetch(`${API}/richmenu/list`, {}, token);
  const targets = richmenus.filter((m) => m.name === RICH_MENU_NAME);
  for (const m of targets) {
    await lineFetch(`${API}/richmenu/${m.richMenuId}`, { method: "DELETE" }, token);
    console.log(`  既存メニューを削除: ${m.richMenuId}`);
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  loadEnvLocal();

  const obj = buildRichMenuObject();
  console.log("リッチメニュー定義:");
  for (const a of obj.areas) {
    console.log(`  [${a.action.label}] → message "${a.action.text}"  bounds=${JSON.stringify(a.bounds)}`);
  }

  console.log("画像を生成中…");
  const png = await buildRichMenuPng();
  console.log(`  PNG ${(png.length / 1024).toFixed(1)} KB (${RICH_MENU_SIZE.width}x${RICH_MENU_SIZE.height})`);
  if (png.length > 1024 * 1024) throw new Error("画像が 1MB を超えています（LINE の上限）。");

  if (dryRun) {
    const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "richmenu-preview.png");
    fs.writeFileSync(out, png);
    console.log(`--dry-run のため送信せず終了。プレビュー: ${out}`);
    return;
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "LINE_CHANNEL_ACCESS_TOKEN が未設定です。\n" +
        "  LINE_CHANNEL_ACCESS_TOKEN=xxxx node scripts/richmenu/setup-richmenu.mjs\n" +
        "  もしくは .env.local に設定してください。",
    );
  }

  console.log("既存の同名メニューを掃除中…");
  await deleteExistingMenus(token);

  console.log("リッチメニューを作成中…");
  const { richMenuId } = await lineFetch(
    `${API}/richmenu`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) },
    token,
  );
  console.log(`  richMenuId = ${richMenuId}`);

  console.log("画像をアップロード中…");
  await lineFetch(
    `${API_DATA}/richmenu/${richMenuId}/content`,
    { method: "POST", headers: { "Content-Type": "image/png" }, body: png },
    token,
  );

  console.log("デフォルトメニューに設定中…");
  await lineFetch(`${API}/user/all/richmenu/${richMenuId}`, { method: "POST" }, token);

  console.log("\n✅ 完了。LINE のトーク画面下部にメニューが表示されます。");
  console.log("   タップすると『今日/復習/進捗/ヘルプ』が送信され、webhook の応答が返ります。");
}

main().catch((e) => {
  console.error("\n❌ 失敗:", e.message);
  process.exit(1);
});
