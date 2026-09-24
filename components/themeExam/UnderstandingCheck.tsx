"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { requestAiGrading, type AiGradingFailure } from "@/lib/ai/gradingClient";
import {
  pickUnderstandingCheck,
  understandingLevelFor,
  UNDERSTANDING_LEVEL_LABEL,
  type UnderstandingCheckPick,
  type UnderstandingCheckReason,
} from "@/lib/chapterReview";
import { getLessonHref } from "@/lib/learningCatalog";
import { getUserId } from "@/lib/userSession";
import type { UserProgress } from "@/types";
import { AI_GRADING_MIN_ANSWER_LENGTH, type GradeResult } from "@/types/aiGrading";
import type { UnderstandingLevel } from "@/types/chapterReview";

// 総まとめ試験の直後に出す「AI理解チェック」（1問）。
//
// 総まとめ試験とは別の評価で、合否・章クリア・次の学習への進行には一切使わない。
// 四択では正解できても説明しきれない箇所に、本人が気づくための補助。
// そのため:
//   - いつでもスキップできる（章の学習は止めない）
//   - AIが使えないとき（未ログイン・上限・失敗）は、模範的な説明と見比べる自己確認に切り替える
//   - 結果は点数ではなく3段階＋具体的な指摘を主役にする

type Props = {
  themeSlug: string;
  examQuestions: readonly { topicId: string; isCorrect: boolean }[];
  /** 出題を選ぶための学習状態（採点確定後のもの）。 */
  progress: UserProgress | null | undefined;
  /** AIの採点が返ったときに呼ぶ。補助シグナルの記録は呼び出し側が行う。 */
  onGraded?: (pick: UnderstandingCheckPick, result: GradeResult, checkedAt: string) => void;
};

type Phase =
  | { kind: "answering" }
  | { kind: "grading" }
  | { kind: "graded"; result: GradeResult }
  | { kind: "unavailable"; reason: AiGradingFailure; message: string }
  | { kind: "skipped" };

const REASON_LABEL: Record<UnderstandingCheckReason, (topic: string) => string> = {
  exam_miss: (topic) => `総まとめ試験で間違えた「${topic}」から出題しています。`,
  low_mastery: (topic) => `理解度がまだ低めの「${topic}」から出題しています。`,
  explain_correct: (topic) => `四択で正解できた「${topic}」を、自分の言葉で説明できるか確かめます。`,
  representative: (topic) => `この章の重要テーマ「${topic}」から出題しています。`,
};

const LEVEL_STYLE: Record<UnderstandingLevel, { chip: string; icon: "circle-check" | "target" | "lightbulb" }> = {
  solid: { chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: "circle-check" },
  almost: { chip: "bg-brand-50 text-brand-700 ring-brand-200", icon: "target" },
  review: { chip: "bg-accent-50 text-accent-700 ring-accent-200", icon: "lightbulb" },
};

