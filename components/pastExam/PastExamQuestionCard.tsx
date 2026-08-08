"use client";

// 公式過去問1問の表示。
//
// 表示順は公式問題冊子に合わせる: 問題文 → 図表 → 選択肢 → 出典。
// 選択肢は受け取った配列の順にそのまま出す（シャッフルしない）。
// 内部キーは A〜D のままで、画面上の記号だけ ア〜エ にする。

import Link from "next/link";
import OfficialQuestionSource from "@/components/questions/OfficialQuestionSource";
import QuestionFigures from "@/components/questions/QuestionFigures";
import { CHOICE_LABELS, type PastExamQuestionView } from "@/lib/pastExam/questionView";
import type { ChoiceKey } from "@/types";

type Props = {
  question: PastExamQuestionView;
  index: number;
  total: number;
  selected: ChoiceKey | null;
  onSelect: (key: ChoiceKey) => void;
  /** 正誤と解説を出してよいか（練習モードの回答後 / 本番モードの採点後だけ true）。 */
  revealAnswer: boolean;
  /** 回答を変更できるか。採点後の見直し表示では false。 */
  disabled?: boolean;
};

export default function PastExamQuestionCard({
  question,
  index,
  total,
  selected,
  onSelect,
  revealAnswer,
  disabled = false,
}: Props) {
  const isCorrect = selected !== null && selected === question.correctChoice;

  return (
    <article className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-xs font-semibold text-brand-600">
          問{question.questionNumber} / {total}
        </p>
        <p className="sr-only">
          {total}問中{index + 1}問目
        </p>
      </div>

      <div className="px-4 py-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
          {question.prompt}
        </p>

        <QuestionFigures figures={question.figures} className="mt-4" />

        <fieldset className="mt-4" disabled={disabled}>
          <legend className="sr-only">選択肢</legend>
          <div className="space-y-2">
            {question.choices.map((choice) => (
              <ChoiceButton
                key={choice.key}
                choiceKey={choice.key}
                text={choice.text}
                selected={selected === choice.key}
                isCorrectChoice={choice.key === question.correctChoice}
                revealAnswer={revealAnswer}
                disabled={disabled}
                onSelect={() => onSelect(choice.key)}
              />
            ))}
          </div>
        </fieldset>

        {revealAnswer && (
          <div className="mt-4 space-y-3">
            <p
              className={`text-sm font-semibold ${
                isCorrect ? "text-brand-700" : "text-accent-700"
              }`}
              role="status"
            >
              {selected === null
                ? `未回答　正答: ${CHOICE_LABELS[question.correctChoice]}`
                : isCorrect
                  ? "正解"
                  : `不正解　正答: ${CHOICE_LABELS[question.correctChoice]}`}
            </p>

            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500">
                解説（本サービス独自）
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                {question.explanation}
              </p>
            </div>

            {question.topicTitle && (
              <Link
                href={`/topics/${question.topicId}`}
                className="inline-flex text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                復習する: {question.topicTitle}
              </Link>
            )}
          </div>
        )}
      </div>

      <OfficialQuestionSource
        official={{
          attribution: question.attribution,
          sourceUrl: question.sourceUrl,
          answerSourceUrl: question.answerSourceUrl,
          year: question.year,
          questionNumber: question.questionNumber,
        }}
      />
    </article>
  );
}

function ChoiceButton({
  choiceKey,
  text,
  selected,
  isCorrectChoice,
  revealAnswer,
  disabled,
  onSelect,
}: {
  choiceKey: ChoiceKey;
  text: string;
  selected: boolean;
  isCorrectChoice: boolean;
  revealAnswer: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  // 採点後の色分け。正答は常に緑、選んだ誤答だけ赤にする。
  let tone = "border-gray-200 bg-white hover:bg-gray-50";
  if (revealAnswer && isCorrectChoice) {
    tone = "border-brand-500 bg-brand-50";
  } else if (revealAnswer && selected) {
    tone = "border-accent-500 bg-accent-50";
  } else if (selected) {
    tone = "border-brand-500 bg-brand-50";
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition disabled:cursor-default ${tone}`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold ${
          selected ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"
        }`}
      >
        {CHOICE_LABELS[choiceKey]}
      </span>
      <span className="sr-only">選択肢{CHOICE_LABELS[choiceKey]}</span>
      <span className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
        {text}
      </span>
    </button>
  );
}