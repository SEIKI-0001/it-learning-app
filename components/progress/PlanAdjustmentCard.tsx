"use client";

import { useState } from "react";
import Link from "next/link";
import {
  getUserId,
  respondToPlanAdjustment,
} from "@/lib/userSession";
import {
  acceptedOptionNote,
  impactLabel,
  OPTION_ID,
  severityLabel,
  severityTone,
  type PlanAdjustmentProposal,
  type RecoveryPlanOption,
} from "@/types/planAdjustment";

// 計画の立て直し提案カード（/plan・計画画面）。
// 遅れ・弱点・リスクを検知したときだけ、複数の立て直し案を提示する。
// /progress には本体を置かず、提案があるときだけ /plan への導線バナーを出す（重複解消）。
// 未ログイン・Supabase 未設定・提案不要・失敗なら何も表示しない（既存表示を壊さない）。
export default function PlanAdjustmentCard({
  proposal: initialProposal,
  loading = false,
}: {
  proposal: PlanAdjustmentProposal | null;
  loading?: boolean;
}) {
  const [localProposal, setLocalProposal] =
    useState<PlanAdjustmentProposal | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <PlanAdjustmentSkeleton />;

  const proposal = localProposal ?? initialProposal;
  if (!proposal) return null;
  // 見送り・期限切れは表示しない。
  if (proposal.status === "rejected" || proposal.status === "expired") return null;
  const activeSelectedId = proposal.options.some((o) => o.optionId === selectedId)
    ? selectedId
    : (proposal.options[0]?.optionId ?? "");

  // すでに承認済み：選んだ案の確認だけを表示する。
  if (proposal.status === "accepted") {
    const note = acceptedOptionNote(proposal.selectedOptionId ?? "");
    const isPostpone = proposal.selectedOptionId === OPTION_ID.postponeExam;
    return (
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-emerald-100">
        <p className="text-xs font-bold text-emerald-600">✅ 立て直しプラン調整中</p>
        <p className="mt-1 text-sm font-semibold text-gray-700">{note}</p>
        {isPostpone && (
          <Link
            href="/settings"
            className="mt-3 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white"
          >
            設定で試験日を登録する →
          </Link>
        )}
      </section>
    );
  }

  async function respond(action: "accept" | "reject") {
    const userId = getUserId();
    if (!userId || submitting) return;
    setSubmitting(true);
    const updated = await respondToPlanAdjustment(
      userId,
      proposal!.proposalId,
      action,
      action === "accept" ? activeSelectedId : undefined,
    );
    setSubmitting(false);
    if (updated) setLocalProposal(updated);
    else if (action === "reject") {
      // 保存に失敗しても、見送りの意思は画面上は反映する。
      setLocalProposal({ ...proposal!, status: "rejected" });
    }
  }

  return (
    <section className="rounded-xl bg-white p-4 border border-gray-200">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-gray-800">🛠️ 計画の立て直し提案</p>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${severityTone(
            proposal.severity,
          )}`}
        >
          {severityLabel(proposal.severity)}
        </span>
      </div>

      <p className="mt-2 text-sm font-bold text-gray-800">{proposal.headline}</p>
      {proposal.reasonSummary && (
        <p className="mt-1 text-xs leading-relaxed text-gray-600">
          {proposal.reasonSummary}
        </p>
      )}
      <p className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">
        どれを選んでも間違いではありません。今のあなたに合う進め方を選ぶだけです。
      </p>

      <div className="mt-3 space-y-2.5">
        {proposal.options.map((opt) => (
          <OptionCard
            key={opt.optionId}
            option={opt}
            selected={activeSelectedId === opt.optionId}
            onSelect={() => setSelectedId(opt.optionId)}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={submitting || !activeSelectedId}
          onClick={() => respond("accept")}
          className="flex-1 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow transition active:scale-[0.99] disabled:opacity-50"
        >
          この案で調整する
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => respond("reject")}
          className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-gray-500 ring-1 ring-gray-200 transition active:scale-[0.99] disabled:opacity-50"
        >
          今回は見送る
        </button>
      </div>
    </section>
  );
}

function PlanAdjustmentSkeleton() {
  return (
    <section className="rounded-xl bg-white p-4 border border-gray-200">
      <div className="flex items-center justify-between gap-3">
        <div className="h-5 w-40 rounded-full bg-gray-100" />
        <div className="h-6 w-28 rounded-full bg-gray-100" />
      </div>
      <div className="mt-3 h-4 w-3/4 rounded-full bg-gray-100" />
      <div className="mt-2 h-10 rounded-xl bg-gray-50" />
      <div className="mt-3 space-y-2.5">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-2">
              <div className="h-4 w-36 rounded-full bg-gray-100" />
              <div className="h-5 w-14 rounded-full bg-white" />
            </div>
            <div className="mt-2 h-3 w-full rounded-full bg-gray-100" />
            <div className="mt-2 h-2 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </section>
  );
}

function OptionCard({
  option,
  selected,
  onSelect,
}: {
  option: RecoveryPlanOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const f = option.focus;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`block w-full rounded-xl p-3 text-left ring-1 transition ${
        selected
          ? "bg-brand-50 ring-brand-300"
          : "bg-gray-50 ring-gray-100 hover:ring-gray-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <span
            className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ring-2 ${
              selected ? "bg-brand-600 ring-brand-600" : "bg-white ring-gray-300"
            }`}
          >
            {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          </span>
          {option.title}
        </span>
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-gray-500 ring-1 ring-gray-200">
          {impactLabel(option.estimatedImpact)}
        </span>
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
        {option.description}
      </p>

      {/* 配分バー */}
      <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="bg-brand-400" style={{ width: `${f.textbook}%` }} />
        <div className="bg-emerald-400" style={{ width: `${f.review}%` }} />
        <div className="bg-rose-400" style={{ width: `${f.examPractice}%` }} />
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] font-semibold text-gray-500">
        <span>インプット {f.textbook}%</span>
        <span>復習・単語 {f.review}%</span>
        <span>過去問レベル {f.examPractice}%</span>
      </div>

      {/* 具体的な行動（メリット） */}
      {option.actions.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {option.actions.map((a, i) => (
            <li key={i} className="flex gap-1.5 text-xs text-gray-700">
              <span className="text-emerald-500">✓</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}

      {/* 代償 */}
      <p className="mt-1.5 text-[11px] text-amber-700">
        <span className="font-bold">代償：</span>
        {option.tradeoff}
      </p>

      {option.requiresExamDateChange && (
        <p className="mt-1 text-[11px] font-bold text-brand-600">
          ※ この案は設定からの試験日変更が前提です
        </p>
      )}
    </button>
  );
}
