// BGM と効果音をコードで合成して public/audio/ に wav で書き出す（外部素材なし＝ライセンス管理不要）。
//   node scripts/synth-audio.mjs            … bgm-a（採用）/ bgm-b（チップチューン案・不採用）と効果音一式
// 曲は 126BPM・C メジャー。冒険の始まりを想わせる I–V–vi–IV 進行のポップなチップチューン。
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/audio");
const SR = 48000;

// ---------- 基本部品 ----------
const TAU = Math.PI * 2;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
let seed = 7;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

function buffer(seconds) {
  const n = Math.ceil(seconds * SR);
  return [new Float32Array(n), new Float32Array(n)];
}

// 簡易 ADSR（秒）
function env(t, dur, a = 0.005, d = 0.1, s = 0.6, r = 0.08) {
  if (t < 0) return 0;
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur) return s;
  if (t < dur + r) return s * (1 - (t - dur) / r);
  return 0;
}

const wave = {
  sine: (p) => Math.sin(TAU * p),
  tri: (p) => 1 - 4 * Math.abs(((p + 0.25) % 1) - 0.5),
  square: (p, duty = 0.5) => ((p % 1) < duty ? 1 : -1),
  saw: (p) => 2 * (p % 1) - 1,
};

// 1音を書き込む。pan: -1(左)〜1(右)
function note(buf, start, dur, freq, { type = "sine", gain = 0.2, pan = 0, a, d, s, r, duty, vibrato = 0, slide = 0 } = {}) {
  const [L, R] = buf;
  const rel = r ?? 0.08;
  const i0 = Math.floor(start * SR);
  const len = Math.floor((dur + rel) * SR);
  const gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan);
  let phase = 0;
  for (let i = 0; i < len && i0 + i < L.length; i++) {
    const t = i / SR;
    const f = freq * (1 + slide * t) * (1 + vibrato * Math.sin(TAU * 5.5 * t) * Math.min(1, t * 3));
    phase += f / SR;
    const v = (type === "square" ? wave.square(phase, duty) : wave[type](phase)) * env(t, dur, a, d, s, rel);
    L[i0 + i] += v * gl;
    R[i0 + i] += v * gr;
  }
}

// ベル（倍音つきの減衰音）
function bell(buf, start, freq, gain = 0.12, pan = 0, decay = 0.9) {
  const [L, R] = buf;
  const i0 = Math.floor(start * SR);
  const len = Math.floor(decay * 1.6 * SR);
  for (let i = 0; i < len && i0 + i < L.length; i++) {
    const t = i / SR;
    const e = Math.exp(-t / (decay * 0.35)) * Math.min(1, t / 0.002);
    const v = (Math.sin(TAU * freq * t) + 0.35 * Math.sin(TAU * freq * 2 * t) + 0.12 * Math.sin(TAU * freq * 3.01 * t)) * e;
    L[i0 + i] += v * gain * (1 - pan * 0.5);
    R[i0 + i] += v * gain * (1 + pan * 0.5);
  }
}

function kick(buf, start, gain = 0.55) {
  const [L, R] = buf;
  const i0 = Math.floor(start * SR);
  let phase = 0;
  for (let i = 0; i < 0.32 * SR && i0 + i < L.length; i++) {
    const t = i / SR;
    phase += (48 + 110 * Math.exp(-t * 28)) / SR;
    const v = Math.sin(TAU * phase) * Math.exp(-t * 9) * gain + (t < 0.004 ? rand() * 0.15 : 0);
    L[i0 + i] += v;
    R[i0 + i] += v;
  }
}

function noiseHit(buf, start, dur, gain, { hp = 0.5, tone = 0, pan = 0 } = {}) {
  const [L, R] = buf;
  const i0 = Math.floor(start * SR);
  let prev = 0;
  for (let i = 0; i < dur * SR && i0 + i < L.length; i++) {
    const t = i / SR;
    const n = rand();
    const h = n - prev * hp; // 1次ハイパス的な明るさ調整
    prev = n;
    const e = Math.exp(-t / (dur * 0.3));
    const v = (h * 0.7 + (tone ? Math.sin(TAU * tone * t) * 0.5 : 0)) * e * gain;
    L[i0 + i] += v * (1 - pan * 0.5);
    R[i0 + i] += v * (1 + pan * 0.5);
  }
}

// 簡易ステレオディレイ（空間感）
function delay(buf, seconds, feedback = 0.3, mix = 0.25) {
  const [L, R] = buf;
  const d = Math.floor(seconds * SR);
  for (let i = d; i < L.length; i++) {
    L[i] += R[i - d] * feedback * mix;
    R[i] += L[i - d] * feedback * mix;
  }
}

