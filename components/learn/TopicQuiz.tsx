"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChoiceKey, UserAnswer } from "@/types";
import type { CheckQuestion } from "@/types/content";
import ChoiceButton from "@/components/ChoiceButton";

// トピックの確認問題を順に解き、結果(UserAnswer[])を onComplete で親へ返す。
// /today・/review の「解いて進める」体験に使う(表示専用の CheckQuestionCard とは別物)。
// 正解するたびに小さな達成感が返るよう、ポップ表示・ほめ言葉・連続正解・積み上がりバーで報酬感を出す。

const KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

// 正解した瞬間に返す短いほめ言葉(学習から気をそらさない範囲で表情をつける)。
const PRAISES = ["ナイス！", "その調子！", "正解！", "いいね！", "バッチリ！", "完璧！"];

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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TopicQuiz({
  topicId,
  questions,
  onComplete,
  completeLabel = "完了する",
  dense = false,
  timeLimitSeconds,
}: {
  topicId: string;
  questions: CheckQuestion[];
  onComplete: (answers: UserAnswer[]) => void;
  completeLabel?: string;
  dense?: boolean; // 選択肢の縦幅を詰める(/today)
  timeLimitSeconds?: number; // 指定時のみ制限時間を有効化（確認パック用）
}) {
  const shuffled = useMemo(
    () => new Map(questions.map((q) => [q.id, shuffle(q)] as const)),
    [questions],
  );
  const [selections, setSelections] = useState<Record<string, ChoiceKey>>({});
  const [order, setOrder] = useState<string[]>([]); // 回答した順(連続正解の判定に使う)
  const [done, setDone] = useState(false);
  const timeLimited = typeof timeLimitSeconds === "number" && timeLimitSeconds > 0;
  const [timeLeft, setTimeLeft] = useState<number | null>(
    timeLimited ? timeLimitSeconds : null,
  );
  const timeLimitReached = timeLimited && timeLeft === 0;

  const total = questions.length;
  const allAnswered = questions.every((q) => selections[q.id] !== undefined);

  const isCorrectOf = (qId: string) => selections[qId] === shuffled.get(qId)?.correct;
  const correctCount = order.reduce((n, qId) => n + (isCorrectOf(qId) ? 1 : 0), 0);

  // 回答した順に「直近までの連続正解数」を各問へ割り当てる(その問の報酬表示に使う)。
  const streakAt = useMemo(() => {
    const map = new Map<string, number>();
    let run = 0;
    for (const qId of order) {
      run = selections[qId] === shuffled.get(qId)?.correct ? run + 1 : 0;
      map.set(qId, run);
    }
    return map;
    // selections/order が変わるたび再計算
  }, [order, selections, shuffled]);

  function select(qId: string, key: ChoiceKey) {
    if (done || timeLimitReached) return;
    if (selections[qId] !== undefined) return; // 二重回答防止
    setSelections((s) => ({ ...s, [qId]: key }));
    setOrder((o) => (o.includes(qId) ? o : [...o, qId]));
  }

  const finish = useCallback(() => {
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
  }, [done, onComplete, questions, selections, shuffled, topicId]);

  useEffect(() => {
    if (!timeLimited || done || timeLeft === null) return;
    if (timeLeft <= 0) {
      finish();
      return;
    }
    const timer = window.setTimeout(() => {
      setTimeLeft((current) => {
        if (current === null) return null;
        return Math.max(current - 1, 0);
      });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [done, finish, timeLeft, timeLimited]);

  const timeRatio =
    timeLimited && timeLeft !== null && timeLimitSeconds
      ? Math.max(0, Math.min(100, (timeLeft / timeLimitSeconds) * 100))
      : 0;
  const isTimeLow = timeLimited && timeLeft !== null && timeLeft <= 10;

  return (
    <div className="space-y-4">
      {/* 積み上がりバー: 1問ずつ点灯し、正解が貯まっていくのを可視化する */}
      <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500">解いて進もう</span>
          <span className="text-xs font-bold text-gray-700">
            正解{" "}
            <span
              key={correctCount}
              className="inline-block animate-pop-in text-base font-extrabold text-green-600"
            >
              {correctCount}
            </span>
            <span className="text-gray-400"> / {total}</span>
          </span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {questions.map((q) => {
            const answered = selections[q.id] !== undefined;
            const ok = isCorrectOf(q.id);
            return (
              <div
                key={q.id}
                className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                  !answered
                    ? "bg-gray-200"
                    : ok
                      ? "bg-green-500"
                      : "bg-amber-400"
                }`}
              />
            );
          })}
        </div>
        {timeLimited && timeLeft !== null && (
          <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className={isTimeLow ? "text-rose-600" : "text-gray-500"}>
                ⏱ 制限時間
              </span>
              <span className={isTimeLow ? "text-rose-600" : "text-gray-700"}>
                残り {formatTime(timeLeft)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isTimeLow ? "bg-rose-500" : "bg-indigo-500"
                }`}
                style={{ width: `${timeRatio}%` }}
              />
            </div>
            {isTimeLow && !done && (
              <p className="mt-1 text-[11px] font-bold text-rose-600">
                時間が少なくなっています。分かる問題から回答してください。
              </p>
            )}
          </div>
        )}
      </div>

      {questions.map((q, i) => {
        const sh = shuffled.get(q.id)!;
        const sel = selections[q.id] ?? null;
        const revealed = sel !== null;
        const isCorrect = sel === sh.correct;
        const streak = streakAt.get(q.id) ?? 0;
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
                  disabled={revealed || done || timeLimitReached}
                  isSelected={sel === c.key}
                  isCorrect={c.key === sh.correct}
                  revealed={revealed}
                  dense={dense}
                />
              ))}
            </div>
            {revealed && (
              <div
                className={`mt-4 animate-pop-in rounded-2xl p-4 ${
                  isCorrect
                    ? "bg-green-50 ring-1 ring-green-200"
                    : "bg-amber-50 ring-1 ring-amber-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isCorrect ? (
                    <>
                      <span className="inline-block animate-pop-in text-xl" aria-hidden>
                        🎉
                      </span>
                      <p className="text-sm font-extrabold text-green-700">
                        {PRAISES[i % PRAISES.length]}
                      </p>
                      {streak >= 2 && (
                        <span className="ml-auto inline-block animate-pop-in rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600">
                          🔥 {streak}連続正解
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-extrabold text-amber-700">
                      🌱 正解は「{sh.correct}」
                    </p>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* 全問そろったら、完了して進む流れを後押しする一言を出す */}
      {allAnswered && !done && (
        <p className="animate-pop-in text-center text-sm font-bold text-green-700">
          {correctCount === total
            ? `全問正解！🎯 この勢いで完了しよう`
            : `${total}問クリア！ あと一押しで完了`}
        </p>
      )}

      {timeLimitReached && !done && (
        <p className="animate-pop-in text-center text-sm font-bold text-rose-600">
          時間切れです。ここまでの回答で保存します。
        </p>
      )}

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
