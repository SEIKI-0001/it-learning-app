"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「成長戦略（コアコンピタンス・M&A・アライアンス・アウトソーシング）」専用の体験。
//   ① 社長シミュレータ：AI技術がない会社の社長になって手段を選ぶ
//      → 速さ/費用/自社の力メーター＋結末が変わり、トレードオフを体感
//   ② 「この手はどれ？」仕分けクイズ
// ============================================================================

type Way = {
  key: string;
  emo: string;
  name: string;
  tag: string;
  speed: 1 | 2 | 3; // 手に入る速さ
  cheap: 1 | 2 | 3; // 費用の安さ
  keep: 1 | 2 | 3; // 自社の力になる度
  story: string;
  point: string;
};

const WAYS: Way[] = [
  {
    key: "core",
    emo: "💪",
    name: "コアコンピタンス",
    tag: "自前で強みを磨く",
    speed: 1,
    cheap: 2,
    keep: 3,
    story: "自社でAI研究チームを育てて3年。時間はかかったが、他社にまねできない中核的な強みになった。",
    point: "遅いけれど、まねされない「自社ならではの強み」に育つ。",
  },
  {
    key: "alliance",
    emo: "🤝",
    name: "アライアンス",
    tag: "他社と提携・協力",
    speed: 2,
    cheap: 3,
    keep: 2,
    story: "AI企業と提携して共同開発。おたがい独立した会社のまま、強みを持ち寄って弱みを補い合えた。",
    point: "資本は別々のまま協力。ほどよく速く、費用も抑えられる。",
  },
  {
    key: "ma",
    emo: "🏢",
    name: "M&A",
    tag: "他社を買収・合併",
    speed: 3,
    cheap: 1,
    keep: 3,
    story: "AI企業をまるごと買収。技術も人材も顧客も一気に手に入ったが、費用は莫大。会社の統合にも苦労した。",
    point: "最速で丸ごと手に入るが、お金がかかる。会社が「一つになる」のが提携との違い。",
  },
  {
    key: "out",
    emo: "📤",
    name: "アウトソーシング",
    tag: "外部に外注",
    speed: 3,
    cheap: 2,
    keep: 1,
    story: "AI開発を外部の専門会社に外注。すぐ完成して自社は本業に集中できたが、ノウハウは自社に残らない。",
    point: "速くて楽。ただし技術は自社の力にならない。苦手分野を任せるのに向く。",
  },
];

const METERS: { label: string; get: (w: Way) => number }[] = [
  { label: "⏱️ 手に入る速さ", get: (w) => w.speed },
  { label: "💸 費用の安さ", get: (w) => w.cheap },
  { label: "💪 自社の力になる", get: (w) => w.keep },
];

function Meter({ label, val }: { label: string; val: number }) {
  const tone = val === 3 ? "bg-emerald-400" : val === 2 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 flex-none text-[11px] font-bold text-gray-600">{label}</span>
      <div className="flex flex-1 gap-1">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-3 flex-1 rounded-sm transition-all ${n <= val ? tone : "bg-gray-200"}`}
          />
        ))}
      </div>
    </div>
  );
}

function CeoSimulator() {
  const [picked, setPicked] = useState<string | null>(null);
  const [tried, setTried] = useState<Set<string>>(new Set());
  const active = WAYS.find((w) => w.key === picked) ?? null;
  const allTried = tried.size === WAYS.length;

  const pick = (key: string) => {
    setPicked(key);
    setTried((prev) => new Set(prev).add(key));
  };

  return (
    <Panel>
      <SectionTitle step={1}>社長になって、成長の手を選ぶ</SectionTitle>
      <div className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm leading-relaxed text-indigo-900 ring-1 ring-indigo-200">
        🧑‍💼 あなたはおもちゃ会社の社長。次のヒットには<b>AI技術</b>が必要。でも自社にはない！
        <b>どうやって手に入れる？</b>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {WAYS.map((w) => {
          const on = picked === w.key;
          const done = tried.has(w.key);
          return (
            <button
              key={w.key}
              onClick={() => pick(w.key)}
              className={`rounded-xl p-3 text-left ring-1 transition active:scale-[0.98] ${
                on ? "bg-indigo-600 text-white ring-indigo-600" : "bg-gray-50 ring-gray-200"
              }`}
            >
              <div className="text-lg">
                {w.emo}
                {done && !on && <span className="ml-1 text-xs">✓</span>}
              </div>
              <div className={`mt-0.5 text-[13px] font-extrabold ${on ? "text-white" : "text-gray-800"}`}>
                {w.name}
              </div>
              <div className={`mt-0.5 text-[10px] font-bold ${on ? "text-indigo-100" : "text-gray-400"}`}>
                {w.tag}
              </div>
            </button>
          );
        })}
      </div>

      {active ? (
        <div className="mt-3 space-y-2.5">
          <div className="rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
            <div className="text-sm font-extrabold text-gray-800">
              {active.emo} {active.name}を選んだ結果…
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-gray-600">{active.story}</p>
            <div className="mt-3 space-y-1.5">
              {METERS.map((m) => (
                <Meter key={m.label} label={m.label} val={m.get(active)} />
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-sky-50 px-4 py-2.5 text-xs leading-relaxed text-sky-900 ring-1 ring-sky-200">
            📌 {active.point}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-gray-400">↑ 4つの手をタップして、結果を見比べよう</p>
      )}

      {allTried && (
        <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900 ring-1 ring-emerald-200">
          🎉 全部試した！ どの手にも<b>一長一短（トレードオフ）</b>があり、唯一の正解はありません。
          だから試験では「それぞれの特徴」が問われます。
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ <b>M&A＝買収・合併（一つになる）</b>と<b>アライアンス＝提携（独立のまま協力）</b>の
        取り違えが定番のひっかけ。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: string; opts: string[]; why: string }[] = [
  {
    t: "ライバル企業を買収し、その技術と顧客を自社に取り込んで一気に拡大した。",
    ans: "M&A",
    opts: ["M&A", "アライアンス", "アウトソーシング"],
    why: "買収・合併で取り込む＝M&A。",
  },
  {
    t: "他社と資本関係を持たず、対等な立場でお互いの強みを持ち寄って共同開発した。",
    ans: "アライアンス",
    opts: ["アライアンス", "M&A", "コアコンピタンス"],
    why: "独立のまま提携・協力＝アライアンス。",
  },
  {
    t: "自社の苦手な経理業務を、専門の会社にまとめて任せた。",
    ans: "アウトソーシング",
    opts: ["アウトソーシング", "M&A", "コアコンピタンス"],
    why: "業務を外部に任せる＝アウトソーシング。",
  },
  {
    t: "他社にまねできない独自の精密加工技術を軸に勝負している。",
    ans: "コアコンピタンス",
    opts: ["コアコンピタンス", "アライアンス", "アウトソーシング"],
    why: "まねされない自社の中核の強み＝コアコンピタンス。",
  },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={2}>この手はどれ？</SectionTitle>
      <ul className="mt-3 space-y-3">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {q.opts.map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === q.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === q.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は「${q.ans}」。 `}
                  {q.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function CorporateStrategyExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🚀 会社が成長する手は<b>「自前で磨く（コアコンピタンス）／他社と組む（アライアンス）／買い取る（M&A）／外に出す（アウトソーシング）」</b>。
        どれも“どう力を得るか”の違いです。
      </div>

      <CeoSimulator />
      <Quiz />
    </div>
  );
}
