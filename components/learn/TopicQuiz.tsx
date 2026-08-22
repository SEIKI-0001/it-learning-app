"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChoiceKey, UserAnswer } from "@/types";
import type { CheckQuestion } from "@/types/content";
import ChoiceButton from "@/components/ChoiceButton";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { emitMochitEvent } from "@/components/mochit/mochitEventBus";
import OfficialQuestionSource from "@/components/questions/OfficialQuestionSource";
import QuestionFigures from "@/components/questions/QuestionFigures";

// トピックの確認問題を順に解き、結果(UserAnswer[])を onComplete で親へ返す。
// /today・/review の「解いて進める」体験に使う(表示専用の CheckQuestionCard とは別物)。
// 正解するたびに小さな達成感が返るよう、ポップ表示・ほめ言葉・コンボ・積み上がりバーで報酬感を出す。

import { XP_PER_COMBO } from "@/lib/study";

const KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

// 正解した瞬間に返す短いほめ言葉(学習から気をそらさない範囲で表情をつける)。
const PRAISES = ["ナイス！", "その調子！", "正解！", "いいね！", "バッチリ！", "完璧！"];

// コンボ数に応じて熱量が上がる配色（橙 → 赤 → 紫）。
function comboPillClass(run: number): string {
  if (run >= 5) return "bg-accent-600 text-white";
  if (run >= 3) return "bg-accent-100 text-accent-800 ring-1 ring-accent-200";
  return "bg-accent-50 text-accent-700 ring-1 ring-accent-200";
}

type Shuffled = {
  choices: { key: ChoiceKey; text: string; sourceKey: ChoiceKey }[];
  correct: ChoiceKey;
};

/** 正解テキストを保ったまま並び替え、キーを位置順に振り直す(マウント時に1度)。 */
function shuffle(q: CheckQuestion): Shuffled {
  const originalChoices = [...q.choices];
  for (let i = originalChoices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [originalChoices[i], originalChoices[j]] = [originalChoices[j], originalChoices[i]];
  }
  const choices = originalChoices.map((choice, i) => ({
    key: KEYS[i],
    text: choice.text,
    sourceKey: choice.key,
  }));
  const correct = choices.find((c) => c.sourceKey === q.correctChoice)?.key ?? q.correctChoice;
  return { choices, correct };
}

/** 並び替えずにそのまま出す(公式問題)。以降の処理を同じ形で扱えるよう Shuffled に揃える。 */
function keepOrder(q: CheckQuestion): Shuffled {
  return {
    choices: q.choices.map((choice) => ({
      key: choice.key,
      text: choice.text,
      sourceKey: choice.key,
    })),
    correct: q.correctChoice,
  };
}

/**
 * 出題する選択肢を決める。
 *
 * 既定はシャッフル(従来どおり)。shuffleChoices: false のときだけ並びを保つ。
 * 公式問題は公式の選択肢順そのものが出題の一部で、並び替えると
 * 「原文どおりに出題している」という出典表示が事実と食い違うため。
 */
