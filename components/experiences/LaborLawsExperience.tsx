"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「労働・取引関連法規（派遣と請負）」専用の体験。
//   ① 労働基準法＝働く人を守る基本ルール
//   ② 発注側の担当者になり、派遣/請負それぞれで作業者に「直接指示」を
//      出してみる → 派遣=OK / 請負=偽装請負🚨 と結果が変わる
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

type Mode = "派遣" | "請負";

function InstructionLab() {
  const [mode, setMode] = useState<Mode>("派遣");
  const [fired, setFired] = useState(false); // 今のモードで指示を出したか
  const [tried, setTried] = useState<Set<Mode>>(new Set());
  const dispatch = mode === "派遣";
  const bothTried = tried.has("派遣") && tried.has("請負");

  const switchMode = (m: Mode) => {
    setMode(m);
    setFired(false);
  };

  const fire = () => {
    setFired(true);
    setTried((p) => new Set(p).add(mode));
  };

  return (
    <Panel>
      <SectionTitle step={2}>作業者に「直接指示」を出してみる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたは<b className="text-gray-800">発注側🏢の担当者</b>。来てもらった作業者👷に
        <b className="text-gray-800">同じ「直接指示」</b>を出すと、契約の形でどう変わる？
        両方の契約で試してみよう。
      </p>

      {/* 契約の切替 */}
      <div className="mt-3 flex gap-1.5">
        {(["派遣", "請負"] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
              mode === m ? "bg-brand-600 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {m}契約 {tried.has(m) && "✓"}
          </button>
        ))}
      </div>

      {/* 関係図 */}
      <div className="mt-4 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <div className="flex items-stretch justify-between gap-1.5 text-center">
          <div className="flex-1 rounded-lg bg-white p-2 ring-2 ring-brand-300">
            <div className="text-2xl">🏢</div>
            <div className="mt-0.5 text-[11px] font-bold text-gray-800">
              発注側{dispatch ? "（派遣先）" : "（注文者）"}
            </div>
            <div className="text-[10px] font-bold text-brand-600">← あなた</div>
          </div>
          <div className="flex-1 rounded-lg bg-white p-2 ring-1 ring-gray-200">
            <div className="text-2xl">{dispatch ? "🧑‍💼" : "🏭"}</div>
            <div className="mt-0.5 text-[11px] font-bold text-gray-800">
              {dispatch ? "派遣会社" : "請負会社"}
            </div>
            <div className="text-[10px] text-gray-400">作業者の雇い主</div>
          </div>
          <div className="flex-1 rounded-lg bg-white p-2 ring-1 ring-gray-200">
            <div className="text-2xl">👷</div>
            <div className="mt-0.5 text-[11px] font-bold text-gray-800">作業者</div>
            <div className="text-[10px] text-gray-400">
              {dispatch ? "派遣会社の社員" : "請負会社の社員"}
            </div>
          </div>
        </div>

        {/* 契約の線 */}
        <div className="mt-2 space-y-1 text-center text-[11px] font-bold text-gray-500">
          <div className="rounded bg-white px-2 py-1 ring-1 ring-gray-200">
            🏢 ⇄ {dispatch ? "🧑‍💼" : "🏭"}：{mode}契約　／　{dispatch ? "🧑‍💼" : "🏭"} ⇄ 👷：雇用契約
          </div>
        </div>

        {/* 指示ボタン */}
        <button
          onClick={fire}
          className={`mt-3 w-full rounded-xl py-2.5 text-sm font-bold text-white transition active:scale-95 ${
            fired ? "bg-gray-300" : "bg-brand-600"
          }`}
        >
          📣 👷に直接指示を出す「その作業、先にやって！」
        </button>

        {/* 結果 */}
        {fired && (
          <div className="mt-3">
            {dispatch ? (
              <div className="rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-200">
                <div className="text-center text-sm font-bold text-emerald-800 animate-pulse">
                  🏢 ──📣──▶ 👷「わかりました！」
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-emerald-800">
                  ✅ <b>OK！</b>　派遣では<b>指揮命令の線が「派遣先（あなた）→ 作業者」</b>に引かれるので、
                  現場で直接指示を出すのが正しい形です。
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-rose-50 px-3 py-2.5 ring-1 ring-rose-200">
                <div className="text-center text-sm font-bold text-rose-700 animate-pulse">
                  🏢 ──📣──▶ 👷 …🚨 偽装請負！
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-rose-800">
                  ❌ <b>NG！</b>　請負では<b>指揮命令の線は「請負会社 → 作業者」</b>。
                  発注側が作業者に直接指示すると<b>偽装請負</b>という違法状態になります。
                </p>
                <div className="mt-2 rounded-lg bg-white px-2 py-1.5 text-center text-[11px] font-bold text-sky-700 ring-1 ring-sky-200">
                  正しくは：🏢 ──「お願い」──▶ 🏭 ──📣 指示──▶ 👷
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {bothTried && (
        <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-200">
          💡 <b>気づいた？</b>　まったく同じ「直接指示」でも、<b>派遣ならOK・請負ならNG（偽装請負）</b>。
          違いを決めるのは<b>契約の形＝指揮命令の線がどこに引かれるか</b>です。試験もここを聞いてきます。
        </div>
      )}

      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ※ <b>派遣</b>＝作業者は派遣会社の社員だが、指示は派遣先が出す。
        <b>請負</b>＝仕事の完成を約束する契約で、進め方は請負会社が決める。
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
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📜 働き方のルールでは、<b>派遣と請負の「誰が指示するか」</b>がよく問われます。
        <b>派遣＝派遣先が直接指示／請負＝発注側は直接指示できない</b>。
      </div>

      <Basics />
      <InstructionLab />
      <Quiz />
    </div>
  );
}
