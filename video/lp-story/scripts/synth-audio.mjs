// BGM と効果音をコードで合成して public/audio/ に wav で書き出す（外部素材なし＝ライセンス管理不要）。
//   node scripts/synth-audio.mjs
//
// 曲は動画のタイムラインに合わせて組み立てる（台本を直して voice を作り直せば、曲の切り替わりも追従する）。
//   A（悩みの場面）  … 72BPM・Am–F–C–G。まばらなピアノとパッドだけ。転換の直前にライザーで持ち上げる
//   B（解決の場面）  … 96BPM・C–G/B–Am–F。転換の瞬間に和音が開き、ベース・軽いリズム・ベルの動機が入る
//   終わり          … 呼びかけの最後で C の和音を鳴らし切る
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FPS, buildScenes } from "../src/timelineCore.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/audio");
const SR = 48000;
const TAU = Math.PI * 2;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
let seed = 11;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

// ---------- タイムライン（動画と同じ計算） ----------
const manifest = JSON.parse(await readFile(path.join(ROOT, "src/voice-manifest.json"), "utf8"));
const scenes = buildScenes(manifest.lines);
const total = scenes.reduce((n, s) => n + s.frames, 0) / FPS;
const sceneAt = (id) => scenes.find((s) => s.id === id);
// 転換（夜→白）の瞬間。Pivot.tsx の IRIS.start（4フレーム）と合わせる
const REVEAL = (sceneAt("pivot").from + 4) / FPS;
const CTA = sceneAt("cta").from / FPS;

// ---------- 基本部品 ----------
function buffer(seconds) {
  const n = Math.ceil(seconds * SR);
  return [new Float32Array(n), new Float32Array(n)];
}
function add(buf, i, l, r) {
  if (i < 0 || i >= buf[0].length) return;
  buf[0][i] += l;
  buf[1][i] += r;
}
const panGains = (pan) => [Math.cos(((pan + 1) * Math.PI) / 4), Math.sin(((pan + 1) * Math.PI) / 4)];

/** ピアノ：倍音ごとに減衰の速さを変え、弦のわずかな不協和（インハーモニシティ）と打鍵ノイズを足す */
function piano(buf, start, n, vel = 0.5, dur = 1.5, pan = 0) {
  const f0 = midi(n);
  const [gl, gr] = panGains(pan);
  const base = 2.6 * Math.pow(440 / f0, 0.45); // 低い音ほど長く響く
  const B = 0.00035;
  const partials = [];
  for (let k = 1; k <= 9; k++) {
    const f = k * f0 * Math.sqrt(1 + B * k * k);
    if (f > 16000) break;
    partials.push({ f, a: (1 / Math.pow(k, 1.35)) * (k === 2 ? 0.8 : 1) * (0.55 + vel * 0.45 * Math.min(1, k / 3)), d: base / (1 + 0.55 * (k - 1)) });
  }
  const len = Math.floor((dur + 1.2) * SR);
  const i0 = Math.floor(start * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    // 鍵盤を離したらダンパーで素早く減衰
    const rel = t < dur ? 1 : Math.exp(-(t - dur) / 0.18);
    const att = Math.min(1, t / 0.004);
    let v = 0;
    for (const p of partials) v += p.a * Math.exp(-t / p.d) * (Math.sin(TAU * p.f * t) + 0.5 * Math.sin(TAU * p.f * 1.0007 * t));
    v *= att * rel * vel * 0.16;
    if (t < 0.012) v += rand() * 0.012 * vel * (1 - t / 0.012);
    add(buf, i0 + i, v * gl, v * gr);
  }
}

