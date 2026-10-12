// Gemini 3.8 Flash TTS でナレーションを生成する。キーは環境変数からのみ読む。
// node --env-file=/path/to/private.env scripts/voice.mjs
// --sample Kore --out /tmp/voice-sample で3行だけ試聴用に生成する。
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSpeechRequest, decodeSpeechAudio } from "./gemini-tts.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const sampleSpeaker = args.includes("--sample") ? args[args.indexOf("--sample") + 1] : null;
const outDir = args.includes("--out") ? path.resolve(args[args.indexOf("--out") + 1]) : path.join(ROOT, "public/voice");
const script = JSON.parse(await readFile(path.join(ROOT, "voice/script.json"), "utf8"));
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY を設定してください（値をコミットしないでください）");
const voice = sampleSpeaker ?? script.speaker;
// 16bit PCM wav の再生秒数（data チャンク長から計算）
function wavSeconds(buf) {
  const rate = buf.readUInt32LE(24);
  const blockAlign = buf.readUInt16LE(32);
  let offset = 12;
  while (offset < buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "data") return size / blockAlign / rate;
    offset += 8 + size;
  }
  throw new Error("data チャンクがありません");
}

// 声を整える：低域の濁りを切り、軽く圧縮して、どの行も -20 LUFS にそろえる（行ごとの音量差をなくす）
const VOICE_LUFS = -20;
function lufs(file) {
  const log = execFileSync("sh", ["-c", `ffmpeg -hide_banner -nostats -i "${file}" -af ebur128 -f null - 2>&1`], { encoding: "utf8" });
  return Number(log.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/)?.[1] ?? log.match(/I:\s+(-?[\d.]+) LUFS/g).at(-1).match(/-?[\d.]+/)[0]);
}
function polish(file) {
  const tmp = `${file}.tmp.wav`;
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", file, "-af", "highpass=f=70,acompressor=threshold=0.125:ratio=2:attack=8:release=120:makeup=1", "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", tmp]);
  const gain = VOICE_LUFS - lufs(tmp);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", tmp, "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.89:level=false`, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", file]);
  execFileSync("rm", [tmp]);
}

const cacheDir = path.join(ROOT, "out/voice-cache");
await mkdir(cacheDir, {recursive: true});
let lastRequestAt = 0;
async function synth(line) {
  const payload = buildSpeechRequest(line.text, {voice, style: line.style ?? script.style});
  const hash = createHash("sha256").update(JSON.stringify({model: script.model, payload})).digest("hex");
  const cached = path.join(cacheDir, `${hash}.wav`);
  try { return await readFile(cached); } catch (error) { if (error.code !== "ENOENT") throw error; }
  for (let attempt = 0; attempt < 5; attempt++) {
    // 無料枠の分あたりの呼び出し数を抑える。途中失敗時は生成済みの語句を再利用する。
    await delay(Math.max(0, 7000 - (Date.now() - lastRequestAt)));
    lastRequestAt = Date.now();
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${script.model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(120000),
    });
    if (res.ok) {
      const wav = decodeSpeechAudio(await res.json());
      await writeFile(cached, wav);
      return wav;
    }
    // 秘密情報やレスポンス本文はログに出さない。
    if (![429, 500, 502, 503, 504].includes(res.status) || attempt === 4) {
      throw new Error(`Gemini TTS: ${line.id} HTTP ${res.status}（生成済みの語句は out/voice-cache に保存済み）`);
    }
    await res.arrayBuffer();
    const wait = Math.min(60000, 15000 * 2 ** attempt);
    console.log(`${line.id}: HTTP ${res.status}, ${wait / 1000}秒後に再試行 (${attempt + 1}/4)`);
    await delay(wait);
  }
}

await mkdir(outDir, { recursive: true });
const staging = await mkdtemp(path.join(outDir, ".gemini-"));
const lines = sampleSpeaker ? script.lines.filter(l => ["hook2", "pivot", "cta"].includes(l.id)) : script.lines;
const manifest = { model: script.model, speaker: voice, lines: [] };
try {
  for (const line of lines) {
    const file = path.join(staging, `${line.id}.wav`);
    if (!line.segments?.length || line.segments.join("") !== line.text) throw new Error(`${line.id}: 台本と語句の区切りが一致しません`);
    const onsets = [];
    let elapsed = 0;
    const chunks = [];
    for (const [i, text] of line.segments.entries()) {
      const raw = path.join(staging, `${line.id}-${i}-raw.wav`);
      const part = path.join(staging, `${line.id}-${i}.wav`);
      await writeFile(raw, await synth({...line, text}));
      // 前後の生成された無音だけを整え、語句の間を固定する（話速は変えない）。
      const gap = i < line.segments.length - 1 ? 0.30 : 0.10;
      execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", raw, "-af", `silenceremove=start_periods=1:start_duration=0.02:start_threshold=-55dB:start_silence=0.06,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-55dB:start_silence=0.08,areverse,apad=pad_dur=${gap}`, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", part]);
      onsets.push(Number(elapsed.toFixed(3)));
      elapsed += wavSeconds(await readFile(part));
      chunks.push(part);
    }
    const list = path.join(staging, `${line.id}.txt`);
    await writeFile(list, chunks.map(f => `file '${f.replaceAll("'", "'\\''")}'`).join("\n"));
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c:a", "pcm_s16le", file]);
    polish(file);
    const seconds = wavSeconds(await readFile(file));
    if (onsets.length < line.needOnsets) throw new Error(`${line.id}: 必要な語句の区切りが足りません`);
    manifest.lines.push({id: line.id, scene: line.scene, caption: line.caption, seconds: Number(seconds.toFixed(3)), onsets});
    console.log(`${line.id}: ${seconds.toFixed(3)}s [${onsets.join(", ")}]`);
  }
  // 全行の生成と検証が済むまで既存の音声・タイムラインを更新しない。
  for (const line of lines) await copyFile(path.join(staging, `${line.id}.wav`), path.join(outDir, `${line.id}.wav`));
  if (!sampleSpeaker) await writeFile(path.join(ROOT, "src/voice-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
} finally {
  await rm(staging, {recursive: true, force: true});
}
