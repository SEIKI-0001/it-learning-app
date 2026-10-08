"use client";

import { useState } from "react";
import { VModel } from "./diagram/VModel";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「テスト」専用の体験。
//   ① テストの対象が広がる … 同じネットショップの図で、単体（部品1つ）→ 結合（部品のつながり）
//      → システム（全体）→ 受入（実際の利用・業務）と、確かめる範囲が段階的に広がる（静的）
//   ② V字モデル：設計工程と、それを確かめるテストの対応（静的。diagram/VModel）
//   ③ どの段階？ クイズ
// 旧「テスト工程シミュレータ」（やる/省くを選んでリリース）は、操作しないと要点が見えなかったため廃止。
// ============================================================================

type Scope = "unit" | "integration" | "system" | "accept";

const LEVELS: { id: Scope; name: string; sub?: string; target: string; check: string; food: string }[] = [
  { id: "unit", name: "単体テスト", target: "部品1つ", check: "部品（プログラム）単体が、仕様どおりに動くか", food: "材料の味見" },
  { id: "integration", name: "結合テスト", target: "部品どうしのつながり", check: "部品をつないだとき、データを正しく受け渡せるか", food: "合わせ味見" },
  { id: "system", name: "システムテスト", target: "システム全体", check: "全体が、性能もふくめて設計どおりに動くか", food: "完成品の試食" },
  { id: "accept", name: "受入テスト", sub: "運用テスト", target: "実際の利用・業務", check: "利用者の要求を満たし、実際の業務で使えるか", food: "注文した人の確認" },
];

const PARTS = [
  { x: 14, label: "商品一覧" },
  { x: 74, label: "カート" },
  { x: 134, label: "決済" },
];

// 同じネットショップの図。scope に応じて、強調する範囲が広がる
function ScopeIllust({ scope }: { scope: Scope }) {
  const on = (i: number) =>
    scope === "unit" ? i === 1 : scope === "integration" ? i === 1 || i === 2 : true;
  const linkOn = (i: number) => (scope === "integration" ? i === 1 : scope !== "unit");
  const frameOn = scope === "system" || scope === "accept";
  const userOn = scope === "accept";
  return (
    <svg viewBox="0 0 250 92" className="block h-auto w-full" aria-hidden>
      {/* システムの枠 */}
      <rect x="4" y="8" width="192" height="76" rx="10" fill={frameOn ? "#eff7ff" : "#ffffff"} stroke={frameOn ? "#0868c9" : "#d1d5db"} strokeWidth={frameOn ? 2 : 1.2} strokeDasharray={frameOn ? undefined : "4 4"} />
      <text x="12" y="22" fontSize="10" fontWeight="700" fill={frameOn ? "#0756a8" : "#9ca3af"}>
        ネットショップ
      </text>
      {/* 部品どうしのつながり */}
      {[0, 1].map((i) => (
        <line key={i} x1={PARTS[i].x + 52} y1="54" x2={PARTS[i + 1].x} y2="54" stroke={linkOn(i) ? "#0868c9" : "#d1d5db"} strokeWidth={linkOn(i) ? 3 : 1.5} />
      ))}
      {PARTS.map((p, i) => (
        <g key={p.label}>
          <rect x={p.x} y="36" width="52" height="36" rx="6" fill={on(i) ? "#0868c9" : "#ffffff"} stroke={on(i) ? "#0868c9" : "#9ca3af"} strokeWidth="1.5" />
          <text x={p.x + 26} y="58" textAnchor="middle" fontSize="11" fontWeight="700" fill={on(i) ? "#ffffff" : "#6b7280"}>
            {p.label}
          </text>
        </g>
      ))}
      {/* 実際に使う人 */}
      <g opacity={userOn ? 1 : 0.35}>
        <line x1="198" y1="54" x2="212" y2="54" stroke={userOn ? "#0868c9" : "#d1d5db"} strokeWidth={userOn ? 3 : 1.5} />
        <circle cx="230" cy="36" r="9" fill={userOn ? "#111827" : "#d1d5db"} />
        <path d="M214 74 Q230 44 246 74 Z" fill={userOn ? "#111827" : "#d1d5db"} />
        <text x="230" y="88" textAnchor="middle" fontSize="10" fontWeight="700" fill={userOn ? "#111827" : "#9ca3af"}>
          利用者
        </text>
      </g>
    </svg>
  );
}

function ScopePanel() {
  return (
    <Panel>
      <SectionTitle step={1}>テストで「見る範囲」は、だんだん広がる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        同じネットショップを4回テストします。青い部分が、その段階で確かめる対象です。
        <b className="text-gray-800">部品 → 部品のつながり → システム全体 → 実際の利用</b>と広がります。
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="test-scope">
        {LEVELS.map((l, i) => (
          <li key={l.id} className="rounded-xl p-3 ring-1 ring-gray-300" data-testid={`test-scope-${l.id}`}>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs font-bold text-gray-500">{i + 1}</span>
              <span className="text-base font-bold text-gray-900">{l.name}</span>
              {l.sub && <span className="text-xs text-gray-600">（{l.sub}）</span>}
            </div>
            <p className="mt-0.5 text-[15px] font-bold text-brand-800">見る対象：{l.target}</p>
            <div className="mt-2">
              <ScopeIllust scope={l.id} />
            </div>
            <p className="mt-1.5 text-sm leading-snug text-gray-800">{l.check}</p>
            <p className="mt-0.5 text-xs text-gray-500">料理なら：{l.food}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        範囲が広い段階で見つかった不具合ほど、原因をさかのぼって直す範囲が大きくなります。だから<b className="text-gray-900">小さい範囲から順に</b>確かめます。
      </p>
    </Panel>
  );
}

const PAIRS: { design: string; test: string; note: string }[] = [
  { design: "要件定義", test: "受入テスト", note: "利用者が求めたものになっているか" },
  { design: "外部設計（基本設計）", test: "システムテスト", note: "全体が設計どおり動くか" },
  { design: "内部設計（詳細設計）", test: "結合テスト", note: "部品のつなぎ目が設計どおりか" },
  { design: "プログラミング", test: "単体テスト", note: "部品単体が正しく動くか" },
];

function VModelPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>V字モデル（設計とテストの対応）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">作る工程（左の辺を下る）</b>と<b className="text-gray-800">確かめるテスト（右の辺を上る）</b>は、同じ高さどうしが対になっています。
      </p>
      <div className="mx-auto mt-3 max-w-md">
        <VModel
          highlight={[0, 1, 2, 3]}
          side="test"
          label="V字モデル。要件定義は受入テスト、外部設計はシステムテスト、内部設計は結合テスト、プログラミングは単体テストで確かめる。"
        />
      </div>
      <ul className="mt-3 divide-y divide-gray-200 border-y border-gray-200 text-sm" data-testid="v-pairs">
        {PAIRS.map((p) => (
          <li key={p.test} className="py-2">
            <div className="font-bold text-gray-900">
              {p.design} <span className="text-gray-500">→</span> {p.test}
            </div>
            <div className="text-xs text-gray-600">{p.note}</div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-gray-600">
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
                  {correct ? "正解！ " : `正解は ${it.ans}。 `}
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
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        テストは<b>単体→結合→システム→受入</b>と段階を踏みます。料理でいうと
        <b>材料の味見→合わせ味見→完成品の試食→注文者の確認</b>。段階ごとに<b>見る範囲</b>が広がっていきます。
      </div>

      <ScopePanel />
      <VModelPanel />
      <Quiz />
    </div>
  );
}
