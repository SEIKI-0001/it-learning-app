"use client";

// 年度別演習の結果画面。
//
// 表示しないもの: 合否判定。
// ITパスポート本試験の合否は総合評価点と分野別基準点で決まり、公開問題100問の
// 単純正答率とは別物なので、「合格見込み」のような表示はしない。代わりに
// 何を測った数字なのかを注意書きで明示する。

import { useMemo, useState } from "react";
import Link from "next/link";
import Button, { buttonClass } from "@/components/ui/Button";
import PastExamQuestionCard from "@/components/pastExam/PastExamQuestionCard";
import type { PastExamQuestionView } from "@/lib/pastExam/questionView";
import { FIELD_LABELS } from "@/types/content";
import type { PastExamResult } from "@/types/pastExam";

const DISCLAIMER =
  "この結果は公開問題100問の単純正答率です。実際の試験の評価点や合否を再現するものではありません。";

type Props = {
  result: PastExamResult;
  questions: PastExamQuestionView[];
  yearLabel: string;
  onRestart: () => void;
};

export default function PastExamResultView({
  result,
  questions,
  yearLabel,
  onRestart,
}: Props) {
  const [wrongOnly, setWrongOnly] = useState(false);

  const byNumber = useMemo(
    () => new Map(questions.map((q) => [q.questionNumber, q])),
    [questions],
  );

  const shown = wrongOnly
    ? result.questions.filter((r) => !r.isCorrect)
    : result.questions;

  const wrongCount = result.questions.filter((r) => !r.isCorrect).length;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-500">{yearLabel} の結果</h2>
        <p className="mt-1.5">
          <span className="text-3xl font-bold tabular-nums text-gray-900">
            {result.correct}
          </span>
          <span className="text-lg font-semibold text-gray-500"> / {result.total}</span>
          <span className="ml-3 text-lg font-bold tabular-nums text-brand-600">
            {result.rate}%
          </span>
        </p>
        <p className="mt-1 text-xs text-gray-500">
          未回答 {result.unanswered} 問
          {result.mode === "exam" ? "・本番モード" : "・練習モード"}
        </p>

        <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
          {DISCLAIMER}
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-bold text-gray-900">公式出題区分別</h2>
        <p className="mt-1 text-xs text-gray-500">
          公式問題冊子で、その問がどの区分に置かれていたかで集計しています。
        </p>
        <div className="mt-3 space-y-3">
          {result.byField.map((field) => (
            <div key={field.field}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-gray-800">
                  {FIELD_LABELS[field.field]}
                </span>
                <span className="text-xs tabular-nums text-gray-600">
                  {field.correct} / {field.total} 問（{field.rate}%）
                </span>
              </div>
              <div
                className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-valuenow={field.rate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${FIELD_LABELS[field.field]}の正答率`}
              >
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${field.rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-900">問題ごとの結果</h2>
          <button
            type="button"
            onClick={() => setWrongOnly((v) => !v)}
            aria-pressed={wrongOnly}
            className={buttonClass(wrongOnly ? "warn" : "secondary", "sm")}
          >
            {wrongOnly ? `誤答のみ表示中（${wrongCount}問）` : `誤答だけに絞る（${wrongCount}問）`}
          </button>
        </div>

        {shown.length === 0 && (
          <p className="mt-3 text-sm text-gray-600">
            誤答はありません。全問正解です。
          </p>
        )}
      </section>

      <div className="space-y-4">
        {shown.map((r) => {
          const question = byNumber.get(r.questionNumber);
          if (!question) return null;
          return (
            <PastExamQuestionCard
              key={r.questionId}
              question={question}
              index={r.questionNumber - 1}
              total={result.total}
              selected={r.selected}
              onSelect={() => {}}
              revealAnswer
              disabled
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onRestart}>もう一度挑戦する</Button>
        <Link href="/review" className={buttonClass("secondary")}>
          復習キューを見る
        </Link>
        <Link href="/past-exams" className={buttonClass("secondary")}>
          年度一覧へ
        </Link>
      </div>
    </div>
  );
}
