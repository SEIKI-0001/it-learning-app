"use client";

import { useState, type ReactNode } from "react";
import styles from "../calc/calc.module.css";
import { Choices, LeveledPractice, Note, Replay, type Choice, type LeveledQuestion } from "../calc/CalcParts";
import { useBeats } from "../calc/useBeats";
import { Panel, SectionTitle } from "../ui";

// マルチメディアとデータ圧縮。大きくしすぎず、確認問題に要る範囲だけ。
//   ① 圧縮とは：AAAAABBBCC（10個）→ A5B3C2（6個）。同じ情報をより小さく持つ
//   ② 可逆／非可逆：展開して元と比べる。文字は完全に一致、写真はモザイク状に細部が消える
//   ③ 形式の使い分け：場面 → PNG / JPEG / MP3 / ZIP
//   ④ 圧縮率：このサービスでは「圧縮率＝圧縮後 ÷ 圧縮前」（元の何%の大きさになったか）に統一
//   ⑤ 画像・色・現実と仮想の用語：解像度、RGB/CMYK、VR/AR/MR
//   ⑥ 確認5問

export const MEDIA_STEPS = ["① 戻せるか", "② 用途で選ぶ", "③ 元 × 圧縮率"];

const RAW = "AAAAABBBCC".split("");
const RUNS: [string, number][] = [
  ["A", 5],
  ["B", 3],
  ["C", 2],
];
const LETTER_TONE: Record<string, string> = {
  A: "bg-brand-500 text-white",
  B: "bg-sky-500 text-white",
  C: "bg-emerald-500 text-white",
};

