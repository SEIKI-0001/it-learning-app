// VOICEVOX エンジン（http://127.0.0.1:50021）で台本 voice/script.json を読み上げ、
// public/voice/<id>.wav と src/voice-manifest.json（各行の秒数）を書き出す。
//
//   node scripts/voice.mjs                     … 台本どおり全行を生成
//   node scripts/voice.mjs --sample "話者/スタイル" --out <dir>
//                                              … 声色の聴き比べ用に数行だけ生成
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENGINE = process.env.VOICEVOX_URL ?? "http://127.0.0.1:50021";

const args = process.argv.slice(2);
const sampleSpeaker = args.includes("--sample") ? args[args.indexOf("--sample") + 1] : null;
const outDir = args.includes("--out") ? path.resolve(args[args.indexOf("--out") + 1]) : path.join(ROOT, "public/voice");

const script = JSON.parse(await readFile(path.join(ROOT, "voice/script.json"), "utf8"));

async function speakerId(label) {
  const [name, style] = label.split("/");
  const speakers = await (await fetch(`${ENGINE}/speakers`)).json();
  const speaker = speakers.find((s) => s.name === name);
  const found = speaker?.styles.find((s) => s.name === style);
  if (!found) throw new Error(`話者が見つかりません: ${label}`);
  return found.id;
}

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

async function synth(id, line) {
  const params = { ...script.defaults, ...line };
  const query = await (
    await fetch(`${ENGINE}/audio_query?speaker=${id}&text=${encodeURIComponent(line.text)}`, { method: "POST" })
  ).json();
  for (const key of ["speedScale", "intonationScale", "pitchScale", "volumeScale", "prePhonemeLength", "postPhonemeLength"]) {
    query[key] = params[key];
  }
  query.outputSamplingRate = 48000;
  query.outputStereo = false;
  const res = await fetch(`${ENGINE}/synthesis?speaker=${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!res.ok) throw new Error(`synthesis 失敗: ${line.id} ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

await mkdir(outDir, { recursive: true });
const id = await speakerId(sampleSpeaker ?? script.speaker);
const lines = sampleSpeaker ? script.lines.filter((l) => ["hook2", "quiz", "cta"].includes(l.id)) : script.lines;
const manifest = { speaker: sampleSpeaker ?? script.speaker, lines: [] };

for (const line of lines) {
  const wav = await synth(id, line);
  await writeFile(path.join(outDir, `${line.id}.wav`), wav);
  manifest.lines.push({ id: line.id, scene: line.scene, caption: line.caption, seconds: Number(wavSeconds(wav).toFixed(3)) });
  console.log(`${line.id}\t${manifest.lines.at(-1).seconds}s\t${line.text}`);
}

if (!sampleSpeaker) {
  await writeFile(path.join(ROOT, "src/voice-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}
