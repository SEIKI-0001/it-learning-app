"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「システム監査と内部統制」専用の体験。
//   ① システム監査 = 第三者の目で客観的に確認（独立性）
//   ② 内部統制 = 仕組みをON/OFFして、不正な申請が防げるか実験する
//   ③ 監査人としてOK?NG? 仕分けクイズ（独立性・役割の理解）
// ============================================================================

function WhatIsAudit() {
  const [self, setSelf] = useState(false);
  return (
    <Panel>
      <SectionTitle step={1}>監査は「第三者の目」で見る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        システム監査は、システムが<b className="text-gray-800">ルール通り安全・有効に使われているか</b>を、
        利害のない立場の人が<b className="text-gray-800">客観的に確認</b>する活動です。
      </p>

      <div className="mt-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">だれが採点する？</span>
          <button
            onClick={() => setSelf((s) => !s)}
            className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-bold text-white active:scale-95"
          >
            切り替え
          </button>
        </div>
        <div className="mt-3 text-center">
          {self ? (
            <div>
              <div className="text-3xl">🙋‍♂️📝</div>
              <div className="mt-1 text-sm font-bold text-rose-600">自分で自分を採点</div>
              <p className="mt-1 text-xs text-gray-500">甘くなりがち。見落としや隠ぺいも起きうる…</p>
            </div>
          ) : (
            <div>
              <div className="text-3xl">🧑‍⚖️🔍</div>
              <div className="mt-1 text-sm font-bold text-emerald-600">独立した第三者が確認</div>
              <p className="mt-1 text-xs text-gray-500">利害がないから客観的。これが監査の姿。</p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 監査でいちばん大切なのが<b>独立性</b>。対象から離れた立場でないと、客観的に判断できません。
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 内部統制ラボ: 仕組みをON/OFFすると、不正な経費申請の結末が変わる
// ---------------------------------------------------------------------------
const CONTROLS = [
  { id: "sep", emoji: "🔑", t: "権限の分離", d: "申請する人と承認する人を分ける" },
  { id: "dbl", emoji: "✌️", t: "ダブルチェック", d: "別の人がもう一度確認する" },
  { id: "log", emoji: "🧾", t: "監査証跡", d: "誰がいつ何をしたか記録を残す" },
] as const;

type ControlId = (typeof CONTROLS)[number]["id"];

function ControlLab() {
  const [on, setOn] = useState<Record<ControlId, boolean>>({ sep: false, dbl: false, log: false });

  // 不正シナリオ: 社員が架空の経費10万円を申請し、自分で承認しようとする
  const blocked = on.sep || on.dbl; // 承認段階で止まる
  const detected = !blocked && on.log; // 通ってしまうが、記録から発覚する

  const steps = [
    { label: "申請", emoji: "🙋‍♂️", note: "社員が架空の経費 10万円 を申請", state: "pass" as const },
    {
      label: "承認",
      emoji: blocked ? "🛑" : "👌",
      note: blocked
        ? on.sep
          ? "自分では承認できない！ 別の承認者がチェックして却下"
          : "2人目の確認で「おかしい」と気づき却下"
        : "自分で自分の申請を承認（誰も気づかない…）",
      state: blocked ? ("blocked" as const) : ("pass" as const),
    },
    {
      label: "支払い",
      emoji: blocked ? "―" : detected ? "🔍" : "💸",
      note: blocked
        ? "ここまで来ない（承認で止まった）"
        : detected
          ? "支払われたが、記録から不正が発覚！"
          : "10万円が支払われてしまった…",
      state: blocked ? ("skip" as const) : detected ? ("found" as const) : ("bad" as const),
    },
  ];

  return (
    <Panel>
      <SectionTitle step={2}>内部統制ラボ：不正を防げるか実験</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">内部統制</b>＝ミスや不正を防ぐ社内の仕組み。
        シナリオは「<b className="text-gray-800">社員が架空の経費を申請して、自分で承認しようとする</b>」。
        仕組みをONにして、結末がどう変わるか試そう。
      </p>

      {/* 仕組みのON/OFFスイッチ */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {CONTROLS.map((c) => {
          const active = on[c.id];
          return (
            <button
              key={c.id}
              onClick={() => setOn((p) => ({ ...p, [c.id]: !p[c.id] }))}
              aria-pressed={active}
              className={`flex flex-col items-center rounded-xl p-2.5 text-center ring-2 transition active:scale-95 ${
                active ? "bg-emerald-500 text-white ring-emerald-500" : "bg-gray-50 text-gray-500 ring-gray-200"
              }`}
            >
              <span className="text-lg leading-none">{c.emoji}</span>
              <span className="mt-1 text-[11px] font-bold leading-tight">{c.t}</span>
              <span className={`mt-0.5 text-[10px] font-bold ${active ? "text-emerald-100" : "text-gray-400"}`}>
                {active ? "ON" : "OFF"}
              </span>
            </button>
          );
        })}
      </div>

      {/* 業務の流れと結末 */}
      <div className="mt-3 space-y-1.5">
        {steps.map((s, i) => (
          <div key={i}>
            <div
              className={`rounded-xl px-3 py-2.5 ring-1 transition-colors ${
                s.state === "blocked"
                  ? "bg-emerald-50 ring-emerald-300"
                  : s.state === "bad"
                    ? "bg-rose-50 ring-rose-300"
                    : s.state === "found"
                      ? "bg-sky-50 ring-sky-300"
                      : s.state === "skip"
                        ? "bg-gray-50 opacity-50 ring-gray-200"
                        : "bg-gray-50 ring-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{s.emoji}</span>
                <span className="text-xs font-bold text-gray-700">{s.label}</span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{s.note}</p>
            </div>
            {i < steps.length - 1 && <div className="pl-4 text-xs text-gray-300">↓</div>}
          </div>
        ))}
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-3 text-sm font-bold leading-relaxed ring-1 ${
          blocked
            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
            : detected
              ? "bg-sky-50 text-sky-800 ring-sky-200"
              : "bg-rose-50 text-rose-800 ring-rose-200"
        }`}
      >
        {blocked
          ? "🛡️ 不正は途中でブロックされた！ 仕組みが「事前に」防いだ。"
          : detected
            ? "🔍 支払いは通ったが、証跡から「あとで」発覚。記録も大切な統制。"
            : "😱 不正が成功してしまった… 仕組みがないと誰も気づけない。"}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ 内部統制は「社員を監視するため」だけの仕組みではなく、<b>業務を正しく回すための土台</b>です。
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 仕分けクイズ
// ---------------------------------------------------------------------------
const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "監査人は対象部門から独立した立場で確認する", ok: true, why: "独立性が監査の基本。" },
  { t: "監査人が見つけた問題は改善を勧告する", ok: true, why: "監査は気づきを伝え改善を促す（助言する）役割。" },
  { t: "監査人が自分でシステムの修理・改修を担当する", ok: false, why: "実務を担うと独立性が崩れる。監査人は確認・勧告まで。" },
  { t: "監査される部門が、自分で都合よく結果を決める", ok: false, why: "自己採点では客観性がない。第三者が確認すべき。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={3}>監査として正しい？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const has = chosen !== undefined;
          const correct = chosen === it.ok;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {[
                  { v: true, label: "⭕ 正しい" },
                  { v: false, label: "❌ ダメ" },
                ].map((o) => {
                  const picked = chosen === o.v;
                  const tone = !has
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? o.v === it.ok
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : o.v === it.ok
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={String(o.v)}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: o.v }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {has && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : "❌ 残念。 "}
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

export default function SystemAuditExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🧑‍⚖️ <b>システム監査</b>は、システムが正しく安全に使われているかを<b>独立した第三者</b>が客観的に確認する活動。
        <b>内部統制</b>は、ミスや不正を防ぐ社内の仕組みです。テストを先生が採点基準で確認するイメージ。
      </div>

      <WhatIsAudit />
      <ControlLab />
      <Quiz />
    </div>
  );
}
