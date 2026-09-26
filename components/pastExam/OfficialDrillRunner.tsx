"use client";

// 公式過去問の部分演習（分野別・混合・ランダム・誤答の解き直し）。練習モードだけ。
//
// 年度別100問（PastExamRunner）と同じ部品・同じ保存経路を使う:
//   - 表示        … PastExamQuestionCard（1問ずつ、回答後に正誤と独自解説）
//   - 回答の保存  … saveSingleAttempt（question_attempts に official_past として保存
//                   → Exam Readiness の公式過去問エビデンスになる）
//   - 採点        … gradePastExam
//   - 学習ループ  … recordPastExamLearningResult（Topic Mastery・誤答トピックを復習キューへ）
// 途中再開・本番モード（120分通し）は年度別100問の役割なので、ここでは持たない。

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ChoiceKey, QuestionExposureMap } from "@/types";
import type { PastExamAnswer, PastExamResult } from "@/types/pastExam";
import { FIELD_LABELS } from "@/types/content";
import type { PastExamQuestionView } from "@/lib/pastExam/questionView";
import type { DrillSelectionStage } from "@/lib/pastExam/drillSelection";
import { gradePastExam, recordPastExamLearningResult } from "@/lib/pastExam/scoring";
import { saveSingleAttempt } from "@/lib/pastExam/saveAttempts";
import { getUnknownQuestionExposureStates } from "@/lib/questionExposure";
import { applyDailyQuestProgress, maxComboOf } from "@/lib/dailyQuests";
import { loadAppState, saveAppState } from "@/lib/storage";
import { createAssessmentSessionId, getUserId, saveProgressToDb } from "@/lib/userSession";
import { markTodayActivityDone } from "@/lib/todayActivityLog";
import { getLessonHref } from "@/lib/learningCatalog";
import { getTopic } from "@/lib/content";
import PastExamQuestionCard from "@/components/pastExam/PastExamQuestionCard";
import Button, { buttonClass } from "@/components/ui/Button";

type Props = {
  stage: DrillSelectionStage;
  title: string;
  questions: PastExamQuestionView[];
  todayTaskId: string | null;
};