/** パッド：少しずらした3本のノコギリ波を1次ローパスで丸める */
function pad(buf, start, dur, notes, gain = 0.05, cutoff = 900, attack = 1.2, release = 1.6) {
  const len = Math.floor((dur + release) * SR);
  const i0 = Math.floor(start * SR);
  const k = 1 - Math.exp((-TAU * cutoff) / SR);
  notes.forEach((n, ni) => {
    const voices = [-7, 0, 7].map((c) => ({ f: midi(n) * 2 ** (c / 1200), ph: Math.abs(rand()) }));
    let lp1 = 0;
    let lp2 = 0;
    const [gl, gr] = panGains(((ni % 3) - 1) * 0.5);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const env = Math.min(1, t / attack) * (t < dur ? 1 : Math.exp(-(t - dur) / (release / 3)));
      let s = 0;
      for (const v of voices) {
        v.ph += v.f / SR;
        s += 2 * (v.ph % 1) - 1;
      }
      lp1 += (s - lp1) * k;
      lp2 += (lp1 - lp2) * k;
      const out = lp2 * env * gain;
      add(buf, i0 + i, out * gl, out * gr);
    }
  });
}

/** ベル（ガラスのような減衰音） */
function bell(buf, start, n, gain = 0.1, pan = 0, decay = 1.4) {
  const f = midi(n);
  const [gl, gr] = panGains(pan);
  const i0 = Math.floor(start * SR);
  const len = Math.floor(decay * 3 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const e = Math.exp(-t / decay) * Math.min(1, t / 0.002);
    const v = (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2.756 * t) * Math.exp(-t / 0.3) + 0.15 * Math.sin(TAU * f * 5.404 * t) * Math.exp(-t / 0.12)) * e * gain;
    add(buf, i0 + i, v * gl, v * gr);
  }
}

/** ベース：サイン＋少しの倍音、軽く歪ませて芯を出す */
function bass(buf, start, n, dur, gain = 0.2) {
  const f = midi(n);
  const i0 = Math.floor(start * SR);
  const len = Math.floor((dur + 0.15) * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.012) * (t < dur ? Math.exp(-t / 2.2) : Math.exp(-dur / 2.2) * Math.exp(-(t - dur) / 0.05));
    const v = Math.tanh((Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 2 * f * t)) * 1.4) * env * gain;
    add(buf, i0 + i, v, v);
  }
}

function kick(buf, start, gain = 0.4) {
  const i0 = Math.floor(start * SR);
  let ph = 0;
  for (let i = 0; i < 0.35 * SR; i++) {
    const t = i / SR;
    ph += (46 + 70 * Math.exp(-t * 32)) / SR;
    const v = Math.sin(TAU * ph) * Math.exp(-t * 8) * gain;
    add(buf, i0 + i, v, v);
  }
}

/** ノイズの打撃（ハイパスの強さで明るさを変える） */
function noise(buf, start, dur, gain, { hp = 0.9, pan = 0, decay = 0.3 } = {}) {
  const i0 = Math.floor(start * SR);
  const [gl, gr] = panGains(pan);
  let prev = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR;
    const n = rand();
    const h = n - prev * hp;
    prev = n;
    const v = h * Math.exp(-t / (dur * decay)) * Math.min(1, t / 0.001) * gain;
    add(buf, i0 + i, v * gl, v * gr);
  }
}

/** Freeverb（Schroeder–Moorer 型の残響）。dry に wet を混ぜて返す */
function reverb([L, R], { room = 0.84, damp = 0.25, wet = 0.3 } = {}) {
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const aps = [556, 441, 341, 225];
  const run = (input, spread) => {
    const out = new Float32Array(input.length);
    for (const c of combs) {
      const size = Math.floor((c + spread) * scale);
      const line = new Float32Array(size);
      let idx = 0;
      let store = 0;
      for (let i = 0; i < input.length; i++) {
        const y = line[idx];
        store = y * (1 - damp) + store * damp;
        line[idx] = input[i] * 0.015 + store * room;
        out[i] += y;
        idx = (idx + 1) % size;
      }
    }
    for (const a of aps) {
      const size = Math.floor((a + spread) * scale);
      const line = new Float32Array(size);
      let idx = 0;
      for (let i = 0; i < out.length; i++) {
        const b = line[idx];
        const y = -out[i] + b;
        line[idx] = out[i] + b * 0.5;
        out[i] = y;
        idx = (idx + 1) % size;
      }
    }
    return out;
  };
  const wl = run(L, 0);
  const wr = run(R, 23);
  for (let i = 0; i < L.length; i++) {
    L[i] += wl[i] * wet;
    R[i] += wr[i] * wet;
  }
  return [L, R];
}

