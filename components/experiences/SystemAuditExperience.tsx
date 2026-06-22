"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「システム監査と内部統制」専用の体験。
//   ① システム監査 = 第三者の目で客観的に確認（独立性）
//   ② 内部統制 = ミスや不正を防ぐ社内の仕組み
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
            className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white active:scale-95"
          >
            切り替え
          </button>
        </div>
        <div className="mt-3 text-center">
          {self ? (
            <div>
              <div className="text-3xl">🙋‍♂️📝</div>
              <div className="mt-1 text-sm font-extrabold text-rose-600">自分で自分を採点</div>
              <p className="mt-1 text-xs text-gray-500">甘くなりがち。見落としや隠ぺいも起きうる…</p>
            </div>
          ) : (
            <div>
              <div className="text-3xl">🧑‍⚖️🔍</div>
              <div className="mt-1 text-sm font-extrabold text-emerald-600">独立した第三者が確認</div>
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

function InternalControl() {
  return (
    <Panel>
      <SectionTitle step={2}>内部統制 ＝ ミスや不正を防ぐ仕組み</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        内部統制は、会社の業務が正しく進むよう、<b className="text-gray-800">ミスや不正を防ぐ社内の仕組み</b>。
        監査はこの仕組みがちゃんと働いているかも確認します。
      </p>
      <div className="mt-3 space-y-2">
        {[
          { emoji: "✌️", t: "ダブルチェック", d: "1人で完結させず、別の人が確認する" },
          { emoji: "🔑", t: "権限の分離", d: "申請する人と承認する人を分ける" },
          { emoji: "🧾", t: "記録を残す", d: "誰がいつ何をしたか証跡を残す（監査証跡）" },
        ].map((c) => (
          <div key={c.t} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <span className="text-lg">{c.emoji}</span>
            <div>
              <div className="text-sm font-extrabold text-gray-800">{c.t}</div>
              <div className="text-xs text-gray-500">{c.d}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ 内部統制は「社員を監視するため」だけの仕組みではなく、<b>業務を正しく回すための土台</b>です。
      </div>
    </Panel>
  );
}

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
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🧑‍⚖️ <b>システム監査</b>は、システムが正しく安全に使われているかを<b>独立した第三者</b>が客観的に確認する活動。
        <b>内部統制</b>は、ミスや不正を防ぐ社内の仕組みです。テストを先生が採点基準で確認するイメージ。
      </div>

      <WhatIsAudit />
      <InternalControl />
      <Quiz />
    </div>
  );
}
