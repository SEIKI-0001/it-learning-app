import {
  COMPUTER_ACTIONS,
  NOODLE_ACTIONS,
  isCorrectNoodleOrder,
  type NoodleActionId,
} from "./learningModel";

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
