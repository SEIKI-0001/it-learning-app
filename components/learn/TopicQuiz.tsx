"use client";

import { useMemo, useState } from "react";
import type { ChoiceKey, UserAnswer } from "@/types";
import type { CheckQuestion } from "@/types/content";
import ChoiceButton from "@/components/ChoiceButton";

// トピックの確認問題を順に解き、結果(UserAnswer[])を onComplete で親へ返す。
// /today・/review の「解いて進める」体験に使う(表示専用の CheckQuestionCard とは別物)。

const KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

type Shuffled = { choices: { key: ChoiceKey; text: string }[]; correct: ChoiceKey };

/** 正解テキストを保ったまま並び替え、キーを位置順に振り直す(マウント時に1度)。 */
function shuffle(q: CheckQuestion): Shuffled {
  const correctText = q.choices.find((c) => c.key === q.correctChoice)?.text;
  const texts = q.choices.map((c) => c.text);
  for (let i = texts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [texts[i], texts[j]] = [texts[j], texts[i]];
  }
  const choices = texts.map((text, i) => ({ key: KEYS[i], text }));
  const correct = choices.find((c) => c.text === correctText)?.key ?? q.correctChoice;
  return { choices, correct };
}

export default function TopicQuiz({
  topicId,
  questions,
  onComplete,
  completeLabel = "完了する",
  dense = false,
}: {
  topicId: string;
  questions: CheckQuestion[];
  onComplete: (answers: UserAnswer[]) => void;
  completeLabel?: string;
  dense?: boolean; // 選択肢の縦幅を詰める(/today)
}) {
  const shuffled = useMemo(
    () => new Map(questions.map((q) => [q.id, shuffle(q)] as const)),
    [questions],
  );
  const [selections, setSelections] = useState<Record<string, ChoiceKey>>({});
  const [done, setDone] = useState(false);

  const allAnswered = questions.every((q) => selections[q.id] !== undefined);

  function select(qId: string, key: ChoiceKey) {
    if (selections[qId] !== undefined) return; // 二重回答防止
    setSelections((s) => ({ ...s, [qId]: key }));
  }

  function finish() {
    if (done) return;
    setDone(true);
    const now = new Date().toISOString();
    const answers: UserAnswer[] = questions.map((q) => {
      const sh = shuffled.get(q.id)!;
      const sel = selections[q.id];
      return {
        questionId: q.id,
        selectedChoice: sel,
        isCorrect: sel === sh.correct,
        answeredAt: now,
        tag: q.id, // 呼び出し側でトピックのタグに上書きしてもよい
        topicId,
      };
    });
    onComplete(answers);
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => {
        const sh = shuffled.get(q.id)!;
        const sel = selections[q.id] ?? null;
        const revealed = sel !== null;
        const isCorrect = sel === sh.correct;
        return (
          <div
            key={q.id}
            className={`rounded-2xl border border-gray-200 bg-white ${dense ? "p-3" : "p-4"}`}
          >
            <p className={`text-sm font-bold text-gray-800 ${dense ? "mb-2" : "mb-3"}`}>
              Q{i + 1}. {q.prompt}
            </p>
            <div className={dense ? "space-y-2" : "space-y-2.5"}>
              {sh.choices.map((c) => (
                <ChoiceButton
                  key={c.key}
                  choiceKey={c.key}
                  text={c.text}
                  onClick={() => select(q.id, c.key)}
                  disabled={revealed}
                  isSelected={sel === c.key}
                  isCorrect={c.key === sh.correct}
                  revealed={revealed}
                  dense={dense}
                />
              ))}
            </div>
            {revealed && (
              <div
                className={`mt-4 rounded-2xl p-4 ${
                  isCorrect ? "bg-green-50" : "bg-amber-50"
                }`}
              >
                <p
                  className={`mb-1 text-sm font-extrabold ${
                    isCorrect ? "text-green-700" : "text-amber-700"
                  }`}
                >
                  {isCorrect ? "🎉 正解！" : `🌱 正解は「${sh.correct}」`}
                </p>
                <p className="text-sm leading-relaxed text-gray-700">
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={finish}
        disabled={!allAnswered || done}
        className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98] disabled:bg-gray-300"
      >
        {done ? "保存しました" : allAnswered ? completeLabel : "すべて答えると完了できます"}
      </button>
    </div>
  );
}
