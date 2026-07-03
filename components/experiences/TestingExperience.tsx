"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「テスト」専用の体験。
//   ① テスト工程シミュレータ … 4段階をやる/やらない→リリース→すり抜けたバグの結末が変わる
//   ② V字モデル：設計工程と、対応するテストの組をタップでハイライト
//   ③ どの段階？ クイズ
// ============================================================================

const STAGES = [
  {
    id: "unit",
    name: "単体テスト",
    emoji: "🧩",
    food: "材料の味見",
    bug: "計算ボタンの部品が誤動作",
    catchNote: "部品の段階で発見、その場ですぐ修正",
    missNote: "電卓機能が壊れたまま世に出た",
  },
  {
    id: "integration",
    name: "結合テスト",
    emoji: "🔗",
    food: "合わせ味見",
    bug: "カートと決済のつなぎ目でエラー",
    catchNote: "部品をつないだ段階で発見",
    missNote: "「買えない！」と苦情が殺到",
  },
  {
    id: "system",
    name: "システムテスト",
    emoji: "🖥️",
    food: "完成品の試食",
    bug: "利用者が増えると全体が極端に遅い",
    catchNote: "全体を通しで動かして発見",
    missNote: "公開初日にアクセス集中でダウン",
  },
  {
    id: "accept",
    name: "受入テスト",
    emoji: "🙆",
    food: "注文者の確認",
    bug: "依頼者が求めた機能と違っていた",
    catchNote: "利用者目線の最終確認で発見",
    missNote: "「頼んだものと違う」と作り直しに",
  },
] as const;

function Simulator() {
  const [on, setOn] = useState<Record<string, boolean>>({
    unit: true,
    integration: true,
    system: true,
    accept: true,
  });
  const [released, setReleased] = useState(false);
  const [sawPerfect, setSawPerfect] = useState(false);
  const [sawMiss, setSawMiss] = useState(false);

  const missedCount = STAGES.filter((s) => !on[s.id]).length;
  const skippedAll = STAGES.every((s) => !on[s.id]);

  const toggle = (id: string) => {
    setOn((p) => ({ ...p, [id]: !p[id] }));
    setReleased(false);
  };
  const release = () => {
    setReleased(true);
    if (missedCount === 0) setSawPerfect(true);
    else setSawMiss(true);
  };

  return (
    <Panel>
      <SectionTitle step={1}>テスト工程シミュレータ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたは開発リーダー。作ったシステムには<b className="text-gray-800">4つのバグ</b>が潜んでいます（まだ誰も知らない）。
        どのテストを<b className="text-gray-800">やるか・省くか</b>決めてリリースしてみましょう。
      </p>

      <div className="mt-4 space-y-1.5">
        {STAGES.map((s, i) => {
          const active = on[s.id];
          return (
            <div key={s.id}>
              <div
                className={`flex items-center gap-2 rounded-xl px-3 py-2 ring-1 transition ${
                  active ? "bg-indigo-50 ring-indigo-200" : "bg-gray-50 ring-gray-200"
                }`}
              >
                <span className="text-lg">{s.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-extrabold ${active ? "text-gray-800" : "text-gray-400"}`}>
                    {s.name}
                  </div>
                  <div className="text-[10px] text-gray-400">🍳 {s.food}</div>
                </div>
                <button
                  onClick={() => toggle(s.id)}
                  className={`flex-none rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                    active ? "bg-indigo-600 text-white" : "bg-white text-gray-500 ring-1 ring-gray-300"
                  }`}
                >
                  {active ? "✓ やる" : "省く"}
                </button>
              </div>
              {released && (
                <div
                  className={`mx-2 mt-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
                    active ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {active ? (
                    <>✅ 「{s.bug}」をキャッチ！ {s.catchNote}。</>
                  ) : (
                    <>💥 「{s.bug}」がすり抜け → {s.missNote}。</>
                  )}
                </div>
              )}
              {i < STAGES.length - 1 && <div className="text-center text-[10px] leading-3 text-gray-300">▼</div>}
            </div>
          );
        })}
      </div>

      {!released ? (
        <button
          onClick={release}
          className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-extrabold text-white transition active:scale-95"
        >
          🚀 リリースする！
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <div
            className={`rounded-xl px-4 py-3 text-sm font-bold ring-1 ${
              missedCount === 0
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : "bg-rose-50 text-rose-800 ring-rose-200"
            }`}
          >
            {missedCount === 0 ? (
              <>🎉 4つのバグをぜんぶ世に出る前に発見！ 安心のリリースです。</>
            ) : skippedAll ? (
              <>🔥 ノーテストでリリース…4つのバグが全部本番で爆発。修正は開発中の何倍も高くつきます。</>
            ) : (
              <>⚠️ {missedCount}件のバグがリリース後に発覚。世に出てからの修正は、開発中に直すより何倍も高くつきます。</>
            )}
          </div>
          <button
            onClick={() => setReleased(false)}
            className="w-full rounded-xl py-2 text-sm font-bold text-gray-600 ring-1 ring-gray-300 transition active:scale-95"
          >
            ↺ 選び直してもう一度
          </button>
        </div>
      )}

      {sawPerfect && sawMiss && (
        <div className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm leading-relaxed text-indigo-900 ring-1 ring-indigo-200">
          💡 気づきましたか？ 段階ごとに<b>見つけられるバグが違う</b>んです。だから
          <b>単体→結合→システム→受入</b>と、小さい所から大きい所へ順にぜんぶ確認します。
        </div>
      )}
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
        <b>材料の味見→合わせ味見→完成品の試食→注文者の確認</b>。省くとどうなるか、まず体験してみましょう。
      </div>

      <Simulator />
      <VModel />
      <Quiz />
    </div>
  );
}
