// 部品キットの素材を作る：~/Blender/explain_kit/build_all.sh のあとに実行する。
//   1. 焼いた色（albedo）× 陰影（AO）を合成して public/models/explain-kit.webp
//   2. glb を meshopt で圧縮して public/models/explain-kit.glb
//   3. kit.json（部品の大きさ）から lib/explain3d/kit.ts
// 使い方: node scripts/explain3d/kit-assets.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const SRC = join(homedir(), "Blender/explain_kit");

const albedo = await sharp(join(SRC, "bake/albedo.png")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const ao = await sharp(join(SRC, "bake/ao.png")).removeAlpha().greyscale().raw().toBuffer();
const { data, info } = albedo;
const out = Buffer.alloc(data.length);
for (let i = 0, j = 0; i < data.length; i += 3, j++) {
  // AO は真っ黒にしない（three.js の光と影を重ねるので、焼き込みは控えめに）
  const k = 0.35 + (0.65 * ao[j]) / 255;
  out[i] = data[i] * k;
  out[i + 1] = data[i + 1] * k;
  out[i + 2] = data[i + 2] * k;
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
  .resize(2048, 2048)
  .webp({ quality: 82 })
  .toFile("public/models/explain-kit.webp");

execFileSync("npx", ["--yes", "@gltf-transform/cli", "meshopt", join(SRC, "explain-kit.raw.glb"), "public/models/explain-kit.glb"], { stdio: "inherit" });

const meta = JSON.parse(readFileSync(join(SRC, "kit.json"), "utf8"));
const f3 = (n) => n.toFixed(3);
const parts = Object.entries(meta)
  .filter(([k]) => k.startsWith("Kit_") || k.startsWith("Item_"))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `  ${k}: { w: ${f3(v.max[0] - v.min[0])}, h: ${f3(v.max[1])}, d: ${f3(v.max[2] - v.min[2])} },`);
const zones = Object.entries(meta)
  .filter(([k]) => k.startsWith("Zone_"))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `  ${k}: { w: ${v.size[0]}, d: ${v.size[1]}, h: ${f3(v.max[1])} },`);
writeFileSync(
  "lib/explain3d/kit.ts",
  [
    "// public/models/explain-kit.glb の部品の大きさ（scripts/explain3d/kit-assets.mjs が ~/Blender/explain_kit/kit.json から作る。手で直さない）。",
    "// 単位 m・glTF 座標（x＝右、y＝上、z＝手前）。部品は足もとの中心が原点で、正面は手前（+z）を向く。",
    "",
    "export type KitBox = { w: number; h: number; d: number };",
    "",
    "/** 場所の床の上面の高さ（部品はここに置く） */",
    `export const KIT_FLOOR_Y = ${meta._zt};`,
    "",
    "export const KIT_PARTS: Record<string, KitBox> = {",
    ...parts,
    "};",
    "",
    "/** 場所の床の大きさ（w＝横、d＝奥行き） */",
    "export const KIT_ZONES: Record<string, { w: number; d: number; h: number }> = {",
    ...zones,
    "};",
    "",
    "/** 画面（CanvasTexture を貼る面）のある部品 */",
    `export const KIT_SCREENS = ${JSON.stringify(meta._screens.map((s) => s.slice(4)))} as const;`,
    "/** LED（状態で光らせる）のある部品 */",
    `export const KIT_LEDS = ${JSON.stringify(meta._leds.map((s) => s.slice(4)))} as const;`,
    "",
  ].join("\n"),
);
console.log("kit assets written");