export default function OfficialDrillRunner({ stage, title, questions, todayTaskId }: Props) {
  // 年度をまたいで問番号が重なるので、演習内の通し番号（1〜N）で回答を持つ。
  // 出典表記（attribution）は元の年度・問番号のまま表示される。
  const drillQuestions = useMemo(
    () => questions.map((q, i) => ({ ...q, questionNumber: i + 1 })),
    [questions],
  );
  const [sessionId] = useState(() => createAssessmentSessionId());
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, PastExamAnswer>>({});
  const [result, setResult] = useState<PastExamResult | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const exposuresRef = useRef<QuestionExposureMap>(
    getUnknownQuestionExposureStates(questions.map((q) => q.id)),
  );
  const enteredAtRef = useRef<number>(0);
  const finishedRef = useRef(false);
  // 1問ごとの所要時間の基準。問題を切り替えたら測り直す。
  useEffect(() => {
    enteredAtRef.current = Date.now();
  }, [index]);

  if (drillQuestions.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-600">出題できる問題が見つかりませんでした。</p>
        <Link href="/past-exams" className={buttonClass("secondary", "md", "mt-4")}>
          公式過去問トップへ
        </Link>
      </div>
    );
  }

  if (result) {
    return (
      <DrillResult
        result={result}
        title={title}
        stage={stage}
        unsaved={unsaved}
        fromToday={todayTaskId !== null}
      />
    );
  }

  const question = drillQuestions[index];
  const answer = answers[question.questionNumber];
  const selected = answer?.selected ?? null;
  const isLast = index === drillQuestions.length - 1;

  const handleSelect = (key: ChoiceKey) => {
    // 練習モードは最初の回答で確定する（正答を見てから選び直せないように）。
    if (selected !== null) return;
    const now = Date.now();
    const spent = enteredAtRef.current > 0 ? Math.round((now - enteredAtRef.current) / 1000) : 0;
    const next: PastExamAnswer = {
      selected: key,
      answeredAt: new Date(now).toISOString(),
      timeSpentSeconds: Math.max(0, spent),
    };
    setAnswers((prev) => ({ ...prev, [question.questionNumber]: next }));
    if (!getUserId()) return; // 未ログインは端末の学習記録だけ（評価の根拠にはならない）
    void saveSingleAttempt({
      question: { ...question, questionNumber: questions[index].questionNumber },
      answer: next,
      mode: "practice",
      sessionId,
      anonymousAnswers: [],
    })
      .then((saved) => {
        const exposure = saved.exposures[question.id];
        if (exposure) exposuresRef.current = { ...exposuresRef.current, [question.id]: exposure };
      })
      .catch(() => setUnsaved(true));
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const completedAt = new Date();
    const graded = gradePastExam({
      sessionId,
      year: 0,
      mode: "practice",
      questions: drillQuestions,
      answers,
    });
    const state = loadAppState();
    if (state) {
      // 誤答トピックは learningLoop 経由で翌日の復習（Review Queue）に入る。
      const recorded = recordPastExamLearningResult(
        state,
        graded,
        answers,
        exposuresRef.current,
        completedAt,
      );
      const sessionAnswers = recorded.answers.slice(state.answers.length);
      const next = applyDailyQuestProgress(recorded, {
        kind: "past_exam",
        correct: graded.correct,
        total: graded.total,
        isReview: false,
        maxCombo: maxComboOf(sessionAnswers),
      }, completedAt);
      saveAppState(next);
      const userId = getUserId();
      if (userId) saveProgressToDb(userId, next.progress);
    }
    markTodayActivityDone(todayTaskId);
    setResult(graded);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${(Object.keys(answers).length / drillQuestions.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-gray-500">
          {index + 1} / {drillQuestions.length}
        </span>
      </div>

      <PastExamQuestionCard
        key={question.id}
        question={question}
        index={index}
        total={drillQuestions.length}
        selected={selected}
        onSelect={handleSelect}
        revealAnswer={selected !== null}
        disabled={selected !== null}
      />

      {selected !== null && (
        <Button
          className="w-full"
          onClick={() => {
            if (isLast) {
              finish();
              return;
            }
            setIndex((i) => i + 1);
          }}
        >
          {isLast ? "結果を見る" : "次の問題へ"}
        </Button>
      )}
    </div>
  );
}

function DrillResult({
  result,
  title,
  stage,
  unsaved,
  fromToday,
}: {
  result: PastExamResult;
  title: string;
  stage: DrillSelectionStage;
  unsaved: boolean;
  fromToday: boolean;
}) {
  const wrongTopics = [
    ...new Set(result.questions.filter((q) => !q.isCorrect).map((q) => q.topicId)),
  ].flatMap((topicId) => {
    const topic = getTopic(topicId);
    return topic ? [topic] : [];
  });

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-500">{title} の結果</h2>
        <p className="mt-1.5">
          <span className="text-3xl font-bold tabular-nums text-gray-900">{result.correct}</span>
          <span className="text-lg font-semibold text-gray-500"> / {result.total}</span>
          <span className="ml-3 text-lg font-bold tabular-nums text-brand-600">{result.rate}%</span>
        </p>
        <div className="mt-3 space-y-1.5">
          {result.byField.filter((field) => field.total > 0).map((field) => (
            <p key={field.field} className="flex justify-between text-xs text-gray-600">
              <span>{FIELD_LABELS[field.field]}</span>
              <span className="tabular-nums">
                {field.correct} / {field.total} 問（{field.rate}%）
              </span>
            </p>
          ))}
        </div>
        {unsaved && (
          <p className="mt-3 rounded-lg bg-accent-50 p-3 text-xs leading-relaxed text-accent-800">
            一部の回答をサーバーに保存できませんでした。この端末の学習記録には反映しています。
          </p>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-bold text-gray-900">
          {wrongTopics.length > 0 ? "間違えた問題のテーマ" : "全問正解です"}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          {wrongTopics.length > 0
            ? stage === "retry-wrong"
              ? "まだ取り返せていない問題は、また後日の解き直しに出ます。テーマの復習も明日の学習に入ります。"
              : "間違えた問題のテーマは復習に入り、明日以降の「今日の学習」に出ます。問題そのものも翌日以降に解き直せます。"
            : "この調子で続けましょう。"}
        </p>
        {wrongTopics.length > 0 && (
          <ul className="mt-3 space-y-2">
            {wrongTopics.map((topic) => (
              <li key={topic.id}>
                <Link
                  href={getLessonHref(topic.id, { activity: "review", anchor: "lesson-content" })}
                  className="text-sm font-medium text-brand-700 underline decoration-brand-200 underline-offset-2"
                >
                  {topic.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {fromToday && (
          <Link href="/today" className={buttonClass("primary")}>
            今日の学習に戻る
          </Link>
        )}
        <Link href="/past-exams" className={buttonClass("secondary")}>
          公式過去問トップへ
        </Link>
      </div>
    </div>
  );
}