function mixInto(dst, src, gain = 1) {
  for (let i = 0; i < dst[0].length && i < src[0].length; i++) {
    dst[0][i] += src[0][i] * gain;
    dst[1][i] += src[1][i] * gain;
  }
}

function master(buf, peakTarget = 0.89) {
  const [L, R] = buf;
  let peak = 0;
  for (let i = 0; i < L.length; i++) {
    L[i] = Math.tanh(L[i] * 1.1);
    R[i] = Math.tanh(R[i] * 1.1);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = peakTarget / (peak || 1);
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
function bgm() {
  const len = total + 0.5;
  const keys = buffer(len); // ピアノ・ベル（残響を多め）
  const pads = buffer(len); // パッド（残響少なめ）
  const low = buffer(len); // ベース・キック（残響なし）
  const perc = buffer(len); // シェイカー・リム（残響少なめ）

  // --- A：悩みの場面（72BPM・Am F C G） ---
  const beatA = 60 / 72;
  const barA = beatA * 4;
  const chordsA = [
    { root: 45, pad: [57, 60, 64, 71], arp: [69, 72, 76, 79] }, // Am(add9 気味)
    { root: 41, pad: [57, 60, 64, 65], arp: [65, 69, 72, 76] }, // Fmaj7
    { root: 48, pad: [55, 60, 64, 67], arp: [67, 72, 76, 79] }, // C
    { root: 43, pad: [55, 59, 62, 64], arp: [67, 71, 74, 76] }, // G6
  ];
  // 転換の瞬間に A の小節頭がそろうよう、逆算して始める（最初の小節は途中から）
  const barsA = Math.ceil(REVEAL / barA);
  const startA = REVEAL - barsA * barA;
  for (let b = 0; b < barsA; b++) {
    const t0 = startA + b * barA;
    const ch = chordsA[((b % 4) + 4) % 4];
    const late = b >= barsA - 2; // 転換の直前は少し厚く
    if (t0 + barA > 0) pad(pads, Math.max(0, t0), barA, ch.pad, late ? 0.05 : 0.04, late ? 1300 : 850);
    if (b >= 1 && t0 + barA > 0) bass(low, Math.max(0, t0), ch.root - 12 + 12, barA * 0.95, 0.07);
    // ピアノ：1・2.5・3・4拍目に分散和音。後半ほど音を増やす
    const hits = late ? [0, 1, 1.5, 2, 3, 3.5] : [0, 1.5, 2, 3];
    hits.forEach((h, k) => {
      const t = t0 + h * beatA;
      if (t < 0.4) return;
      piano(keys, t, ch.arp[k % 4] - (k === 0 ? 12 : 0), k === 0 ? 0.5 : 0.36, beatA * 1.6, ((k % 3) - 1) * 0.35);
    });
  }
  // 冒頭の一音（写真が出るのに合わせて）
  piano(keys, 0.35, 57, 0.42, 3, 0);
  piano(keys, 0.35, 64, 0.3, 3, 0.2);

  // ライザー：転換の 2.6 秒前からノイズとパッドを持ち上げ、転換で切る
  {
    const dur = 2.6;
    const i0 = Math.floor((REVEAL - dur) * SR);
    let lp = 0;
    for (let i = 0; i < dur * SR; i++) {
      const t = i / SR;
      const p = t / dur;
      const k = 0.01 + 0.25 * p * p;
      lp += (rand() - lp) * k;
      const v = lp * p ** 2.2 * 0.5;
      add(perc, i0 + i, v * (1 - p * 0.3), v * (0.7 + p * 0.3));
    }
    pad(pads, REVEAL - dur, dur, [52, 59, 64, 67], 0.03, 2000, dur * 0.9, 0.05);
  }

  // --- B：解決の場面（96BPM・C G/B Am F） ---
  const beat = 60 / 96;
  const bar = beat * 4;
  const chords = [
    { root: 48, pad: [55, 60, 64, 67], arp: [60, 64, 67, 72, 74, 72, 67, 64], top: 76 }, // C(add9)
    { root: 47, pad: [55, 59, 62, 67], arp: [59, 62, 67, 71, 74, 71, 67, 62], top: 74 }, // G/B
    { root: 45, pad: [57, 60, 64, 69], arp: [57, 60, 64, 69, 72, 69, 64, 60], top: 72 }, // Am
    { root: 41, pad: [57, 60, 65, 69], arp: [57, 60, 65, 69, 72, 69, 65, 60], top: 74 }, // F
  ];
  // ベルの動機（2小節で1句。拍位置, MIDI）
  const motif = [[0, 79], [1, 76], [1.5, 79], [2, 81], [4, 79], [5.5, 76], [6, 74]];
  const endChord = CTA + (sceneAt("cta").frames / FPS) * 0.55; // 呼びかけの途中で最後の和音へ
  const barsB = Math.floor((endChord - REVEAL) / bar);
  // 転換の瞬間：和音が開く
  [48, 55, 60, 64, 67, 74].forEach((n, k) => piano(keys, REVEAL + k * 0.018, n, 0.55 - k * 0.03, bar * 1.2, (k / 5 - 0.5) * 0.8));
  bell(keys, REVEAL + 0.02, 84, 0.06, 0.3, 1.8);
  for (let b = 0; b < barsB; b++) {
    const t0 = REVEAL + b * bar;
    const ch = chords[b % 4];
    const groove = b >= 1; // 2小節目からリズム
    const ctaSection = t0 >= CTA - 0.01; // 呼びかけではリズムを抜いて言葉を立てる
    pad(pads, t0, bar, ch.pad, 0.032, 1500, 0.3, 1.0);
    // ベース：4分で刻む（2拍目と4拍目は弱く）
    if (groove) for (let q = 0; q < 4; q++) bass(low, t0 + q * beat, ch.root - 12 + (q === 3 && b % 2 ? 7 : 0), beat * 0.85, q % 2 ? 0.09 : 0.13);
    // ピアノ：8分の分散和音
    if (b >= 0)
      ch.arp.forEach((n, k) => {
        if (b === 0 && k < 1) return; // 頭は開いた和音に任せる
        piano(keys, t0 + k * (beat / 2), n + 12, k % 2 ? 0.24 : 0.3, beat * 0.9, k % 2 ? 0.35 : -0.35);
      });
    // リズム
    if (groove && !ctaSection) {
      kick(low, t0, 0.32);
      kick(low, t0 + 2 * beat, 0.26);
      if (b % 2 === 1) kick(low, t0 + 3.5 * beat, 0.16);
      for (const q of [1, 3]) noise(perc, t0 + q * beat, 0.12, 0.08, { hp: 0.3, decay: 0.2, pan: 0.1 });
      for (let e = 0; e < 8; e++) noise(perc, t0 + e * (beat / 2) + (e % 2 ? 0.012 : 0), 0.05, e % 2 ? 0.035 : 0.022, { hp: 0.97, pan: 0.4 });
    }
    // ベル：2小節ごとの動機（リズムが入ってから）
    if (b >= 2 && b % 2 === 0 && !ctaSection)
      motif.forEach(([pos, n]) => {
        const t = t0 + pos * beat;
        bell(keys, t, n + (b % 4 === 2 ? 0 : -2), 0.045, 0.25, 1.1);
      });
  }
  // 終わりの和音（C add9）
  [36, 48, 55, 60, 64, 67, 74].forEach((n, k) => piano(keys, endChord + k * 0.025, n, 0.5 - k * 0.025, 4.5, (k / 6 - 0.5) * 0.8));
  bell(keys, endChord + 0.05, 84, 0.05, -0.2, 2.4);
  bell(keys, endChord + 0.3, 91, 0.03, 0.3, 2.4);
  pad(pads, endChord, 3.6, [48, 55, 64, 67], 0.035, 1200, 0.4, 2.0);

  reverb(keys, { room: 0.86, damp: 0.3, wet: 0.42 });
  reverb(pads, { room: 0.8, damp: 0.4, wet: 0.18 });
  reverb(perc, { room: 0.7, damp: 0.5, wet: 0.12 });
  const out = buffer(len);
  mixInto(out, keys, 1.0);
  mixInto(out, pads, 0.9);
  mixInto(out, low, 0.9);
  mixInto(out, perc, 0.8);
  return master(out);
}

// ---------- 効果音 ----------
const sfx = {
  // 画面切り替えのやわらかい風切り
  whoosh() {
    const b = buffer(0.8);
    let lp = 0;
    for (let i = 0; i < 0.7 * SR; i++) {
      const t = i / SR;
      const p = t / 0.7;
      const e = Math.sin(Math.PI * p) ** 2;
      lp += (rand() - lp) * (0.02 + 0.18 * e);
      add(b, i, lp * e * (1 - p * 0.6), lp * e * (0.4 + p * 0.6));
    }
    return master(reverb(b, { room: 0.6, wet: 0.2 }), 0.7);
  },
  // 夜→白へ開く瞬間：吸い込むような立ち上がりから和音
  bloom() {
    const b = buffer(3.2);
    let lp = 0;
    for (let i = 0; i < 0.35 * SR; i++) {
      const t = i / SR;
      const p = t / 0.35;
      lp += (rand() - lp) * (0.02 + 0.3 * p);
      add(b, i, lp * p ** 2 * 0.4, lp * p ** 2 * 0.4);
    }
    [72, 76, 79, 83, 86].forEach((n, k) => bell(b, 0.33 + k * 0.04, n, 0.12 - k * 0.012, (k / 4 - 0.5) * 0.9, 1.4));
    return master(reverb(b, { room: 0.88, wet: 0.5 }), 0.8);
  },
  // モチットの登場・URL の出現：小さな泡のようなポン
  pop() {
    const b = buffer(0.4);
    let ph = 0;
    for (let i = 0; i < 0.14 * SR; i++) {
      const t = i / SR;
      ph += (420 + 900 * (t / 0.14)) / SR;
      const v = Math.sin(TAU * ph) * Math.sin(Math.PI * Math.min(1, t / 0.14)) * 0.6;
      add(b, i, v, v);
    }
    return master(reverb(b, { room: 0.5, wet: 0.15 }), 0.7);
  },
  // 選択肢をタップ
  tap() {
    const b = buffer(0.12);
    for (let i = 0; i < 0.04 * SR; i++) {
      const t = i / SR;
      const v = (Math.sin(TAU * 1500 * t) * 0.5 + rand() * 0.3) * Math.exp(-t / 0.006);
      add(b, i, v, v);
    }
    return master(b, 0.6);
  },
  // 正解：明るい2音
  correct() {
    const b = buffer(1.8);
    bell(b, 0, 84, 0.3, -0.2, 0.7);
    bell(b, 0.1, 91, 0.3, 0.2, 0.9);
    return master(reverb(b, { room: 0.75, wet: 0.3 }), 0.75);
  },
  // 赤ペンで書く（紙をこする短いノイズ）
  mark() {
    const b = buffer(0.7);
    let prev = 0;
    let bp = 0;
    for (let i = 0; i < 0.55 * SR; i++) {
      const t = i / SR;
      const n = rand();
      const h = n - prev * 0.95;
      prev = n;
      bp += (h - bp) * 0.35;
      const stroke = 0.6 + 0.4 * Math.sin(TAU * 7 * t);
      const e = Math.sin(Math.PI * Math.min(1, t / 0.55)) * stroke;
      add(b, i, bp * e * 0.5, bp * e * 0.5);
    }
    return master(b, 0.5);
  },
  // サイクルの点灯
  chime() {
    const b = buffer(2.2);
    bell(b, 0, 86, 0.25, 0, 1.0);
    bell(b, 0, 79, 0.1, 0, 1.0);
    return master(reverb(b, { room: 0.8, wet: 0.35 }), 0.7);
  },
};

await mkdir(OUT, { recursive: true });
await writeWav("bgm", bgm());
for (const [name, make] of Object.entries(sfx)) await writeWav(`sfx-${name}`, make());
console.log(`reveal ${REVEAL.toFixed(2)}s / cta ${CTA.toFixed(2)}s / total ${total.toFixed(2)}s`);