export default function UnderstandingCheck({ themeSlug, examQuestions, progress, onGraded }: Props) {
  // 出題はマウント時に1度だけ決める。採点後に学習状態が変わっても問題を差し替えない。
  const [pick] = useState(() => pickUnderstandingCheck({ themeSlug, examQuestions, progress }));
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "answering" });
  const [inputError, setInputError] = useState<string | null>(null);

  if (!pick) return null;

  const trimmedLength = answer.trim().length;
  const canSubmit = trimmedLength >= AI_GRADING_MIN_ANSWER_LENGTH && phase.kind === "answering";
  const reviewHref = getLessonHref(pick.topicId, { from: "review", activity: "learn", anchor: "lesson-content" });

  const submit = async () => {
    if (!canSubmit) return;
    setPhase({ kind: "grading" });
    setInputError(null);
    const response = await requestAiGrading({
      questionId: pick.question.id,
      userAnswer: answer,
      userId: getUserId(),
      mode: "understanding_check",
    });
    if (!response.ok) {
      // 短すぎる等の入力の問題は、書き直せるよう入力状態へ戻す。
      if (response.reason === "invalid") {
        setInputError(response.error);
        setPhase({ kind: "answering" });
        return;
      }
      setPhase({ kind: "unavailable", reason: response.reason, message: response.error });
      return;
    }
    onGraded?.(pick, response.result, new Date().toISOString());
    setPhase({ kind: "graded", result: response.result });
  };

  if (phase.kind === "skipped") {
    return (
      <Card as="section" className="p-4">
        <p className="text-sm text-gray-600">AI理解チェックはスキップしました。</p>
        <button
          type="button"
          onClick={() => setPhase({ kind: "answering" })}
          className="mt-2 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
        >
          やっぱり挑戦する
        </button>
      </Card>
    );
  }

  return (
    <Card as="section" className="p-5" aria-labelledby="understanding-check-title">
      <p className="text-xs font-semibold text-gray-500">最後に、説明できるか確認してみよう</p>
      <h3 id="understanding-check-title" className="mt-1 flex items-center gap-1.5 text-base font-bold text-gray-900">
        <Icon name="pen" className="h-4 w-4 text-brand-600" />
        AI理解チェック
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        {REASON_LABEL[pick.reason](pick.topicTitle)}
        総まとめ試験の合否には影響しません。
      </p>

      <p className="mt-4 rounded-lg bg-gray-50 px-3 py-3 text-[15px] font-semibold leading-relaxed text-gray-900">
        {pick.question.question}
      </p>

      {(phase.kind === "answering" || phase.kind === "grading") && (
        <div className="mt-4">
          <label htmlFor="understanding-answer" className="text-sm font-semibold text-gray-700">
            あなたの説明
          </label>
          <textarea
            id="understanding-answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            disabled={phase.kind === "grading"}
            rows={6}
            placeholder="用語を並べるより、仕組み・理由・具体例を自分の言葉で書いてみましょう。"
            className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-base leading-relaxed text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50"
          />
          <p className="mt-1 text-right text-xs tabular-nums text-gray-500">
            {trimmedLength}文字
            {trimmedLength < AI_GRADING_MIN_ANSWER_LENGTH && `（${AI_GRADING_MIN_ANSWER_LENGTH}文字以上で確認できます）`}
          </p>
          {inputError && (
            <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {inputError}
            </p>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className={buttonClass("primary", "lg", "mt-3 w-full")}
          >
            {phase.kind === "grading" ? "AIが確認しています…" : "AIに確認してもらう"}
          </button>
          <button
            type="button"
            onClick={() => setPhase({ kind: "skipped" })}
            disabled={phase.kind === "grading"}
            className="mt-2 w-full py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            今回はスキップする
          </button>
        </div>
      )}

      {phase.kind === "graded" && (
        <UnderstandingFeedback result={phase.result} reviewHref={reviewHref} topicTitle={pick.topicTitle} />
      )}

      {phase.kind === "unavailable" && (
        <SelfCheck
          reason={phase.reason}
          message={phase.message}
          answer={answer}
          modelAnswer={pick.question.modelAnswer}
          rubric={pick.question.rubric}
          reviewHref={reviewHref}
          loginNext={`/theme-exam/${themeSlug}`}
          onRetry={phase.reason === "failed" ? () => setPhase({ kind: "answering" }) : undefined}
        />
      )}
    </Card>
  );
}

function UnderstandingFeedback({
  result,
  reviewHref,
  topicTitle,
}: {
  result: GradeResult;
  reviewHref: string;
  topicTitle: string;
}) {
  const level = understandingLevelFor(result);
  const style = LEVEL_STYLE[level];
  return (
    <div className="mt-4 space-y-4" aria-live="polite">
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ring-1 ${style.chip}`}>
        <Icon name={style.icon} className="h-4 w-4" />
        {UNDERSTANDING_LEVEL_LABEL[level]}
      </span>

      {result.goodPoints.length > 0 && (
        <FeedbackList title="理解できていること" items={result.goodPoints} tone="good" />
      )}
      {result.missingPoints.length > 0 && (
        <FeedbackList title="もう一段理解したいところ" items={result.missingPoints} tone="missing" />
      )}

      {result.feedback && (
        <div>
          <h4 className="text-sm font-bold text-gray-900">正確に理解すると</h4>
          <p className="mt-1.5 rounded-lg border-l-4 border-brand-300 bg-brand-50/60 px-3 py-2.5 text-sm leading-relaxed text-gray-800">
            {result.feedback}
          </p>
        </div>
      )}

      <details className="group rounded-lg border border-gray-200">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-800">
          模範的な説明
          <Icon name="chevron-down" className="h-4 w-4 text-gray-400 transition group-open:rotate-180" />
        </summary>
        <p className="border-t border-gray-100 px-3 py-2.5 text-sm leading-relaxed text-gray-700">
          {result.modelAnswer}
        </p>
      </details>

      {level !== "solid" ? (
        <Link href={reviewHref} className={buttonClass("warn", "md", "w-full")}>
          <Icon name="rotate" className="h-4 w-4" />
          この部分を復習する（{topicTitle}）
        </Link>
      ) : (
        <Link href={reviewHref} className="block text-center text-sm font-semibold text-brand-700 hover:underline">
          「{topicTitle}」の教材を見直す
        </Link>
      )}
    </div>
  );
}

function FeedbackList({ title, items, tone }: { title: string; items: string[]; tone: "good" | "missing" }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-gray-900">{title}</h4>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-gray-800">
            {tone === "good" ? (
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** AIに確認できなかったときの自己確認。章の学習はここで止めない。 */
function SelfCheck({
  reason,
  message,
  answer,
  modelAnswer,
  rubric,
  reviewHref,
  loginNext,
  onRetry,
}: {
  reason: AiGradingFailure;
  message: string;
  answer: string;
  modelAnswer: string;
  rubric: string[];
  reviewHref: string;
  loginNext: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      <div role="status" className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm leading-relaxed text-gray-700">
        {reason === "login_required" ? "AIの確認はログインすると使えます。" : message}
        {" "}代わりに、模範的な説明と見比べて自分で確かめてみましょう。
        {reason === "login_required" && (
          <Link
            href={`/login?next=${encodeURIComponent(loginNext)}`}
            className="mt-1 block font-semibold text-brand-700 hover:underline"
          >
            ログインする
          </Link>
        )}
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-1 block font-semibold text-brand-700 hover:underline">
            もう一度AIに確認してもらう
          </button>
        )}
      </div>

      {answer.trim() && (
        <div>
          <h4 className="text-sm font-bold text-gray-900">あなたの説明</h4>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{answer.trim()}</p>
        </div>
      )}
      <div>
        <h4 className="text-sm font-bold text-gray-900">説明に入っているか確かめよう</h4>
        <ul className="mt-1.5 space-y-1.5">
          {rubric.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm leading-relaxed text-gray-800">
              <Icon name="circle" className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-bold text-gray-900">模範的な説明</h4>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{modelAnswer}</p>
      </div>
      <Link href={reviewHref} className={buttonClass("warn", "md", "w-full")}>
        <Icon name="rotate" className="h-4 w-4" />
        この部分を復習する
      </Link>
    </div>
  );
}
