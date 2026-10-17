"use client";

import { useEffect, useState } from "react";
import Mochit from "@/components/mochit/Mochit";
import Icon from "@/components/ui/Icon";
import ProjectionMeter from "@/components/onboarding/ProjectionMeter";
import type { StudyTimeProjection } from "@/lib/onboardingProjection";

// 初回設定の締め。Noom 型の「プランを作っています…」（項目が順にチェックされる）から、
// 「あなたのプラン」を見せて今日の学習へ送る。中身はすべて計画エンジンの実際の出力。

export type PlanSummary = {
  examDate: string | null;
  provisional: boolean;
  weekdayMinutes: number;
  holidayMinutes: number;
  projection: StudyTimeProjection;
  /** 今日最初に学ぶテーマ（無ければ出さない） */
  firstTopicTitle: string | null;
};

const BUILD_STEPS = ["試験日から逆算しています", "毎日の学習量を割り振っています", "最初のテーマを選んでいます"];
const STEP_MS = 650;

const PLAN_NAME: Record<StudyTimeProjection["level"], string> = {
  comfortable: "余裕をもって合格プラン",
  tight: "ぴったり合格プラン",
  sprint: "短期集中プラン",
  "no-exam": "マイペースプラン",
};

const CONFETTI_COLORS = ["#2463d1", "#1a9a66", "#d9442c", "#e0a12b", "#7c5cd6"];

export default function PlanReveal({
  summary,
  onStart,
}: {
  summary: PlanSummary;
  onStart: () => void;
}) {
  const [done, setDone] = useState(0);
  const finished = done > BUILD_STEPS.length;

  useEffect(() => {
    if (finished) return;
    const timer = window.setTimeout(() => setDone((d) => d + 1), done === 0 ? 300 : STEP_MS);
    return () => window.clearTimeout(timer);
  }, [done, finished]);

  if (!finished) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12" role="status">
        <Mochit size="medium" animation="bounce" />
        <h1 className="mt-5 text-xl font-bold tracking-tight text-gray-900">
          あなたの合格プランを作っています
        </h1>
        <ul className="mt-6 w-full max-w-xs space-y-3">
          {BUILD_STEPS.map((label, i) => {
            const isDone = i < done;
            const active = i === done;
            return (
              <li key={label} className={`flex items-center gap-3 text-sm ${isDone ? "text-gray-900" : "text-gray-400"}`}>
                <span className="ob-check" data-done={isDone}>
                  {isDone ? (
                    <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : active ? (
                    <span className="ob-spin" />
                  ) : null}
                </span>
                {label}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const { projection } = summary;
  return (
    <div className="relative mx-auto w-full max-w-xl flex-1 px-4 pb-8 pt-8">
      <div className="ob-confetti" aria-hidden>
        {Array.from({ length: 18 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${(i % 6) * 0.08}s`,
            }}
          />
        ))}
      </div>
      <div className="flex flex-col items-center text-center">
        <Mochit size="medium" animation="celebrate" />
        <p className="ob-rise mt-3 inline-block rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
          {PLAN_NAME[projection.level]}
        </p>
        <h1 className="ob-rise mt-2 text-2xl font-bold tracking-tight text-gray-900">プランができました！</h1>
      </div>

      <div className="ob-rise mt-6 space-y-3" style={{ animationDelay: "0.15s" }}>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-brand-50 px-4 py-3">
            <p className="text-xs text-gray-600">試験日{summary.provisional ? "（仮）" : ""}</p>
            {summary.examDate && projection.days !== null ? (
              <>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900">
                  あと{projection.days}日
                </p>
                <p className="text-xs tabular-nums text-gray-500">{formatDate(summary.examDate)}</p>
              </>
            ) : (
              <p className="mt-0.5 text-lg font-bold text-gray-900">未定</p>
            )}
          </div>
          <div className="rounded-xl bg-brand-50 px-4 py-3">
            <p className="text-xs text-gray-600">毎日の目安</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900">平日{summary.weekdayMinutes}分</p>
            <p className="text-xs tabular-nums text-gray-500">休日{summary.holidayMinutes}分</p>
          </div>
        </div>
        <ProjectionMeter projection={projection} />
        {summary.firstTopicTitle && (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-900 text-xs font-bold text-white">
              1
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-gray-500">今日の最初のテーマ</span>
              <span className="block truncate font-semibold text-gray-900">{summary.firstTopicTitle}</span>
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="ob-rise mt-7 w-full rounded-lg bg-gray-900 px-6 py-4 text-base font-semibold text-white transition hover:bg-black active:scale-[0.99]"
        style={{ animationDelay: "0.3s" }}
      >
        今日の学習をはじめる
      </button>
      <p className="mt-2 text-center text-xs text-gray-500">試験日や時間は、あとから設定で変えられます</p>
    </div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}