function prepareChoices(q: CheckQuestion): Shuffled {
  return q.shuffleChoices === false ? keepOrder(q) : shuffle(q);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TopicQuiz({
  topicId,
  topicIdForQuestion,
  questions,
  onComplete,
  completeLabel = "完了する",
  dense = false,
  timeLimitSeconds,
  xpPerCorrect,
}: {
  topicId: string;
  /** 複数トピックを扱う試験では、設問ごとの復習先を指定する。 */
  topicIdForQuestion?: (question: CheckQuestion) => string;
  questions: CheckQuestion[];
  onComplete: (answers: UserAnswer[]) => void | Promise<void>;
  completeLabel?: string;
  dense?: boolean; // 選択肢の縦幅を詰める(/today)
  timeLimitSeconds?: number; // 指定時のみ制限時間を有効化（確認パック用）
  /** 正解1問あたりのXP。XPが付く画面(/today等)だけ渡す(確認パックでは付かないので渡さない) */
  xpPerCorrect?: number;
}) {
  const shuffled = useMemo(
    () => new Map(questions.map((q) => [q.id, prepareChoices(q)] as const)),
    [questions],
  );
  const [selections, setSelections] = useState<Record<string, ChoiceKey>>({});
  const answeredQuestionIdsRef = useRef(new Set<string>());
  const [order, setOrder] = useState<string[]>([]); // 回答した順(連続正解の判定に使う)
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const finishedRef = useRef(false);
  const pendingAnswersRef = useRef<UserAnswer[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0); // 1問ずつ表示する(下スクロールさせない)
  const timeLimited = typeof timeLimitSeconds === "number" && timeLimitSeconds > 0;
  const [timeLeft, setTimeLeft] = useState<number | null>(
    timeLimited ? timeLimitSeconds : null,
  );
  const timeLimitReached = timeLimited && timeLeft === 0;

  const total = questions.length;
  const allAnswered = questions.every((q) => selections[q.id] !== undefined);
  const currentQuestion = questions[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;

  const isCorrectOf = (qId: string) => selections[qId] === shuffled.get(qId)?.correct;
  const correctCount = order.reduce((n, qId) => n + (isCorrectOf(qId) ? 1 : 0), 0);
  // いまの連続正解数（直近の回答時点）。ヘッダーのコンボ表示に使う。
  const lastAnswered = order[order.length - 1];

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
    if (done || submitting || timeLimitReached) return;
    if (
      selections[qId] !== undefined ||
      answeredQuestionIdsRef.current.has(qId)
    ) {
      return;
    }
    answeredQuestionIdsRef.current.add(qId);
    emitMochitEvent(key === shuffled.get(qId)?.correct ? "correct" : "incorrect");
    setSelections((s) => ({ ...s, [qId]: key }));
    setOrder((o) => (o.includes(qId) ? o : [...o, qId]));
  }

  function goNext() {
    setCurrentIndex((i) => Math.min(i + 1, total - 1));
  }

  function goPrev() {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }

  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSubmitting(true);
    const answers = pendingAnswersRef.current ?? questions.map((q) => {
      const answeredAt = new Date().toISOString();
      const sh = shuffled.get(q.id)!;
      const sel = selections[q.id];
      return {
        questionId: q.id,
        selectedChoice: sel,
        isCorrect: sel === sh.correct,
        answeredAt,
        tag: q.id, // 呼び出し側でトピックのタグに上書きしてもよい
        topicId: topicIdForQuestion?.(q) ?? topicId,
      };
    });
    pendingAnswersRef.current = answers;
    try {
      await onComplete(answers);
      pendingAnswersRef.current = null;
      setDone(true);
    } catch {
      // The parent renders the persistence error. Re-open this exact submission so the
      // same immutable assessment session can be completed on retry.
      finishedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [onComplete, questions, selections, shuffled, topicId, topicIdForQuestion]);

  useEffect(() => {
    if (!timeLimited || done || timeLeft === null) return;
    if (timeLeft <= 0) {
      // タイマー（外部システム）起因の自動締め切り。意図的に effect 内で確定する。
      const timer = window.setTimeout(() => void finish(), 0);
      return () => window.clearTimeout(timer);
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

  const currentSelection = selections[currentQuestion.id] ?? null;
  const currentRevealed = currentSelection !== null;
  const showNav = currentRevealed || done || timeLimitReached;

  return (
    <div className="space-y-4">
      {/* 進捗表示: 下スクロールではなく「1/4」のように現在位置を示す */}
      <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500">
            問題 {currentIndex + 1} / {total}
          </span>
          <span className="flex items-center gap-2">
            {(() => {
              const combo = lastAnswered ? (streakAt.get(lastAnswered) ?? 0) : 0;
              if (combo < 2 || done) return null;
              return (
                <span
                  key={combo}
                  className={`inline-block animate-pop-in rounded-full px-2 py-0.5 text-xs font-bold ${comboPillClass(combo)}`}
                >
                  {combo}コンボ
                </span>
              );
            })()}
            <span className="text-xs font-bold text-gray-700">
              正解{" "}
              <span
                key={correctCount}
                className="inline-block animate-pop-in text-base font-bold text-green-600"
              >
                {correctCount}
              </span>
              <span className="text-gray-400"> / {total}</span>
            </span>
          </span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {questions.map((q, i) => {
            const answered = selections[q.id] !== undefined;
            const ok = isCorrectOf(q.id);
            return (
              <div
                key={q.id}
                className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                  i === currentIndex
                    ? "ring-2 ring-brand-400 ring-offset-1"
                    : ""
                } ${
                  !answered
                    ? "bg-gray-200"
                    : ok
                      ? "bg-emerald-500"
                      : "bg-rose-500"
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
                  isTimeLow ? "bg-rose-500" : "bg-brand-500"
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

      {(() => {
        const q = currentQuestion;
        const sh = shuffled.get(q.id)!;
        const sel = currentSelection;
        const revealed = currentRevealed;
        const isCorrect = sel === sh.correct;
        const selectedChoice = sh.choices.find((choice) => choice.key === sel);
        const selectedChoiceExplanation =
          !isCorrect && selectedChoice
            ? q.choiceExplanations?.[selectedChoice.sourceKey]
            : undefined;
        const streak = streakAt.get(q.id) ?? 0;
        return (
          <div
            key={q.id}
            className={`rounded-xl border border-gray-200 bg-white ${dense ? "p-3" : "p-4"}${
              revealed && isCorrect && streak >= 5 ? " animate-glow-ring" : ""
            }`}
          >
            {q.official && (
              <p className="mb-2 text-xs font-semibold text-brand-600">
                {q.official.year}年度 公開問題 問{q.official.questionNumber}
              </p>
            )}
            <p className={`text-sm font-bold text-gray-800 ${dense ? "mb-2" : "mb-3"}`}>
              Q{currentIndex + 1}. {q.prompt}
            </p>
            {/* 図表は問題文と選択肢の間に出す(公式問題冊子と同じ並び)。 */}
            {q.figures && q.figures.length > 0 && (
              <QuestionFigures
                figures={q.figures}
                className={dense ? "mb-2" : "mb-3"}
              />
            )}
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
                className={`mt-4 animate-pop-in rounded-xl p-4 ${
                  isCorrect
                    ? "bg-emerald-50 ring-1 ring-emerald-200"
                    : "bg-rose-50 ring-1 ring-rose-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isCorrect ? (
                    <>
                      <Icon
                        name="circle-check"
                        className="inline-block h-5 w-5 shrink-0 animate-pop-in text-emerald-600"
                      />
                      <p className="text-sm font-semibold text-emerald-700">
                        {PRAISES[currentIndex % PRAISES.length]}
                      </p>
                      {xpPerCorrect !== undefined && (
                        <span
                          className="animate-float-up text-sm font-bold text-brand-500"
                          aria-hidden
                        >
                          +{xpPerCorrect} XP
                        </span>
                      )}
                      {streak >= 2 && (
                        <span
                          className={`ml-auto inline-block animate-pop-in rounded-full px-2 py-0.5 text-xs font-bold ${comboPillClass(streak)}`}
                        >
                          {streak}コンボ
                          {xpPerCorrect !== undefined && streak >= 3
                            ? ` +${XP_PER_COMBO}XP`
                            : ""}
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-700">
                      <Icon name="x" className="h-4 w-4 shrink-0" />
                      正解は「{sh.correct}」
                    </p>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
                  {q.explanation}
                </p>
                {selectedChoiceExplanation && (
                  <p className="mt-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm leading-relaxed text-rose-800">
                    選んだ選択肢が違う理由：{selectedChoiceExplanation}
                  </p>
                )}
              </div>
            )}
            {/*
              公式問題は出典表示を省略しない。カード内側の余白を打ち消して、
              カード下端に接した帯として出す(年度別演習のカードと同じ見え方)。
            */}
            {q.official && (
              <div
                className={`overflow-hidden rounded-b-xl ${
                  dense ? "-mx-3 -mb-3 mt-3" : "-mx-4 -mb-4 mt-4"
                }`}
              >
                <OfficialQuestionSource official={q.official} />
              </div>
            )}
          </div>
        );
      })()}

      {/* 全問そろったら、完了して進む流れを後押しする一言を出す */}
      {isLast && allAnswered && !done && (
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

      {/* 解答すると下に「次へ」「前へ」が現れる。次へで次の問題を表示する */}
      {showNav && (
        <div className="flex gap-3">
          {!isFirst && (
            <button
              type="button"
              onClick={goPrev}
              disabled={done}
              className={buttonClass("soft", "lg", "flex-1")}
            >
              <Icon name="chevron-left" className="h-4 w-4" />
              前へ
            </button>
          )}
          {isLast ? (
            <button
              type="button"
              onClick={() => void finish()}
              disabled={(!allAnswered && !timeLimitReached) || done || submitting}
              className={buttonClass("primary", "lg", "flex-1 disabled:bg-gray-300")}
            >
              {done
                ? "保存しました"
                : submitting
                  ? "保存中…"
                  : allAnswered || timeLimitReached
                    ? completeLabel
                    : "すべて答えると完了できます"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className={buttonClass("primary", "lg", "flex-1")}
            >
              次へ
              <Icon name="chevron-right" className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
