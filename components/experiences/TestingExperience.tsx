"use client";

import { useState } from "react";
import { useReducedMotion } from "./scene/useReducedMotion";
import { BugLegend, BugPipeline, PROD_COST, arrivalMs, type Stage } from "./testing/BugPipeline";
import styles from "./testing/testing.module.css";
import { VDiagram, type Pair } from "./testing/VDiagram";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「テスト」専用の体験。
//   ① テスト工程シミュレータ … 4段階をやる/省くを決めてリリースすると、種類の違う4匹のバグが
//      上から落ちてくる。対応する関所がやる設定なら捕まり、省いていれば本番まで落ちて💥。
//      下の行で捕まるほど直す範囲・修正コストが大きい（testing/BugPipeline）
//   ② V字モデル：設計工程を選ぶと、同じ高さの対応するテストへ線が伸びる（testing/VDiagram）
//   ③ どの段階？ クイズ
// ============================================================================

const STAGES: readonly Stage[] = [
  {
    id: "unit",
    name: "単体テスト",
    emoji: "🧩",
    food: "材料の味見",
    bug: "計算ボタンの部品が誤動作",
    bugIcon: "🧩",
    bugKind: "部品の中のバグ",
    scope: "部品1つ",
    cost: 1,
    catchNote: "部品の段階で発見、その場ですぐ修正",
    missNote: "電卓機能が壊れたまま世に出た",
  },
  {
    id: "integration",
    name: "結合テスト",
    emoji: "🔗",
    food: "合わせ味見",
    bug: "カートと決済のつなぎ目でエラー",
    bugIcon: "🔗",
    bugKind: "部品のつなぎ目のバグ",
    scope: "つなぎ目",
    cost: 3,
    catchNote: "部品をつないだ段階で発見",
    missNote: "「買えない！」と苦情が殺到",
  },
  {
    id: "system",
    name: "システムテスト",
    emoji: "🖥️",
    food: "完成品の試食",
    bug: "利用者が増えると全体が極端に遅い",
    bugIcon: "🖥️",
    bugKind: "システム全体のバグ",
    scope: "システム全体",
    cost: 10,
    catchNote: "全体を通しで動かして発見",
    missNote: "公開初日にアクセス集中でダウン",
  },
  {
    id: "accept",
    name: "受入テスト",
    emoji: "🙆",
    food: "注文者の確認",
    bug: "依頼者が求めた機能と違っていた",
    bugIcon: "📋",
    bugKind: "要件とのズレ",
    scope: "要件から",
    cost: 30,
    catchNote: "利用者目線の最終確認で発見",
    missNote: "「頼んだものと違う」と作り直しに",
  },
];

