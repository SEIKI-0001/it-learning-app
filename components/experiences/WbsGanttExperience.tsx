"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「WBSとガントチャート」専用の体験。
//   ① WBS = タップするたびに作業が細かく分解されていくツリー
//   ② ガントチャート = 「買い出しが2日遅れたら？」で棒が連鎖してずれる
//   ③ これはどっち？ 仕分けクイズ（分解 or 日程）
// ============================================================================

const WBS_MSGS = [
  "「文化祭の出し物」…大きすぎて、何から手をつければいいか分からない。タップして分解！",
  "3つに分かれた。でも「看板づくり」もまだ大きい。もう一度タップ！",
  "ここまで小さくなれば「誰が・何をやるか」を決められる。これで漏れなく洗い出せた！",
];

function Wbs() {
  const [level, setLevel] = useState(0);
  const next = () => setLevel((l) => Math.min(2, l + 1));
  return (
    <Panel>
      <SectionTitle step={1}>WBS ＝ 作業を分解する</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        大きな仕事を<b className="text-gray-800">小さな作業に分けて一覧</b>にしたもの。
        図をタップして、実際に分解してみよう。
      </p>

      {/* ツリー（タップで展開） */}
      <button onClick={next} className="mt-4 block w-full text-left" disabled={level >= 2}>
        <div
          className={`mx-auto w-fit rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-extrabold text-white transition ${
            level === 0 ? "animate-pulse" : ""
          }`}
        >
          文化祭の出し物 {level === 0 && "👆"}
        </div>
        {level >= 1 && (
          <>
            <div className="my-1 text-center text-gray-300">┃</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { t: "看板づくり", subs: ["デザイン", "色ぬり"] },
                { t: "買い出し", subs: ["材料リスト", "購入"] },
                { t: "当日係", subs: ["受付", "片づけ"] },
              ].map((c) => (
                <div key={c.t}>
                  <div
                    className={`rounded-lg bg-indigo-100 px-1 py-1.5 text-center text-[11px] font-bold text-indigo-700 transition ${
                      level === 1 ? "animate-pulse" : ""
                    }`}
                  >
                    {c.t} {level === 1 && "👆"}
                  </div>
                  {level >= 2 && (
                    <div className="mt-1 space-y-1">
                      {c.subs.map((s) => (
                        <div
                          key={s}
                          className="rounded-md bg-emerald-50 px-1 py-1 text-center text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200"
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </button>

      <div
        className={`mt-3 min-h-[3.5em] rounded-xl px-4 py-3 text-sm font-medium leading-relaxed ring-1 ${
          level >= 2
            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
            : "bg-gray-50 text-gray-600 ring-gray-200"
        }`}
      >
        {WBS_MSGS[level]}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-400">大→中→小へ分解（Work Breakdown Structure）</p>
        {level > 0 && (
          <button
            onClick={() => setLevel(0)}
            className="rounded-lg px-3 py-1.5 text-sm font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
            aria-label="最初から"
          >
            ↺
          </button>
        )}
      </div>
    </Panel>
  );
}

// start/len は日数（0始まり）。delay=買い出し遅delayで後ろへずれる作業。
const TASKS = [
  { t: "看板づくり", start: 0, len: 3, color: "bg-indigo-400", follows: false },
  { t: "買い出し", start: 2, len: 2, color: "bg-emerald-400", follows: true },
  { t: "リハーサル", start: 4, len: 2, color: "bg-amber-400", follows: true },
  { t: "本番準備", start: 5, len: 2, color: "bg-rose-400", follows: true },
];
const DAYS = 9;
const DEADLINE = 7; // 7日目の終わりが文化祭本番

function Gantt() {
  const [delayed, setDelayed] = useState(false);
  const shift = delayed ? 2 : 0;
  return (
    <Panel>
      <SectionTitle step={2}>ガントチャート ＝ いつやるか</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        WBSで洗い出した作業を<b className="text-gray-800">横棒</b>で見える化。
        棒の<b className="text-gray-800">位置＝時期</b>、<b className="text-gray-800">長さ＝期間</b>です。
      </p>

      {/* 遅れトグル */}
      <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setDelayed(false)}
          className={`rounded-lg px-2 py-2 text-sm font-bold transition active:scale-95 ${
            !delayed ? "bg-emerald-500 text-white" : "text-gray-500"
          }`}
        >
          📅 予定どおり
        </button>
        <button
          onClick={() => setDelayed(true)}
          className={`rounded-lg px-2 py-2 text-sm font-bold transition active:scale-95 ${
            delayed ? "bg-rose-500 text-white" : "text-gray-500"
          }`}
        >
          ⚡ 買い出しが2日遅れたら？
        </button>
      </div>

      {/* 日付ヘッダ */}
      <div className="mt-3 flex items-center gap-1">
        <div className="w-16 flex-none" />
        <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${DAYS}, 1fr)` }}>
          {Array.from({ length: DAYS }, (_, i) => (
            <div key={i} className={`text-center text-[10px] ${i + 1 === DEADLINE ? "font-extrabold text-rose-500" : "text-gray-400"}`}>
              {i + 1 === DEADLINE ? "🎪" : `${i + 1}`}
            </div>
          ))}
        </div>
      </div>
      {/* 行（本番の縦線つき） */}
      <div className="relative mt-1 space-y-1.5">
        <div
          className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-dashed border-rose-400"
          style={{ left: `calc(4rem + 0.25rem + (100% - 4rem - 0.25rem) * ${DEADLINE / DAYS})` }}
        />
        {TASKS.map((t) => {
          const start = t.follows ? t.start + shift : t.start;
          const late = start + t.len > DEADLINE;
          return (
            <div key={t.t} className="flex items-center gap-1">
              <div className="w-16 flex-none truncate text-[11px] font-bold text-gray-600">{t.t}</div>
              <div className="relative grid flex-1" style={{ gridTemplateColumns: `repeat(${DAYS}, 1fr)` }}>
                {Array.from({ length: DAYS }, (_, i) => (
                  <div key={i} className="h-5 border-r border-gray-100" />
                ))}
                <div
                  className={`absolute top-0.5 h-4 rounded transition-all duration-500 ${t.color} ${
                    late ? "ring-2 ring-rose-500" : ""
                  }`}
                  style={{ left: `${(start / DAYS) * 100}%`, width: `${(t.len / DAYS) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-right text-[10px] text-gray-400">🎪＝7日目の文化祭本番</p>

      <div
        className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium leading-relaxed ring-1 ${
          delayed
            ? "bg-rose-50 text-rose-800 ring-rose-200"
            : "bg-emerald-50 text-emerald-800 ring-emerald-200"
        }`}
      >
        {delayed ? (
          <>
            ❌ 材料がないとリハーサルも本番準備もできない…。<b>買い出しの遅れが後ろの作業に連鎖</b>して、
            本番🎪に間に合わない！ この「連鎖」が一目で見えるのがガントチャートの強み。
          </>
        ) : (
          <>✅ すべての棒が🎪より左＝全作業が本番に間に合う予定。</>
        )}
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ans: "WBS" | "ガント"; why: string }[] = [
  { t: "やる作業を漏れなく細かく分けて一覧にする", ans: "WBS", why: "作業の分解＝WBS。" },
  { t: "各作業の開始日・終了日を横棒で表す", ans: "ガント", why: "日程の見える化＝ガントチャート。" },
  { t: "「何をやるか」を洗い出す", ans: "WBS", why: "やること（作業）の整理＝WBS。" },
  { t: "「いつやるか」をカレンダー上に表す", ans: "ガント", why: "時期の管理＝ガントチャート。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, "WBS" | "ガント">>({});
  return (
    <Panel>
      <SectionTitle step={3}>これはどっち？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">WBS＝作業の分解</b>、<b className="text-gray-800">ガント＝日程</b>。混同しやすいので練習しよう。
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {(["WBS", "ガント"] as const).map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === it.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === it.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は ${it.ans}。 `}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function WbsGanttExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🗂️ <b>WBS＝作業を分解した一覧（何をやる）</b>、<b>ガントチャート＝横棒のスケジュール（いつやる）</b>。
        セットでプロジェクトの計画と進捗管理に使います。
      </div>

      <Wbs />
      <Gantt />
      <Quiz />
    </div>
  );
}
