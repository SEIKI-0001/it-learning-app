"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";
import Icon, { type IconName } from "@/components/ui/Icon";
import { InlineIcon } from "@/components/ui/Pictogram";
import { AuditFlow, AuditIndependence, AuditKinds, AuditQuiz, InternalControlElements, ItGovernance } from "./audit/AuditPanels";

// ============================================================================
// 「システム監査と内部統制」専用の体験。
//   ① 監査人の独立性（外観上・精神上。社内の独立部門でもよい）
//   ② 監査の4種類（会計・業務・情報セキュリティ・システム）
//   ③ 監査の流れと監査人の役割（指示はしない・フォローアップする）
//   ④ 内部統制ラボ：仕組みをON/OFFして、不正な申請が防げるか実験する
//   ⑤ 内部統制の6要素と組織間のけん制
//   ⑥ ITガバナンス（評価・指示・モニター、ルールを決める側）
//   ⑦ 過去問の論点で 正しい？ダメ？
//   ①〜③・⑤〜⑦は audit/AuditPanels
// ============================================================================

// ---------------------------------------------------------------------------
// ② 内部統制ラボ: 仕組みをON/OFFすると、不正な経費申請の結末が変わる
// ---------------------------------------------------------------------------
const CONTROLS = [
  { id: "sep", icon: "key", t: "権限の分離", d: "申請する人と承認する人を分ける" },
  { id: "dbl", icon: "check-double", t: "ダブルチェック", d: "別の人がもう一度確認する" },
  { id: "log", icon: "file-text", t: "監査証跡", d: "誰がいつ何をしたか記録を残す" },
] as const;

type ControlId = (typeof CONTROLS)[number]["id"];

function ControlLab() {
  const [on, setOn] = useState<Record<ControlId, boolean>>({ sep: false, dbl: false, log: false });

  // 不正シナリオ: 社員が架空の経費10万円を申請し、自分で承認しようとする
  const blocked = on.sep || on.dbl; // 承認段階で止まる
  const detected = !blocked && on.log; // 通ってしまうが、記録から発覚する

  const steps = [
    { label: "申請", icon: "user" as IconName, note: "社員が架空の経費 10万円 を申請", state: "pass" as const },
    {
      label: "承認",
      icon: (blocked ? "ban" : "check") as IconName,
      note: blocked
        ? on.sep
          ? "自分では承認できない！ 別の承認者がチェックして却下"
          : "2人目の確認で「おかしい」と気づき却下"
        : "自分で自分の申請を承認（誰も気づかない…）",
      state: blocked ? ("blocked" as const) : ("pass" as const),
    },
    {
      label: "支払い",
      icon: (blocked ? "minus" : detected ? "search" : "yen") as IconName,
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
      <SectionTitle step={4}>内部統制ラボ：不正を防げるか実験</SectionTitle>
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
              <Icon name={c.icon} className="h-5 w-5" />
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
                <Icon name={s.icon} className="h-4 w-4 text-gray-600" />
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
          ? "不正は途中でブロックされた！ 仕組みが「事前に」防いだ。"
          : detected
            ? "支払いは通ったが、証跡から「あとで」発覚。記録も大切な統制。"
            : "不正が成功してしまった… 仕組みがないと誰も気づけない。"}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        <InlineIcon name="alert" />内部統制は「社員を監視するため」だけの仕組みではなく、<b>業務を正しく回すための土台</b>です。
      </div>
    </Panel>
  );
}

export default function SystemAuditExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        <b>システム監査</b>は、システムが正しく安全に使われているかを、対象から<b>独立した監査人</b>が客観的に評価する活動。
        <b>内部統制</b>はミスや不正を防ぐ社内の仕組み、<b>ITガバナンス</b>は経営陣がITを方向づける取組みです。
      </div>

      <AuditIndependence step={1} />
      <AuditKinds step={2} />
      <AuditFlow step={3} />
      <ControlLab />
      <InternalControlElements step={5} />
      <ItGovernance step={6} />
      <AuditQuiz step={7} />
    </div>
  );
}
