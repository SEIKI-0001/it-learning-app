import {
  COMPUTER_ACTIONS,
  FLOW_ACTIONS,
  FORMAL_MAPPINGS,
  MINI_QUESTIONS,
  NOODLE_ACTIONS,
  isRepetitionComplete,
  isCorrectNoodleOrder,
  type NoodleActionId,
  type RepetitionState,
} from "./learningModel";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";

type ProcedureStepProps = {
  order: NoodleActionId[];
  onSelect: (action: NoodleActionId) => void;
  onReset: () => void;
};

export function ProcedureStep({
  order,
  onSelect,
  onReset,
}: ProcedureStepProps) {
  const answered = order.length === NOODLE_ACTIONS.length;
  const correct = isCorrectNoodleOrder(order);

  return (
    <div>
      <p className="text-sm leading-relaxed text-gray-600">
        下のカードを、やる順番にタップしてください。
      </p>

      <ol className="mt-3 grid grid-cols-3 gap-2" aria-label="選んだ手順">
        {[0, 1, 2].map((index) => {
          const selected = NOODLE_ACTIONS.find(
            (action) => action.id === order[index],
          );
          return (
            <li
              key={index}
              className="min-h-20 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 p-2 text-center"
            >
              <span className="text-[11px] font-bold text-indigo-500">
                {index + 1}番目
              </span>
              <span className="mt-1 block text-xl" aria-hidden>
                {selected?.emoji ?? "・"}
              </span>
              <span className="block text-xs font-bold text-gray-800">
                {selected?.label ?? "未選択"}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 grid gap-2">
        {NOODLE_ACTIONS.map((action) => {
          const selected = order.includes(action.id);
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onSelect(action.id)}
              disabled={selected || answered}
              className="flex min-h-11 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-left text-sm font-bold text-gray-800 transition active:scale-[0.99] disabled:opacity-40"
            >
              <span aria-hidden>{action.emoji}</span>
              {action.label}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div aria-live="polite" className="mt-3">
          {correct ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold leading-relaxed text-emerald-800 ring-1 ring-emerald-200">
              その順番なら完成！
              <span className="mt-1 block">
                目的を達成するための手順をアルゴリズムと呼びます
              </span>
            </p>
          ) : (
            <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
              <p className="font-bold">この順番ではうまく作れません。</p>
              <button
                type="button"
                onClick={onReset}
                className="mt-2 rounded-lg bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-amber-300"
              >
                もう一度並べる
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

type OrderStepProps = {
  answer: "works" | "fails" | null;
  onAnswer: (answer: "works" | "fails") => void;
};

export function OrderStep({ answer, onAnswer }: OrderStepProps) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-gray-600">
        同じ3つの行動でも、次の順番でカップ麺は作れるでしょうか？
      </p>
      <ol className="mt-3 space-y-2 rounded-xl bg-rose-50 p-3 ring-1 ring-rose-100">
        {["3分待つ", "お湯を入れる", "ふたを開ける"].map(
          (action, index) => (
            <li key={action} className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs text-rose-500">
                {index + 1}
              </span>
              {action}
            </li>
          ),
        )}
      </ol>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onAnswer("works")}
          className="min-h-11 rounded-xl border border-gray-200 font-bold text-gray-700"
        >
          うまくいく
        </button>
        <button
          type="button"
          onClick={() => onAnswer("fails")}
          className="min-h-11 rounded-xl bg-indigo-600 font-bold text-white"
        >
          うまくいかない
        </button>
      </div>

      {answer ? (
        <div
          aria-live="polite"
          className={`mt-3 rounded-xl px-3 py-2.5 text-sm leading-relaxed ring-1 ${
            answer === "fails"
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-amber-50 text-amber-900 ring-amber-200"
          }`}
        >
          <p className="font-bold">
            {answer === "fails" ? "正解！うまくいきません。" : "この順番では作れません。"}
          </p>
          <p className="mt-1 font-semibold">
            手順は内容だけでなく順番も重要です。
          </p>
        </div>
      ) : null}
    </div>
  );
}

type ComputerStepProps = {
  executedLines: number;
  onExecute: () => void;
};

export function ComputerStep({
  executedLines,
  onExecute,
}: ComputerStepProps) {
  const complete = executedLines === COMPUTER_ACTIONS.length;
  return (
    <div>
      <p className="text-sm leading-relaxed text-gray-600">
        コンピュータ役になって、命令を1行ずつ動かしてみましょう。
      </p>
      <p className="mt-3 text-xs font-bold text-indigo-600">
        実行済み {executedLines} / {COMPUTER_ACTIONS.length}
      </p>
      <ol className="mt-2 space-y-2">
        {COMPUTER_ACTIONS.map((action, index) => {
          const done = index < executedLines;
          const current = index === executedLines && !complete;
          return (
            <li
              key={action}
              className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-bold ring-1 ${
                done
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                  : current
                    ? "bg-indigo-50 text-indigo-800 ring-indigo-200"
                    : "bg-gray-50 text-gray-400 ring-gray-100"
              }`}
            >
              <span className="font-mono text-xs">{done ? "✓" : index + 1}</span>
              {action}
              {current ? (
                <span className="ml-auto text-[11px] text-indigo-500">次の行</span>
              ) : null}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={onExecute}
        disabled={complete}
        className="mt-3 min-h-11 w-full rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-40"
      >
        {complete ? "すべて実行しました" : "1行実行する"}
      </button>
      {complete ? (
        <p
          aria-live="polite"
          className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200"
        >
          コンピュータも手順を上から順番に実行する
        </p>
      ) : null}
    </div>
  );
}

type BoxStepProps = {
  adds: number;
  onAdd: () => void;
};

export function BoxStep({ adds, onAdd }: BoxStepProps) {
  const total = [0, 1, 3][adds] ?? 3;
  const complete = adds >= 2;
  const nextValue = adds === 0 ? 1 : 2;

  return (
    <div>
      <p className="text-sm leading-relaxed text-gray-600">
        数字をあとで使えるように、名前の付いた箱へ入れておきます。
      </p>

      <div className="mx-auto mt-4 max-w-52 rounded-2xl bg-amber-50 p-4 text-center ring-1 ring-amber-200">
        <p className="text-xs font-extrabold text-amber-800">合計の箱</p>
        <div
          data-testid="box-total"
          aria-live="polite"
          className="mx-auto mt-2 grid h-20 w-28 place-items-center rounded-xl border-4 border-dashed border-amber-400 bg-white font-mono text-4xl font-black text-gray-900"
        >
          {total}
        </div>
      </div>

      {!complete ? (
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 min-h-11 w-full rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white"
        >
          {nextValue}を足す
        </button>
      ) : (
        <div
          aria-live="polite"
          className="mt-4 space-y-2 rounded-xl bg-indigo-50 p-3 text-sm leading-relaxed text-indigo-950 ring-1 ring-indigo-200"
        >
          <p className="font-extrabold">名前の付いた箱を変数と呼ぶ</p>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-indigo-100">
            <span className="font-semibold">合計の箱を0にする</span>
            <code className="rounded-md bg-gray-900 px-2 py-1 font-mono text-white">
              合計 ← 0
            </code>
          </div>
          <p className="text-xs font-semibold text-indigo-800">
            ← は、右の値を左の箱へ入れる印です。等号ではありません。
          </p>
        </div>
      )}
    </div>
  );
}

type RepetitionStepProps = {
  state: RepetitionState;
  onAdd: () => void;
};

export function RepetitionStep({ state, onAdd }: RepetitionStepProps) {
  const complete = isRepetitionComplete(state);

  return (
    <div>
      <p className="text-sm leading-relaxed text-gray-600">
        1から5まで、同じボタンで順番に足してみましょう。
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-indigo-50 p-3 text-center ring-1 ring-indigo-200">
          <p className="text-xs font-extrabold text-indigo-700">合計</p>
          <p
            data-testid="repeat-total"
            aria-live="polite"
            className="mt-1 font-mono text-4xl font-black text-indigo-950"
          >
            {state.total}
          </p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-3 text-center ring-1 ring-amber-200">
          <p className="text-xs font-extrabold text-amber-700">現在の数字</p>
          <p
            data-testid="repeat-current"
            aria-live="polite"
            className="mt-1 font-mono text-4xl font-black text-amber-950"
          >
            {state.current}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={complete}
        className="mt-4 min-h-11 w-full rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-40"
      >
        現在の数字を足す
      </button>

      {complete ? (
        <p
          aria-live="polite"
          className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold leading-relaxed text-emerald-800 ring-1 ring-emerald-200"
        >
          <span className="block">1 + 2 + 3 + 4 + 5 = 15。</span>
          <span className="mt-1 block">
            同じ処理を何度も行うことを繰り返しと呼ぶ
          </span>
        </p>
      ) : null}
    </div>
  );
}

type FlowchartStepProps = {
  flowIndex: number;
  isModalOpen: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onOpenModal: () => void;
  onCloseModal: () => void;
};

const FLOW_KIND_LABELS = {
  terminal: "開始・終了",
  process: "処理",
  decision: "確認",
  output: "表示",
} as const;

function FlowNode({
  action,
  active,
}: {
  action: (typeof FLOW_ACTIONS)[number];
  active: boolean;
}) {
  const shape =
    action.kind === "terminal"
      ? "rounded-full"
      : action.kind === "decision"
        ? "rounded-[1.5rem] border-2 border-amber-300"
        : action.kind === "output"
          ? "skew-x-[-6deg] rounded-lg"
          : "rounded-lg";

  return (
    <div
      className={`mx-auto w-full max-w-64 px-3 py-2.5 text-center ring-1 ${shape} ${
        active
          ? "bg-indigo-600 text-white ring-indigo-600"
          : "bg-white text-gray-800 ring-gray-200"
      }`}
    >
      <span className="block text-[10px] font-bold opacity-70">
        {FLOW_KIND_LABELS[action.kind]}
      </span>
      <span className="block text-sm font-extrabold">{action.label}</span>
    </div>
  );
}

export function FlowchartStep({
  flowIndex,
  isModalOpen,
  onPrevious,
  onNext,
  onOpenModal,
  onCloseModal,
}: FlowchartStepProps) {
  const firstIndex = Math.max(0, flowIndex - 1);
  const lastIndex = Math.min(FLOW_ACTIONS.length, flowIndex + 2);
  const visibleActions = FLOW_ACTIONS.slice(firstIndex, lastIndex);

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onCloseModal();
  }

  return (
    <div>
      <p className="text-sm leading-relaxed text-gray-600">
        手順を箱と矢印でつないだ図がフローチャートです。まずは今いる場所の前後だけを見て進めます。
      </p>

      <ol
        data-testid="flow-window"
        className="mt-4 space-y-1.5 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"
        aria-label="現在位置の前後の処理"
      >
        {visibleActions.map((action, offset) => {
          const absoluteIndex = firstIndex + offset;
          const relation =
            absoluteIndex === flowIndex
              ? "現在"
              : absoluteIndex < flowIndex
                ? "前"
                : "次";
          return (
            <li key={action.label}>
              {offset > 0 ? (
                <div aria-hidden className="py-0.5 text-center text-gray-300">
                  ↓
                </div>
              ) : null}
              <p
                className={`mb-1 text-center text-[11px] font-black ${
                  relation === "現在" ? "text-indigo-600" : "text-gray-400"
                }`}
              >
                {relation}
              </p>
              <FlowNode action={action} active={absoluteIndex === flowIndex} />
            </li>
          );
        })}
      </ol>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={flowIndex === 0}
          className="min-h-10 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 disabled:opacity-35"
        >
          処理を戻す
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={flowIndex === FLOW_ACTIONS.length - 1}
          className="min-h-10 rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-bold text-indigo-700 disabled:opacity-35"
        >
          処理を進める
        </button>
      </div>
      <button
        type="button"
        onClick={onOpenModal}
        className="mt-2 min-h-10 w-full rounded-xl text-sm font-bold text-indigo-700 underline decoration-indigo-200 underline-offset-4"
      >
        全体図を見る
      </button>

      {isModalOpen
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="algorithm-flow-dialog-title"
              onClick={handleBackdropClick}
              className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4"
            >
              <div className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-indigo-600">
                      1〜5を足す手順
                    </p>
                    <h4
                      id="algorithm-flow-dialog-title"
                      className="mt-1 text-lg font-extrabold text-gray-900"
                    >
                      フローチャート全体図
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={onCloseModal}
                    aria-label="全体図を閉じる"
                    className="grid h-10 w-10 place-items-center rounded-full bg-gray-100 text-lg font-bold text-gray-600"
                  >
                    ×
                  </button>
                </div>
                <ol className="mt-4 space-y-1" aria-label="すべての処理">
                  {FLOW_ACTIONS.map((action, index) => (
                    <li key={action.label}>
                      {index > 0 ? (
                        <div aria-hidden className="text-center text-gray-300">
                          ↓
                        </div>
                      ) : null}
                      <FlowNode action={action} active={index === flowIndex} />
                    </li>
                  ))}
                </ol>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

type ExamExpressionStepProps = {
  questionIndex: number;
  answers: (string | null)[];
  onAnswer: (answer: string) => void;
  onNextQuestion: () => void;
};

export function ExamExpressionStep({
  questionIndex,
  answers,
  onAnswer,
  onNextQuestion,
}: ExamExpressionStepProps) {
  const question = MINI_QUESTIONS[questionIndex];
  const selected = answers[questionIndex] ?? null;
  const answered = selected !== null;
  const finished =
    questionIndex === MINI_QUESTIONS.length - 1 && answered;
  const correctCount = answers.reduce(
    (total, answer, index) =>
      total + (answer === MINI_QUESTIONS[index]?.correct ? 1 : 0),
    0,
  );

  return (
    <div>
      <p className="text-sm leading-relaxed text-gray-600">
        ここまで使った言葉を、試験に出る書き方へ置き換えてみましょう。
      </p>

      <dl className="mt-3 space-y-2">
        {FORMAL_MAPPINGS.map((mapping) => (
          <div
            key={mapping.formal}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200"
          >
            <dt className="text-xs font-bold leading-relaxed text-gray-700">
              {mapping.beginner}
            </dt>
            <dd className="flex items-center gap-2">
              <span aria-hidden className="text-xs font-black text-indigo-400">
                ⇔
              </span>
              <code className="rounded-lg bg-gray-900 px-2.5 py-1.5 font-mono text-xs font-bold text-white">
                {mapping.formal}
              </code>
            </dd>
          </div>
        ))}
      </dl>

      {!finished ? (
        <section className="mt-4 rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-200">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-extrabold text-indigo-950">ミニ確認</h4>
            <span className="text-xs font-bold text-indigo-600">
              {questionIndex + 1} / {MINI_QUESTIONS.length}
            </span>
          </div>
          <p className="mt-2 text-sm font-bold leading-relaxed text-gray-900">
            {question.prompt}
          </p>
          <div className="mt-3 grid gap-2">
            {question.choices.map((choice) => {
              const picked = selected === choice;
              const correct = choice === question.correct;
              const tone = !answered
                ? "bg-white text-gray-800 ring-gray-200"
                : picked
                  ? correct
                    ? "bg-emerald-600 text-white ring-emerald-600"
                    : "bg-rose-500 text-white ring-rose-500"
                  : correct
                    ? "bg-white text-emerald-800 ring-emerald-400"
                    : "bg-white text-gray-400 ring-gray-100";
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => onAnswer(choice)}
                  disabled={answered}
                  className={`min-h-11 rounded-xl px-3 text-left text-sm font-bold ring-1 transition disabled:opacity-100 ${tone}`}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          {answered ? (
            <div
              aria-live="polite"
              className={`mt-3 rounded-xl px-3 py-2.5 text-xs font-semibold leading-relaxed ${
                selected === question.correct
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-amber-100 text-amber-950"
              }`}
            >
              <p className="font-extrabold">
                {selected === question.correct ? "正解！" : "意味を確認しよう"}
              </p>
              <p className="mt-1">{question.explanation}</p>
            </div>
          ) : null}

          {answered && !finished ? (
            <button
              type="button"
              onClick={onNextQuestion}
              className="mt-3 min-h-10 w-full rounded-xl bg-indigo-600 text-sm font-bold text-white"
            >
              次のミニ問題
            </button>
          ) : null}
        </section>
      ) : null}

      {finished ? (
        <div
          aria-live="polite"
          className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200"
        >
          <p className="text-xl" aria-hidden>
            🎉
          </p>
          <p className="mt-1 text-sm font-extrabold text-emerald-900">
            日常の手順から試験の表現までつながりました
          </p>
          <p className="mt-1 text-xs font-bold text-emerald-700">
            {MINI_QUESTIONS.length}問中 {correctCount}問正解
          </p>
          <p className="mt-2 text-xs leading-relaxed text-emerald-800">
            この下の確認問題で、レッスンの理解を記録しましょう。
          </p>
        </div>
      ) : null}
    </div>
  );
}
