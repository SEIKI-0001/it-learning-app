// ポスター（LP で再生前に出る静止画）に使うフレーム番号を出力する。問いかけ「本当に、理解できていますか？」が出そろった瞬間。
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildScenes } from "../src/timelineCore.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(ROOT, "src/voice-manifest.json"), "utf8"));
const hook = buildScenes(manifest.lines).find((s) => s.id === "hook");
const line = hook.lines[1];
console.log(hook.from + line.onsets[2] + 45);