function Blocks({ items, testId }: { items: string[]; testId?: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-1" data-testid={testId} data-count={items.length}>
      {items.map((c, i) => (
        <span
          key={`${i}-${c}`}
          className={`grid h-7 w-7 place-items-center rounded text-sm font-bold ${/\d/.test(c) ? "bg-amber-300 text-amber-950" : LETTER_TONE[c]} ${styles.pop}`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① 圧縮とは
// ---------------------------------------------------------------------------

const COMPRESS_DELAYS = [1300, 1500, 1500, 1500];

export function CompressStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(5, COMPRESS_DELAYS);
  const packed = RUNS.flatMap(([c, n]) => [c, String(n)]);
  return (
    <Panel>
      <SectionTitle step={1}>圧縮 ― 同じ情報を、もっと小さく</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        10個のデータ <b className="font-mono text-gray-800">AAAAABBBCC</b> があります。1個ずつ全部持つ必要はあるでしょうか？
      </p>
      <div ref={ref} className="mt-3 space-y-2" data-testid="media-compress" data-beat={b}>
        <div className="rounded-xl bg-gray-50 px-2 py-3 ring-1 ring-gray-200">
          <div className="mb-1.5 text-center text-[11px] font-bold text-gray-500">元のデータ（10個）</div>
          {b >= 1 ? (
            <div className="flex justify-center gap-2">
              {RUNS.map(([c, n]) => (
                <div key={c} className={`rounded-lg border-2 border-dashed border-gray-300 p-1 ${styles.reveal}`}>
                  <div className="flex gap-0.5">
                    {Array.from({ length: n }, (_, i) => (
                      <span key={i} className={`grid h-7 w-5 place-items-center rounded text-xs font-bold ${LETTER_TONE[c]}`}>
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="mt-0.5 text-center text-[10px] font-bold text-gray-500">
                    {c}が{n}個
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Blocks items={RAW} />
          )}
        </div>
        {b >= 2 && (
          <>
            <div className="text-center text-lg text-gray-400">↓ 「何が何個」と書く</div>
            <div className={`rounded-xl bg-white px-2 py-3 ring-2 ring-brand-300 ${styles.reveal}`}>
              <div className="mb-1.5 text-center text-[11px] font-bold text-brand-700">圧縮後（6個）</div>
              <Blocks items={packed} testId="media-compress-packed" />
            </div>
          </>
        )}
        {b >= 3 && (
          <p className={`text-center text-lg font-bold text-gray-800 ${styles.reveal}`} data-testid="media-compress-eq">
            10個 → <span className="text-brand-600">6個</span>
          </p>
        )}
        {b >= 4 && (
          <Note>
            💡 <b>圧縮＝同じ情報を、より小さいデータ量で持つ</b>こと。画像・音声・動画はとても大きいので、保存や送信の前に圧縮します。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 可逆 ／ 非可逆
// ---------------------------------------------------------------------------

const N = 8;
// 写真の代わり：なめらかなグラデーション＋小さな点（細部）
function photoPixel(x: number, y: number) {
  const detail = (x === 5 && y === 2) || (x === 2 && y === 5) ? 40 : 0;
  const h = 200 + x * 6 + y * 4;
  const l = 38 + y * 5 + detail;
  return `hsl(${h} 70% ${Math.min(l, 90)}%)`;
}
function coarsePixel(x: number, y: number) {
  // 2×2 マスごとに左上の色でまとめる（細部は消える）
  return photoPixel(x - (x % 2), y - (y % 2));
}

function PixelGrid({ size, pixel, cell = 9 }: { size: number; pixel: (x: number, y: number) => string; cell?: number }) {
  return (
    <div className="grid w-fit gap-px rounded bg-gray-200 p-px" style={{ gridTemplateColumns: `repeat(${size}, ${cell}px)` }}>
      {Array.from({ length: size * size }, (_, i) => (
        <span key={i} style={{ height: cell, background: pixel(i % size, Math.floor(i / size)) }} />
      ))}
    </div>
  );
}

const LOSS_DELAYS = [1300, 1500, 1500, 1500];

export function LossStage() {
  const [mode, setMode] = useState<"lossless" | "lossy">("lossless");
  const { ref, beat: b, reducedMotion, replay } = useBeats(5, LOSS_DELAYS);
  const lossless = mode === "lossless";
  const pick = (m: "lossless" | "lossy") => {
    setMode(m);
    replay();
  };
  const packed = RUNS.flatMap(([c, n]) => [c, String(n)]);
  const box = (label: string, child: ReactNode, tone = "bg-gray-50 ring-gray-200") => (
    <div className={`flex flex-col items-center rounded-lg px-1 py-1.5 ring-1 ${tone} ${styles.reveal}`}>
      <div className="mb-1 text-[10px] font-bold text-gray-500">{label}</div>
      {child}
    </div>
  );
  return (
    <Panel>
      <SectionTitle step={2}>可逆と非可逆 ― 元に戻せる？</SectionTitle>
      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        {(["lossless", "lossy"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => pick(m)}
            aria-pressed={mode === m}
            className={`rounded-lg px-1 py-1.5 text-xs font-bold transition active:scale-95 ${mode === m ? "bg-brand-600 text-white" : "text-gray-500"}`}
          >
            {m === "lossless" ? "可逆圧縮（文字）" : "非可逆圧縮（写真）"}
          </button>
        ))}
      </div>
      <div ref={ref} className="mt-3" data-testid="media-loss" data-mode={mode} data-beat={b}>
        <div className="grid grid-cols-3 items-start gap-1.5">
          {box(
            "元",
            lossless ? <span className="font-mono text-[11px] font-bold text-gray-800">AAAAABBBCC</span> : <PixelGrid size={N} pixel={photoPixel} />,
          )}
          {b >= 1
            ? box(
                "圧縮",
                lossless ? (
                  <span className="font-mono text-[11px] font-bold text-brand-700">{packed.join("")}</span>
                ) : (
                  <PixelGrid size={N / 2} pixel={(x, y) => photoPixel(x * 2, y * 2)} />
                ),
                "bg-brand-50 ring-brand-200",
              )
            : <div />}
          {b >= 2
            ? box(
                "展開（元に戻す）",
                lossless ? <span className="font-mono text-[11px] font-bold text-gray-800">AAAAABBBCC</span> : <PixelGrid size={N} pixel={coarsePixel} />,
              )
            : <div />}
        </div>
        {b >= 3 && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-center text-sm font-bold ${lossless ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"} ${styles.reveal}`}
            data-testid="media-loss-verdict"
          >
            {lossless ? "✅ 元と完全に一致（1文字も変わらない）" : "≈ ぱっと見は同じ。でも細かい点が消え、元には戻らない"}
          </p>
        )}
        {b >= 4 && (
          <Note>
            {lossless ? (
              <>
                💡 <b>可逆圧縮</b>：展開すると<b>完全に元どおり</b>。文書・プログラムなど<b>1文字でも変わると困るデータ</b>に使う。
              </>
            ) : (
              <>
                💡 <b>非可逆圧縮</b>：人が気づきにくい細部を捨てるので<b>もっと小さくできる</b>が、<b>元には戻せない</b>。写真・音楽・動画に使う。
              </>
            )}
          </Note>
        )}
        <Replay onClick={() => pick(mode)} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 形式の使い分け
// ---------------------------------------------------------------------------

const FMT = ["PNG", "JPEG", "MP3", "ZIP"];
const fmt = (ok: string, why: Record<string, string>): Choice[] => FMT.map((f) => (f === ok ? { label: f, ok: true } : { label: f, why: why[f] }));

export const FORMAT_SCENES: { emoji: string; text: string; choices: Choice[] }[] = [
  {
    emoji: "📸",
    text: "旅行の写真を、できるだけ小さく大量に保存したい",
    choices: fmt("JPEG", {
      PNG: "PNGは可逆なので写真だと大きいまま。多少の劣化を許して小さくするならJPEG。",
      MP3: "MP3は音声の形式です。",
      ZIP: "ZIPはファイルをまとめる可逆圧縮。写真をさらに小さくする効果はほとんどありません。",
    }),
  },
  {
    emoji: "🏷️",
    text: "会社のロゴ。文字の輪郭をくっきり保ち、背景を透明にしたい",
    choices: fmt("PNG", {
      JPEG: "JPEGは非可逆で、文字の輪郭がにじみやすく、透過も扱えません。",
      MP3: "MP3は音声の形式です。",
      ZIP: "ZIPは画像形式ではなく、ファイルをまとめる形式です。",
    }),
  },
  {
    emoji: "🎧",
    text: "音楽を小さくしてスマートフォンで持ち歩きたい",
    choices: fmt("MP3", {
      PNG: "PNGは画像の形式です。",
      JPEG: "JPEGは画像（写真）の形式です。",
      ZIP: "ZIPは可逆なので、音声はあまり小さくなりません。聞こえにくい音を捨てるMP3が向きます。",
    }),
  },
  {
    emoji: "🗂️",
    text: "プログラムのファイル一式をまとめてメールで送る（1文字でも変わると動かない）",
    choices: fmt("ZIP", {
      PNG: "PNGは画像の形式です。",
      JPEG: "JPEGは非可逆の画像形式。プログラムは完全に元どおりでないと困ります。",
      MP3: "MP3は非可逆の音声形式です。",
    }),
  },
];

const FORMAT_TABLE: { name: string; lossless: boolean; use: string }[] = [
  { name: "PNG", lossless: true, use: "図・文字・ロゴ（透過できる）" },
  { name: "GIF", lossless: true, use: "256色までの図・簡単なアニメ" },
  { name: "JPEG", lossless: false, use: "写真" },
  { name: "MP3", lossless: false, use: "音声・音楽" },
  { name: "MPEG（MP4）", lossless: false, use: "動画" },
  { name: "ZIP", lossless: true, use: "ファイル全般をまとめて圧縮" },
];

export function FormatStage() {
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const all = answered.size === FORMAT_SCENES.length;
  return (
    <Panel>
      <SectionTitle step={3}>どの形式を選ぶ？ ― 用途で決まる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">場面ごとに、ちょうどよい形式を選んでみよう。</p>
      <ul className="mt-3 space-y-2.5" data-testid="media-format" data-answered={answered.size}>
        {FORMAT_SCENES.map((s, i) => (
          <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <p className="text-sm font-bold leading-relaxed text-gray-800">
              <span aria-hidden>{s.emoji} </span>
              {s.text}
            </p>
            <div className="mt-2">
              <Choices choices={s.choices} cols={4} onAnswer={() => setAnswered((cur) => new Set(cur).add(i))} testId={`media-format-${i}`} />
            </div>
          </li>
        ))}
      </ul>
      {all && (
        <div className={`mt-3 rounded-xl bg-white p-3 ring-1 ring-gray-200 ${styles.reveal}`} data-testid="media-format-table">
          <ul className="space-y-1">
            {FORMAT_TABLE.map((f) => (
              <li key={f.name} className="flex items-center gap-2 text-xs">
                <span className="w-24 flex-none font-bold text-gray-800">{f.name}</span>
                <span className={`flex-none rounded px-1.5 py-0.5 text-[10px] font-bold ${f.lossless ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                  {f.lossless ? "可逆" : "非可逆"}
                </span>
                <span className="text-gray-600">{f.use}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ 圧縮率
// ---------------------------------------------------------------------------

const SIZES = [10, 20, 50];
const RATES = [40, 30, 25];

export function RatioStage() {
  const [size, setSize] = useState(10);
  const [rate, setRate] = useState(40);
  const after = (size * rate) / 100;
  const cut = size - after;
  return (
    <Panel>
      <SectionTitle step={4}>圧縮率 ― 元の何%の大きさになった？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        このサービスでは <b className="text-gray-800">圧縮率 ＝ 圧縮後の大きさ ÷ 元の大きさ</b> とします。数字が<b className="text-gray-800">小さいほどよく縮んだ</b>ことになります。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-gray-500">
        <div>
          元の大きさ
          <div className="mt-1 grid grid-cols-3 gap-1">
            {SIZES.map((v) => (
              <button key={v} type="button" onClick={() => setSize(v)} aria-pressed={size === v} className={`rounded-lg py-1.5 text-xs font-bold active:scale-95 ${size === v ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"}`}>
                {v}MB
              </button>
            ))}
          </div>
        </div>
        <div>
          圧縮率
          <div className="mt-1 grid grid-cols-3 gap-1">
            {RATES.map((v) => (
              <button key={v} type="button" onClick={() => setRate(v)} aria-pressed={rate === v} className={`rounded-lg py-1.5 text-xs font-bold active:scale-95 ${rate === v ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"}`}>
                {v}%
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5" data-testid="media-ratio" data-after={after}>
        <div>
          <div className="flex justify-between text-[11px] font-bold text-gray-600">
            <span>元</span>
            <span className="tabular-nums">{size}MB</span>
          </div>
          <div className="h-5 rounded bg-gray-300" />
        </div>
        <div>
          <div className="flex justify-between text-[11px] font-bold text-brand-700">
            <span>圧縮後（元の{rate}%）</span>
            <span className="tabular-nums">{after}MB</span>
          </div>
          <div className="relative h-5 rounded bg-gray-100">
            <div className={`h-full rounded bg-brand-500 ${styles.width}`} style={{ width: `${rate}%` }} />
            <span className="absolute inset-y-0 right-1 grid place-items-center text-[10px] font-bold text-gray-400">減った分 {cut}MB（{100 - rate}%）</span>
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-white px-3 py-2 text-center text-base font-bold ring-1 ring-gray-200" data-testid="media-ratio-eq">
        {size}MB × {rate}% ＝ <span className="text-brand-600">{after}MB</span>
        <span className="mt-0.5 block text-[11px] font-bold text-gray-500">
          逆に、圧縮率 ＝ {after} ÷ {size} ＝ {rate}%
        </span>
      </div>
      <Note>
        💡 問題文を読み分ける：<b>「元の{rate}%に圧縮」→ {after}MB</b>、<b>「{rate}%削減」→ 元の{100 - rate}%が残る</b>。どちらの意味か、問題文の定義を必ず確かめよう。
      </Note>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ 画像・色・現実と仮想の用語
// ---------------------------------------------------------------------------

const XR = {
  VR: { real: false, overlay: "仮想空間に入りこむ", ex: "ゴーグルで仮想の工場を歩いて安全訓練", scene: "🥽 見えるのは全部 仮想の世界" },
  AR: { real: true, overlay: "現実に情報を重ねる", ex: "カメラに映る道路に矢印を表示", scene: "📱 現実の映像 ＋ 矢印や説明" },
  MR: { real: true, overlay: "現実と仮想を融合して操作", ex: "机の上に置いた立体模型を手で回す", scene: "🖐️ 現実の机に置いた仮想の模型をつかむ" },
} as const;

export function TermsStage() {
  const [fine, setFine] = useState(true);
  const [xr, setXr] = useState<keyof typeof XR>("AR");
  const x = XR[xr];
  return (
    <Panel>
      <SectionTitle step={5}>画像・色・現実と仮想の用語</SectionTitle>

      <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <div className="flex items-center justify-between">
          <b className="text-sm text-gray-800">解像度</b>
          <button type="button" onClick={() => setFine(!fine)} aria-pressed={fine} className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95">
            {fine ? "粗くする" : "細かくする"}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3" data-testid="media-resolution" data-fine={fine ? "true" : "false"}>
          {fine ? <PixelGrid size={N} pixel={photoPixel} cell={8} /> : <PixelGrid size={N / 2} pixel={(a, c) => photoPixel(a * 2, c * 2)} cell={17} />}
          <p className="text-xs leading-relaxed text-gray-600">
            画像を作る<b>画素（点）の細かさ</b>。画素が多いほど細かく表せるが、データ量も増える。縮小して一覧表示した小さな画像は<b>サムネイル</b>。
          </p>
        </div>
      </div>

      <div className="mt-2 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <b className="text-sm text-gray-800">RGB と CMYK</b>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[11px]">
          <div>
            <svg viewBox="0 0 60 50" className="mx-auto h-12 bg-gray-900 rounded" aria-hidden>
              <g style={{ isolation: "isolate" }}>
                <circle cx="24" cy="20" r="13" fill="#f00" style={{ mixBlendMode: "screen" }} />
                <circle cx="36" cy="20" r="13" fill="#0f0" style={{ mixBlendMode: "screen" }} />
                <circle cx="30" cy="31" r="13" fill="#00f" style={{ mixBlendMode: "screen" }} />
              </g>
            </svg>
            <p className="mt-1 font-bold text-gray-700">RGB＝光を足す（画面）</p>
            <p className="text-gray-500">重ねるほど白に近づく</p>
          </div>
          <div>
            <svg viewBox="0 0 60 50" className="mx-auto h-12 bg-white rounded ring-1 ring-gray-200" aria-hidden>
              <g style={{ isolation: "isolate" }}>
                <circle cx="24" cy="20" r="13" fill="#0ff" style={{ mixBlendMode: "multiply" }} />
                <circle cx="36" cy="20" r="13" fill="#f0f" style={{ mixBlendMode: "multiply" }} />
                <circle cx="30" cy="31" r="13" fill="#ff0" style={{ mixBlendMode: "multiply" }} />
              </g>
            </svg>
            <p className="mt-1 font-bold text-gray-700">CMYK＝インクを重ねる（印刷）</p>
            <p className="text-gray-500">重ねるほど暗くなる（K＝黒）</p>
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <b className="text-sm text-gray-800">VR・AR・MR</b>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {(Object.keys(XR) as (keyof typeof XR)[]).map((k) => (
            <button key={k} type="button" onClick={() => setXr(k)} aria-pressed={xr === k} className={`rounded-lg py-1.5 text-xs font-bold active:scale-95 ${xr === k ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"}`}>
              {k}
            </button>
          ))}
        </div>
        <div key={xr} className={`mt-2 rounded-lg px-3 py-2 text-xs leading-relaxed ${x.real ? "bg-sky-50 text-sky-900" : "bg-brand-50 text-brand-900"} ${styles.reveal}`} data-testid="media-xr" data-xr={xr}>
          <p className="font-bold">{x.scene}</p>
          <p className="mt-0.5">
            <b>{xr}＝{x.overlay}</b>（現実が{x.real ? "見える" : "見えない"}）。例：{x.ex}
          </p>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑥ 確認5問
// ---------------------------------------------------------------------------

export const MEDIA_QUESTIONS: LeveledQuestion[] = [
  {
    level: "Lv.1 可逆・非可逆",
    prompt: "展開すると、圧縮前のデータへ完全に戻せる圧縮方式は？",
    choices: [
      { label: "可逆圧縮", ok: true },
      { label: "非可逆圧縮", why: "非可逆圧縮は細部を捨てるので、元には完全に戻りません。", step: 0 },
    ],
    solution: "① 完全に戻せる ＝ 可逆（逆にたどれる）",
  },
  {
    level: "Lv.2 形式を選ぶ",
    prompt: "写真を小さく保存したい。元には完全に戻らなくてもよい。適切な形式は？",
    choices: [
      { label: "JPEG", ok: true },
      { label: "PNG", why: "PNGは可逆なので、写真では小さくなりにくい。図や文字・透過向けです。", step: 1 },
      { label: "MP3", why: "MP3は音声の形式です。", step: 1 },
    ],
    solution: "② 写真・劣化を許す → 非可逆の JPEG",
  },
  {
    level: "Lv.3 圧縮後の大きさ",
    prompt: "30MBのファイルを、圧縮率40%（圧縮後の大きさが元の40%）で圧縮した。圧縮後は何MB？",
    choices: [
      { label: "12MB", ok: true },
      { label: "18MB", why: "40%削減したと読んでいます（30 × 0.6）。ここでは「元の40%の大きさ」。", step: 2 },
      { label: "75MB", why: "割っています（30 ÷ 0.4）。圧縮後 ＝ 元 × 圧縮率。", step: 2 },
    ],
    solution: "③ 30 × 0.4 ＝ 12MB",
  },
  {
    level: "Lv.4 圧縮率を求める",
    prompt: "8MBの画像を圧縮したら2MBになった。圧縮率（圧縮後 ÷ 圧縮前）は？",
    choices: [
      { label: "25%", ok: true },
      { label: "75%", why: "減った割合（6 ÷ 8）です。圧縮率は圧縮後 ÷ 圧縮前。", step: 2 },
      { label: "400%", why: "割る向きが逆です（8 ÷ 2）。", step: 2 },
    ],
    solution: "③ 2 ÷ 8 ＝ 0.25 ＝ 25%（元の4分の1の大きさ）",
  },
  {
    level: "Lv.5 本試験レベル",
    prompt: "史跡にスマートフォンを向けると、昔あった建物の画像や説明が現実の風景に重なって表示される。この仕組みは？",
    choices: [
      { label: "AR", ok: true },
      { label: "VR", why: "VRは視界をすべて仮想空間に置き換えます。ここでは現実の風景が見えています。", step: 1 },
      { label: "RGB", why: "RGBは画面の色の表し方です。", step: 1 },
      { label: "サムネイル", why: "サムネイルは画像を縮小して表示したものです。", step: 1 },
    ],
    solution: "② 現実の映像 ＋ 情報を重ねる ＝ AR",
  },
];

export function MediaPractice() {
  return (
    <LeveledPractice
      step={6}
      title="確認問題：5段階で本試験レベルへ"
      steps={MEDIA_STEPS}
      questions={MEDIA_QUESTIONS}
      testId="media-practice"
      done={
        <>
          🎉 ここまで解ければ、本試験のマルチメディアの問題に対応できます。<b>戻せるか → 用途で選ぶ → 元 × 圧縮率</b>。
        </>
      }
    />
  );
}
