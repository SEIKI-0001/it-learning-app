// 動画と同じタイムライン計算（src/timelineCore.ts）から字幕 WebVTT を書き出す。
//   node scripts/vtt.mjs <出力パス>
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FPS, buildScenes } from "../src/timelineCore.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] ?? path.join(ROOT, "out/lp-story.vtt");
const manifest = JSON.parse(await readFile(path.join(ROOT, "src/voice-manifest.json"), "utf8"));

const stamp = (frames) => {
  const ms = Math.round((frames / FPS) * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor(ms / 60000) % 60).padStart(2, "0");
  const s = String(Math.floor(ms / 1000) % 60).padStart(2, "0");
  return `${h}:${m}:${s}.${String(ms % 1000).padStart(3, "0")}`;
};

const cues = buildScenes(manifest.lines).flatMap((scene) =>
  scene.lines.map((l) => `${stamp(scene.from + l.from)} --> ${stamp(scene.from + l.from + l.frames + 8)}\n${l.caption}`),
);
await writeFile(out, `WEBVTT\n\n${cues.join("\n\n")}\n`);
console.log(`${cues.length} cues -> ${out}`);