function Simulator() {
  const reducedMotion = useReducedMotion();
  const [on, setOn] = useState<Record<string, boolean>>({
    unit: true,
    integration: true,
    system: true,
    accept: true,
  });
  const [released, setReleased] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [sawPerfect, setSawPerfect] = useState(false);
  const [sawMiss, setSawMiss] = useState(false);

  const missedCount = STAGES.filter((s) => !on[s.id]).length;
  const skippedAll = STAGES.every((s) => !on[s.id]);
  const totalCost = STAGES.reduce((sum, s) => sum + (on[s.id] ? s.cost : PROD_COST), 0);
  const bestCost = STAGES.reduce((sum, s) => sum + s.cost, 0);
  const worstCost = STAGES.length * PROD_COST;
  // 結果の文章は、最後のバグが着地してから出す
  const settleMs = reducedMotion ? 0 : Math.max(...STAGES.map((s, i) => arrivalMs(i, on[s.id], STAGES.length))) + 150;
  const fade = reducedMotion ? undefined : { animationDelay: `${settleMs}ms` };
  const fadeClass = reducedMotion ? "" : styles.fadeIn;

  const toggle = (id: string) => {
    setOn((p) => ({ ...p, [id]: !p[id] }));
    setReleased(false);
  };
  const release = () => {
    setReleased(true);
    setRunKey((k) => k + 1);
    if (missedCount === 0) setSawPerfect(true);
    else setSawMiss(true);
  };

  return (
    <Panel>
      <SectionTitle step={1}>テスト工程シミュレータ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたは開発リーダー。作ったシステムには<b className="text-gray-800">種類の違う4匹のバグ</b>が潜んでいます。
        どのテストを<b className="text-gray-800">やるか・省くか</b>決めてリリースすると、バグが上から落ちてきます。
      </p>

      <BugPipeline stages={STAGES} on={on} released={released} runKey={runKey} reducedMotion={reducedMotion} onToggle={toggle} />
      <BugLegend stages={STAGES} />

      {!released ? (
        <button
          onClick={release}
          className="mt-3 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition active:scale-95"
        >
          🚀 リリースする！
        </button>
      ) : (
        <div key={runKey} className={`mt-3 space-y-2 ${fadeClass}`} style={fade} data-testid="test-result">
          <ul className="space-y-1">
            {STAGES.map((s) => (
              <li key={s.id} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${on[s.id] ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
                {on[s.id] ? (
                  <>✅ {s.name}で「{s.bug}」をキャッチ（×{s.cost}）。{s.catchNote}。</>
                ) : (
                  <>💥 「{s.bug}」がすり抜け（×{PROD_COST}）→ {s.missNote}。</>
                )}
              </li>
            ))}
          </ul>
          <div className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200" data-testid="test-cost">
            <div className="flex items-baseline justify-between text-xs font-bold text-gray-700">
              <span>修正コストの合計</span>
              <span className={`font-mono text-sm ${missedCount ? "text-rose-700" : "text-emerald-700"}`}>×{totalCost}</span>
            </div>
            <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full ${missedCount ? "bg-rose-500" : "bg-emerald-500"}`}
                style={{ width: `${(totalCost / worstCost) * 100}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-gray-500">全部テストした場合 ×{bestCost} ／ 全部省いた場合 ×{worstCost}</div>
          </div>
          <div
            className={`rounded-xl px-4 py-3 text-sm font-bold ring-1 ${
              missedCount === 0 ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-rose-200"
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
        <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-200">
          💡 気づきましたか？ 段階ごとに<b>見つけられるバグが違う</b>んです（どの関所も自分の列しか網を張っていない）。だから
          <b>単体→結合→システム→受入</b>と、小さい所から大きい所へ順にぜんぶ確認します。
        </div>
      )}
    </Panel>
  );
}

// V字: 左(設計)と右(テスト)の対応ペア。
const PAIRS: Pair[] = [
  { id: 0, left: "要件定義", right: "受入テスト", note: "「求めたものか」を確かめる", bug: "📋 要件とのズレ" },
  { id: 1, left: "基本設計", right: "システムテスト", note: "全体が設計どおり動くか", bug: "🖥️ システム全体のバグ" },
  { id: 2, left: "詳細設計", right: "結合テスト", note: "部品のつなぎ目が設計どおりか", bug: "🔗 つなぎ目のバグ" },
  { id: 3, left: "製造（部品）", right: "単体テスト", note: "部品単体が正しく動くか", bug: "🧩 部品の中のバグ" },
];

function VModel() {
  const reducedMotion = useReducedMotion();
  const [sel, setSel] = useState<number | null>(null);
  return (
    <Panel>
      <SectionTitle step={2}>V字モデル（設計とテストの対応）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">作る工程（左の辺を下る）</b>と<b className="text-gray-800">確かめるテスト（右の辺を上る）</b>は、同じ高さどうしが対になっています。
        どちらかをタップすると、相手へ線が伸びます。
      </p>

      <VDiagram pairs={PAIRS} sel={sel} onSelect={(i) => setSel(i === sel ? null : i)} reducedMotion={reducedMotion} />

      <div className="mt-3 min-h-[3em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200" aria-live="polite">
        {sel !== null ? (
          <>
            <b className="text-gray-900">{PAIRS[sel].left}</b> で決めたことを{" "}
            <b className="text-gray-900">{PAIRS[sel].right}</b> で確認 ── {PAIRS[sel].note}。
            <span className="mt-1 block text-xs text-gray-500">① で捕まえたバグ：{PAIRS[sel].bug}</span>
          </>
        ) : (
          <span className="text-gray-400">左右どちらかをタップすると、対応するペアが分かります。</span>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ <b>ホワイトボックステスト</b>＝プログラム内部の分岐・経路を見て確かめる（主に単体テスト）。
        <b>ブラックボックステスト</b>＝入力と出力だけで確かめる。
        <b>回帰（リグレッション）テスト</b>＝修正のあと、前は動いていた所が壊れていないか確かめる。
      </p>
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
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ✅ テストは<b>単体→結合→システム→受入</b>と段階を踏みます。料理でいうと
        <b>材料の味見→合わせ味見→完成品の試食→注文者の確認</b>。省くとどうなるか、まず体験してみましょう。
      </div>

      <Simulator />
      <VModel />
      <Quiz />
    </div>
  );
}
