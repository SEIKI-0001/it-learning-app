// VOICEVOX エンジン（http://127.0.0.1:50021）で台本 voice/script.json を読み上げ、
// public/voice/<id>.wav と src/voice-manifest.json（各行の秒数と語の区切り）を書き出す。
//
//   node scripts/voice.mjs                     … 台本どおり全行を生成
//   node scripts/voice.mjs --sample "話者/スタイル" --out <dir>
//                                              … 声色の聴き比べ用に数行だけ生成
//
// 話速は行ごとに台本で決め、尺に合わせた伸縮（atempo）はしない。シーンの尺は語りの長さから決まる。
import { execFileSync } from "node:child_process";
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

// 句読点の間（無音）が明けて声が戻る位置（秒）。先頭は 0。映像の文字や強調を語に合わせて出すのに使う。
function speechOnsets(file, seconds) {
  // silencedetect は stderr に出すので 2>&1 で読む
  const log = execFileSync("sh", ["-c", `ffmpeg -hide_banner -nostats -i "${file}" -af silencedetect=noise=-40dB:d=0.1 -f null - 2>&1`], { encoding: "utf8" });
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1])).filter((t) => t > 0.15 && t < seconds - 0.05);
  return [0, ...ends.map((t) => Number(t.toFixed(3)))];
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

// 読み違える語（例：過去問→カコトイ）はユーザー辞書で正す。台本の文字は変えずに済み、毎回同じ読みになる
async function registerDictionary(words = []) {
  const dict = await (await fetch(`${ENGINE}/user_dict`)).json();
  for (const w of words) {
    const exists = Object.entries(dict).find(([, d]) => d.surface === w.surface || d.surface === w.surface.normalize("NFKC"));
    const q = new URLSearchParams({ surface: w.surface, pronunciation: w.pronunciation, accent_type: String(w.accent_type) });
    const url = exists ? `${ENGINE}/user_dict_word/${exists[0]}?${q}` : `${ENGINE}/user_dict_word?${q}`;
    const res = await fetch(url, { method: exists ? "PUT" : "POST" });
    if (!res.ok) throw new Error(`辞書登録に失敗: ${w.surface} ${res.status}`);
  }
}

await mkdir(outDir, { recursive: true });
await registerDictionary(script.dictionary);
const id = await speakerId(sampleSpeaker ?? script.speaker);
const lines = sampleSpeaker ? script.lines.filter((l) => ["hook2", "pivot", "cta"].includes(l.id)) : script.lines;
const manifest = { speaker: sampleSpeaker ?? script.speaker, lines: [] };

for (const line of lines) {
  const file = path.join(outDir, `${line.id}.wav`);
  await writeFile(file, await synth(id, line));
  // 語の区切りは、圧縮で無音が埋まる前の素の音声で測る
  const onsets = speechOnsets(file, wavSeconds(await readFile(file)));
  // シーンは「何番目の語で文字を出すか」を onsets の添字で指定している。区切りが減ると演出がずれるので止める
  if (line.needOnsets && onsets.length < line.needOnsets) {
    throw new Error(`${line.id}: 語の区切りが ${onsets.length} 個しか取れません（シーンは ${line.needOnsets} 個を使う）。読点や話速を調整してください`);
  }
  polish(file);
  const wav = await readFile(file);
  manifest.lines.push({
    id: line.id,
    scene: line.scene,
    caption: line.caption,
    seconds: Number(wavSeconds(wav).toFixed(3)),
    onsets,
  });
  const m = manifest.lines.at(-1);
  console.log(`${line.id}\t${m.seconds}s\t[${m.onsets.join(", ")}]\t${line.text}`);
}

if (!sampleSpeaker) {
  await writeFile(path.join(ROOT, "src/voice-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}