function master(buf, gain = 1) {
  const [L, R] = buf;
  let peak = 0;
  for (let i = 0; i < L.length; i++) {
    L[i] = Math.tanh(L[i] * gain);
    R[i] = Math.tanh(R[i] * gain);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = 0.89 / (peak || 1);
  for (let i = 0; i < L.length; i++) {
    L[i] *= norm;
    R[i] *= norm;
  }
  return buf;
}

async function writeWav(name, [L, R]) {
  const data = Buffer.alloc(L.length * 4);
  for (let i = 0; i < L.length; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), i * 4);
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22);
  head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * 4, 28);
  head.writeUInt16LE(4, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  await writeFile(path.join(OUT, `${name}.wav`), Buffer.concat([head, data]));
  console.log(`${name}.wav\t${(L.length / SR).toFixed(2)}s`);
}

// ---------- BGM ----------
const BPM = 126;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
// C G Am F（ルートと構成音の MIDI 番号）
const CHORDS = [
  { root: 48, tones: [60, 64, 67] },
  { root: 43, tones: [59, 62, 67] },
  { root: 45, tones: [60, 64, 69] },
  { root: 41, tones: [60, 65, 69] },
];
// 8小節のメロディ（拍位置, MIDI, 長さ拍）。明るく跳ねる、上昇で終わるフレーズ。
const MELODY = [
  [0, 72, 0.5], [0.5, 74, 0.5], [1, 76, 1], [2, 79, 0.75], [3, 76, 1],
  [4, 74, 0.5], [4.5, 76, 0.5], [5, 79, 1], [6, 83, 0.75], [7, 81, 1],
  [8, 81, 0.5], [8.5, 79, 0.5], [9, 76, 1], [10, 72, 0.75], [11, 76, 1],
  [12, 77, 0.5], [12.5, 76, 0.5], [13, 74, 0.75], [14, 77, 0.5], [14.5, 79, 1.5],
  [16, 72, 0.5], [16.5, 74, 0.5], [17, 76, 1], [18, 79, 0.75], [19, 84, 1],
  [20, 83, 0.5], [20.5, 79, 0.5], [21, 74, 1], [22, 79, 0.75], [23, 83, 1],
  [24, 81, 0.5], [24.5, 84, 0.5], [25, 81, 1], [26, 76, 0.75], [27, 81, 1],
  [28, 77, 0.5], [28.5, 81, 0.5], [29, 84, 0.75], [30, 83, 0.5], [30.5, 84, 1.5],
];

// variant: "a"=ポップ（ベル主旋律・やわらかい）, "b"=チップチューン（矩形波主旋律・8bit感強め）
function bgm(variant, seconds = 66) {
  const buf = buffer(seconds);
  const bars = Math.ceil(seconds / BAR);
  const introBars = 2; // 冒頭2小節はドラム控えめ（フックの語りを立てる）
  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * BAR;
    const ch = CHORDS[bar % 4];
    const full = bar >= introBars;
    // ベース：8分で跳ねる（ルート/オクターブ）
    for (let e = 0; e < 8; e++) {
      const n = ch.root + (e % 2 === 1 ? 12 : 0);
      note(buf, t0 + e * BEAT / 2, BEAT * 0.38, midi(n), { type: variant === "b" ? "square" : "tri", duty: 0.25, gain: full ? 0.2 : 0.1, a: 0.003, d: 0.08, s: 0.7, r: 0.03 });
    }
    // パッド（コード）
    for (const tone of ch.tones) {
      note(buf, t0, BAR * 0.95, midi(tone), { type: "saw", gain: 0.025, pan: (tone % 3) - 1, a: 0.08, d: 0.3, s: 0.6, r: 0.25 });
    }
    // アルペジオ（16分・上下）
    const arp = [...ch.tones, ch.tones[1] + 12, ch.tones[2] + 12, ch.tones[1] + 12];
    for (let s16 = 0; s16 < 16; s16++) {
      const n = arp[s16 % arp.length] + 12;
      note(buf, t0 + s16 * BEAT / 4, BEAT / 4 * 0.6, midi(n), { type: "square", duty: 0.125, gain: 0.03, pan: s16 % 2 ? 0.45 : -0.45, a: 0.002, d: 0.05, s: 0.3, r: 0.02 });
    }
    // ドラム
    for (let b = 0; b < 4; b++) {
      const tb = t0 + b * BEAT;
      if (full || b === 0) kick(buf, tb, full ? 0.55 : 0.35);
      if (full && (b === 1 || b === 3)) noiseHit(buf, tb, 0.18, 0.22, { hp: 0.2, tone: 190 });
      for (let h = 0; h < 2; h++) noiseHit(buf, tb + h * BEAT / 2, 0.04, full ? (h ? 0.07 : 0.045) : 0.03, { hp: 0.98, pan: 0.3 });
    }
    if (full && bar % 4 === 3) {
      // 4小節ごとのフィル
      for (let k = 0; k < 4; k++) noiseHit(buf, t0 + 3 * BEAT + k * BEAT / 4, 0.1, 0.12 + k * 0.03, { hp: 0.3, tone: 220 - k * 20 });
    }
    // メロディ（イントロ後）
    if (full) {
      const phraseBar = (bar - introBars) % 8;
      for (const [pos, n, len] of MELODY) {
        if (Math.floor(pos / 4) !== phraseBar) continue;
        const ts = t0 + (pos % 4) * BEAT;
        if (variant === "b") {
          note(buf, ts, len * BEAT * 0.8, midi(n), { type: "square", duty: 0.5, gain: 0.07, a: 0.004, d: 0.1, s: 0.55, r: 0.06, vibrato: 0.006 });
          note(buf, ts, len * BEAT * 0.8, midi(n + 12), { type: "square", duty: 0.125, gain: 0.02, pan: 0.3, a: 0.004, d: 0.1, s: 0.4, r: 0.06 });
        } else {
          bell(buf, ts, midi(n), 0.11, 0, 0.7);
          note(buf, ts, len * BEAT * 0.85, midi(n), { type: "tri", gain: 0.06, a: 0.01, d: 0.1, s: 0.6, r: 0.08, vibrato: 0.004 });
        }
      }
    }
  }
  delay(buf, BEAT * 0.75, 0.35, 0.3);
  return master(buf, 1.2);
}

