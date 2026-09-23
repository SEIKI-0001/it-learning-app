"use client";

import { useState } from "react";
import { OfficeScene, type LaborMode, type Scenario } from "./labor/OfficeScene";
import { useInView } from "./scene/useInView";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「労働・取引関連法規（派遣と請負）」専用の体験。
//   ① 同じオフィスの 2.5D 模型で、派遣／請負の「指示の矢印」の通り道を見比べる。
//      請負では注文主が作業者へ直接指示してみる → 責任者を飛び越える赤い矢印＋指揮命令関係の警告
//   ② 指示してよい？ ○×クイズ（偽装請負に注意）
//   ③ 労働基準法＝働く人を守る基本ルール
// ============================================================================

function Basics() {
  return (
    <Panel>
      <SectionTitle step={3}>労働基準法＝働く人を守る基本ルール</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">労働基準法</b>は、労働時間・休日・賃金などの最低限のルールを定め、
        働く人を守る基本の法律です。
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { emo: "⏰", t: "労働時間" },
          { emo: "📅", t: "休日・休暇" },
          { emo: "💴", t: "賃金" },
        ].map((x) => (
          <div key={x.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="text-xl">{x.emo}</div>
            <div className="mt-1 text-xs font-bold text-gray-700">{x.t}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

type Tab = { mode: LaborMode; label: string };
const TABS: Tab[] = [
  { mode: "haken", label: "派遣" },
  { mode: "ukeoi", label: "請負" },
];

function InstructionOffice() {
  const reducedMotion = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>();
  const [mode, setMode] = useState<LaborMode>("haken");
  const [scenario, setScenario] = useState<Scenario>("haken");
  const [runKey, setRunKey] = useState(0);
  const [tried, setTried] = useState<Set<LaborMode>>(new Set(["haken"]));
  const haken = mode === "haken";
  const gisou = scenario === "gisou";

  const play = (next: Scenario) => {
    setScenario(next);
    setRunKey((k) => k + 1);
  };
  const choose = (m: LaborMode) => {
    setMode(m);
    setTried((p) => new Set(p).add(m));
    play(m);
  };

  return (
    <Panel>
      <SectionTitle step={1}>だれが、だれに指示を出す？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        同じオフィスで、<b className="text-gray-800">指示の矢印がどこを通るか</b>を見比べよう。
        <span className="text-[11px] text-gray-500">（シャツの色＝雇っている会社）</span>
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1" role="tablist" aria-label="契約の形">
        {TABS.map((t) => (
          <button
            key={t.mode}
            type="button"
            role="tab"
            aria-selected={mode === t.mode}
            onClick={() => choose(t.mode)}
            className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
              mode === t.mode ? "bg-brand-600 text-white" : "text-gray-500"
            }`}
          >
            {t.label} {tried.has(t.mode) && mode !== t.mode && "✓"}
          </button>
        ))}
      </div>

      <div ref={ref} className="mx-auto mt-3 max-w-[420px]">
        <OfficeScene key={`${scenario}-${runKey}`} mode={mode} scenario={scenario} reducedMotion={reducedMotion} active={inView} />
      </div>

      {/* 矢印の通り道（＝覚えること） */}
      <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-center text-xs font-bold ring-1 ring-gray-200" data-testid="route">
        {haken ? (
          <>
            <span className="text-indigo-700">派遣先</span> <span className="text-indigo-500">──指示──▶</span>{" "}
            <span className="text-amber-700">派遣社員</span>
            <span className="ml-1 font-medium text-gray-500">（直接）</span>
          </>
        ) : gisou ? (
          <>
            <span className="text-indigo-700">注文主</span> <span className="text-rose-600">──直接指示──▶</span>{" "}
            <span className="text-amber-700">社員</span>
            <span className="ml-1 font-medium text-rose-600">（責任者を飛び越え）</span>
            <div className="mt-0.5 text-[10.5px] font-medium text-gray-500">灰色の点線＝本来の経路（注文主 → 責任者 → 社員）</div>
          </>
        ) : (
          <>
            <span className="text-indigo-700">注文主</span> <span className="text-indigo-500">─依頼▶</span>{" "}
            <span className="text-amber-700">請負会社の責任者</span> <span className="text-amber-600">─指示▶</span>{" "}
            <span className="text-amber-700">社員</span>
          </>
        )}
      </div>

      {!haken && (
        <div className="mt-2 flex gap-1.5">
          {!gisou ? (
            <button
              type="button"
              onClick={() => play("gisou")}
              className="flex-1 rounded-xl bg-white py-2.5 text-sm font-bold text-rose-700 ring-2 ring-rose-300 transition active:scale-95"
            >
              ⚠ 注文主が、作業者へ直接指示する
            </button>
          ) : (
            <button
              type="button"
              onClick={() => play("ukeoi")}
              className="flex-1 rounded-xl bg-white py-2.5 text-sm font-bold text-gray-700 ring-1 ring-gray-300 transition active:scale-95"
            >
              ↺ 本来の流れに戻す
            </button>
          )}
        </div>
      )}

      {/* 読み取ってほしいこと（短く） */}
      <div className="mt-2" aria-live="polite">
        {haken ? (
          <p className="rounded-xl bg-indigo-50 px-3 py-2.5 text-xs leading-relaxed text-indigo-900 ring-1 ring-indigo-200">
            ✅ <b>派遣</b>では、<b>派遣先が派遣社員へ直接仕事の指示を出せます</b>。雇っているのは派遣元（シャツの色）でも、指示は派遣先から。
          </p>
        ) : gisou ? (
          <div className="rounded-xl bg-rose-50 px-3 py-2.5 ring-1 ring-rose-200" data-testid="gisou-warning">
            <div className="text-sm font-bold text-rose-700">⚠ 指揮命令関係が発生</div>
            <p className="mt-1 text-xs leading-relaxed text-rose-900">
              請負契約なのに注文主が労働者へ直接指示している場合、実態によっては<b>偽装請負</b>と判断される可能性があります。
            </p>
            <p className="mt-1 text-xs leading-relaxed text-rose-900">
              📝 <b>契約書の名称だけでなく、実際の働かせ方で判断されます。</b>
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
            📦 <b>請負</b>では、注文主は<b>会社へ「仕事の完成」を依頼</b>します。社員への具体的な指示は<b>請負会社の責任者</b>から。
            注文主 → 社員 の矢印はありません。
          </p>
        )}
      </div>

      {tried.has("haken") && tried.has("ukeoi") && (
        <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-200">
          💡 <b>派遣＝作業者へ直接指示</b>／<b>請負＝仕事の完成を会社へ依頼</b>。
          試験は「指示の矢印がどこを通るか」を聞いてきます。
        </div>
      )}
    </Panel>
  );
}

const QUIZ: { t: string; ans: "OK" | "NG"; why: string }[] = [
  {
    t: "【派遣】派遣先の社員が、来てもらった派遣スタッフに直接作業の指示を出した。",
    ans: "OK",
    why: "派遣では派遣先が作業者に直接指示できる。正しい。",
  },
  {
    t: "【請負】注文した会社が、請負会社の作業者に毎日直接こまかく指示を出した。",
    ans: "NG",
    why: "請負では作業者への指示は請負会社が行う。注文主が日々直接指示していると、実態によっては偽装請負と判断されるおそれがある。",
  },
  {
    t: "【請負】仕事のやり方や進め方は、請負会社が自分たちで決めて進めた。",
    ans: "OK",
    why: "請負では受注した会社が作業を指揮する。正しい。",
  },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={2}>その指示、OK？　NG？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex gap-1.5">
                {(["OK", "NG"] as const).map((opt) => {
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
                      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt === "OK" ? "⭕ 問題なし" : "❌ 問題あり"}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は「${q.ans === "OK" ? "問題なし" : "問題あり"}」。 `}
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

export default function LaborLawsExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📜 派遣と請負は、どちらも「よその会社の人に仕事をしてもらう」形。違いは<b>だれが作業者に指示を出すか</b>です。
        まずはオフィスの模型で、指示の矢印の通り道を見てみよう。
      </div>

      <InstructionOffice />
      <Quiz />
      <Basics />
    </div>
  );
}
