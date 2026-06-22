"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「労働・取引関連法規（派遣と請負）」専用の体験。
//   ① 労働基準法＝働く人を守る基本ルール
//   ② 派遣 ⇄ 請負 を切替し「誰が作業者に指示するか」を矢印で可視化
//   ③ 指示してよい？ ○×クイズ（偽装請負に注意）
// ============================================================================

function Basics() {
  return (
    <Panel>
      <SectionTitle step={1}>労働基準法＝働く人を守る基本ルール</SectionTitle>
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

function DispatchVsContract() {
  const [mode, setMode] = useState<"派遣" | "請負">("派遣");
  const dispatch = mode === "派遣";
  return (
    <Panel>
      <SectionTitle step={2}>派遣と請負 ― 誰が指示する？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        人手を頼む方法には<b className="text-gray-800">派遣</b>と<b className="text-gray-800">請負</b>があり、
        <b className="text-gray-800">「作業者に直接指示できるのは誰か」</b>が大きく違います。切り替えてみましょう。
      </p>

      <div className="mt-3 flex gap-1.5">
        {(["派遣", "請負"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
              mode === m ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* 関係図 */}
      <div className="mt-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
        <div className="flex items-stretch justify-between gap-2 text-center">
          <div className="flex-1 rounded-lg bg-white p-3 ring-1 ring-gray-200">
            <div className="text-2xl">🏢</div>
            <div className="mt-1 text-xs font-extrabold text-gray-800">
              発注側{dispatch ? "（派遣先）" : "（注文者）"}
            </div>
          </div>
          <div className="flex-1 rounded-lg bg-white p-3 ring-1 ring-gray-200">
            <div className="text-2xl">{dispatch ? "🧑‍💼" : "🏭"}</div>
            <div className="mt-1 text-xs font-extrabold text-gray-800">
              {dispatch ? "派遣会社" : "請負会社"}
            </div>
          </div>
          <div className="flex-1 rounded-lg bg-white p-3 ring-1 ring-gray-200">
            <div className="text-2xl">👷</div>
            <div className="mt-1 text-xs font-extrabold text-gray-800">作業者</div>
          </div>
        </div>

        {/* 指揮命令の矢印 */}
        <div className="mt-3 rounded-lg bg-white px-3 py-2.5 text-center text-sm font-bold ring-1 ring-gray-200">
          {dispatch ? (
            <span className="text-emerald-700">
              🏢 発注側（派遣先） ──▶ 👷 作業者に<b>直接指示できる</b>
            </span>
          ) : (
            <span className="text-sky-700">
              🏭 請負会社 ──▶ 👷 作業者に指示。<b>発注側は作業者へ直接指示できない</b>
            </span>
          )}
        </div>
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 ${
          dispatch
            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
            : "bg-sky-50 text-sky-800 ring-sky-200"
        }`}
      >
        {dispatch ? (
          <>
            <b>派遣</b>：作業者は派遣会社の社員だが、働く現場では
            <b>派遣先が直接指示</b>を出す。
          </>
        ) : (
          <>
            <b>請負</b>：仕事の完成を約束する契約。作業の進め方は
            <b>請負会社が決め</b>、発注側は作業者に直接指示できない。
          </>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ※ 請負なのに発注側が作業者へ直接指示すると<b>偽装請負</b>となり問題になります。
      </p>
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
    why: "請負で発注側が作業者へ直接指示するのは偽装請負。指示は請負会社が行う。",
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
      <SectionTitle step={3}>その指示、OK？　NG？</SectionTitle>
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
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📜 働き方のルールでは、<b>派遣と請負の「誰が指示するか」</b>がよく問われます。
        <b>派遣＝派遣先が直接指示／請負＝発注側は直接指示できない</b>。
      </div>

      <Basics />
      <DispatchVsContract />
      <Quiz />
    </div>
  );
}