// ---------- 効果音 ----------
const sfx = {
  // 登場のポン
  pop() {
    const b = buffer(0.35);
    note(b, 0, 0.08, 520, { type: "sine", gain: 0.6, slide: 9, a: 0.002, d: 0.05, s: 0.5, r: 0.08 });
    note(b, 0.01, 0.05, 1040, { type: "tri", gain: 0.2, slide: 6, a: 0.002, d: 0.04, s: 0.3, r: 0.05 });
    return master(b, 1);
  },
  // 正解のキラーン
  correct() {
    const b = buffer(0.9);
    bell(b, 0, midi(84), 0.4, -0.2, 0.6);
    bell(b, 0.09, midi(91), 0.4, 0.2, 0.8);
    return master(b, 1);
  },
  // XP 獲得のコイン
  coin() {
    const b = buffer(0.45);
    note(b, 0, 0.06, midi(83), { type: "square", duty: 0.25, gain: 0.3, a: 0.001, d: 0.02, s: 0.8, r: 0.01 });
    note(b, 0.07, 0.25, midi(88), { type: "square", duty: 0.25, gain: 0.3, a: 0.001, d: 0.2, s: 0.3, r: 0.1 });
    return master(b, 1);
  },
  // 画面切り替えのシュッ
  whoosh() {
    const b = buffer(0.5);
    const [L, R] = b;
    let lp = 0;
    for (let i = 0; i < L.length; i++) {
      const t = i / SR;
      const k = 0.02 + 0.5 * Math.sin(Math.PI * Math.min(1, t / 0.45)); // フィルタの開閉
      lp += (rand() - lp) * k;
      const e = Math.sin(Math.PI * Math.min(1, t / 0.45)) ** 2;
      L[i] = lp * e * 0.8 * (1 - t);
      R[i] = lp * e * 0.8 * t * 2;
    }
    return master(b, 1);
  },
  // 地図の完成・バッジ獲得のファンファーレ
  fanfare() {
    const b = buffer(1.4);
    [72, 76, 79, 84].forEach((n, i) => {
      note(b, i * 0.08, i === 3 ? 0.7 : 0.07, midi(n), { type: "square", duty: 0.25, gain: 0.18, a: 0.003, d: 0.1, s: 0.6, r: 0.15, vibrato: i === 3 ? 0.01 : 0 });
      bell(b, i * 0.08, midi(n + 12), 0.12, i % 2 ? 0.3 : -0.3, 0.5);
    });
    delay(b, 0.12, 0.4, 0.35);
    return master(b, 1);
  },
  // キラキラ（成長・合格の城）
  sparkle() {
    const b = buffer(1.2);
    [88, 91, 93, 96, 100, 103].forEach((n, i) => bell(b, i * 0.055, midi(n), 0.14, i % 2 ? 0.6 : -0.6, 0.35));
    delay(b, 0.09, 0.5, 0.4);
    return master(b, 0.9);
  },
  // カウントアップのカチカチ
  tick() {
    const b = buffer(0.06);
    note(b, 0, 0.01, 2400, { type: "square", duty: 0.5, gain: 0.25, a: 0.0005, d: 0.01, s: 0.2, r: 0.01 });
    return master(b, 1);
  },
  // カードが着地するポスッ
  thud() {
    const b = buffer(0.25);
    note(b, 0, 0.05, 180, { type: "sine", gain: 0.6, slide: -3, a: 0.001, d: 0.06, s: 0.3, r: 0.08 });
    noiseHit(b, 0, 0.05, 0.12, { hp: 0.4 });
    return master(b, 1);
  },
};

await mkdir(OUT, { recursive: true });
await writeWav("bgm-a", bgm("a"));
seed = 7;
await writeWav("bgm-b", bgm("b"));
for (const [name, make] of Object.entries(sfx)) await writeWav(`sfx-${name}`, make());
