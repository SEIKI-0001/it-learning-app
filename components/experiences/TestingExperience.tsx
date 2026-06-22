"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「テスト」専用の体験。
//   ① テストの4段階（単体→結合→システム→受入）と目的
//   ② V字モデル：設計工程と、対応するテストの組をタップでハイライト
//   ③ どの段階？ クイズ
// ============================================================================

const STAGES = [
  { t: "単体テスト", emoji: "🧩", d: "部品ひとつを単体で確認", food: "材料の味見" },
  { t: "結合テスト", emoji: "🔗", d: "部品どうしのつながりを確認", food: "具材を合わせた味見" },
  { t: "システムテスト", emoji: "🖥️", d: "全体がまとまって動くか確認", food: "完成品の試食" },
  { t: "受入テスト", emoji: "🙆", d: "利用者の目線で要求を満たすか確認", food: "注文者の確認" },
];

function Stages() {
  return (
    <Panel>
      <SectionTitle step={1}>テストは段階を踏む</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        作ったものを<b className="text-gray-800">小さい所から大きい所へ</b>、順に確認します。
      </p>
      <div className="mt-4 space-y-1.5">
        {STAGES.map((s, i) => (
          <div key={s.t} className="flex items-center gap-2">
            <span className="w-5 flex-none text-center text-xs font-bold text-gray-400">{i + 1}</span>
            <div className="flex flex-1 items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
              <span className="text-lg">{s.emoji}</span>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-gray-800">{s.t}</div>
                <div className="text-[11px] text-gray-500">{s.d}</div>
              </div>
              <span className="ml-auto flex-none rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-500 ring-1 ring-gray-200">
                🍳 {s.food}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-gray-400">小さい部品 → つながり → 全体 → 利用者目線</p>
    </Panel>
  );
}

// V字: 左(設計)と右(テスト)の対応ペア。
const PAIRS = [
  { id: 0, left: "要件定義", right: "受入テスト", note: "「求めたものか」を確かめる" },
  { id: 1, left: "基本設計", right: "システムテスト", note: "全体が設計どおり動くか" },
  { id: 2, left: "詳細設計", right: "結合テスト", note: "部品のつなぎ目が設計どおりか" },
  { id: 3, left: "製造（部品）", right: "単体テスト", note: "部品単体が正しく動くか" },
];

function VModel() {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <Panel>
      <SectionTitle step={2}>V字モデル（設計とテストの対応）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">作る工程（左）</b>と<b className="text-gray-800">確かめるテスト（右）</b>は対になっています。
        行をタップすると、対応する相手が光ります。
      </p>

      <div className="mt-4 flex items-stretch gap-2">
        {/* 左：設計 */}
        <div className="flex-1 space-y-1.5">
          <div className="text-center text-[10px] font-bold text-gray-400">作る ↓</div>
          {PAIRS.map((p) => (
            <button
              key={`l${p.id}`}
              onClick={() => setSel(p.id === sel ? null : p.id)}
              className={`w-full rounded-lg px-1 py-2 text-[11px] font-bold transition active:scale-95 ${
                sel === p.id ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
              }`}
            >
              {p.left}
            </button>
          ))}
        </div>
        {/* 中央：対応線 */}
        <div className="flex w-5 flex-none flex-col items-center justify-around pt-4">
          {PAIRS.map((p) => (
            <span key={`m${p.id}`} className={`text-sm ${sel === p.id ? "text-indigo-600" : "text-gray-300"}`}>
              ⇄
            </span>
          ))}
        </div>
        {/* 右：テスト */}
        <div className="flex-1 space-y-1.5">
          <div className="text-center text-[10px] font-bold text-gray-400">確かめる ↑</div>
          {PAIRS.map((p) => (
            <button
              key={`r${p.id}`}
              onClick={() => setSel(p.id === sel ? null : p.id)}
              className={`w-full rounded-lg px-1 py-2 text-[11px] font-bold transition active:scale-95 ${
                sel === p.id ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              }`}
            >
              {p.right}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 min-h-[3em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200">
        {sel !== null ? (
          <>
            <b className="text-gray-900">{PAIRS[sel].left}</b> で決めたことを{" "}
            <b className="text-gray-900">{PAIRS[sel].right}</b> で確認 ── {PAIRS[sel].note}。
          </>
        ) : (
          <span className="text-gray-400">左右どちらかの行をタップすると、対応するペアが分かります。</span>
        )}
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ans: string; why: string }[] = [
  { t: "ボタンの部品ひとつが正しく動くか確認", ans: "単体テスト", why: "部品単体＝単体テスト。" },
  { t: "部品どうしをつないで連携を確認", ans: "結合テスト", why: "つなぎ目＝結合テスト。" },
  { t: "利用者が「求めたものか」を確認", ans: "受入テスト", why: "利用者目線＝受入テスト。" },
];
const OPTS = ["単体テスト", "結合テスト", "受入テスト"];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>これはどの段階？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {OPTS.map((opt) => {
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
                      className={`flex-1 rounded-lg px-1 py-1.5 text-[11px] font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt.replace("テスト", "")}
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

export default function TestingExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ✅ テストは<b>単体→結合→システム→受入</b>と段階を踏みます。料理でいうと
        <b>材料の味見→合わせ味見→完成品の試食→注文者の確認</b>。作る工程と確認は対になっています。
      </div>

      <Stages />
      <VModel />
      <Quiz />
    </div>
  );
}
