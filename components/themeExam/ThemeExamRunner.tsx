"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ChoiceKey } from "@/types";
import type { ThemeExamQuestionView, ThemeExamResult } from "@/types/themeExam";
import { gradeThemeExam } from "@/lib/themeExam";
import { getLessonHref } from "@/lib/learningCatalog";
import { getUserId, saveQuestionAttempts } from "@/lib/userSession";
import { buttonClass } from "@/components/ui/Button";
import Card from "@/components/ui/Card";

// テーマ別 高難易度試験の実施フロー（クライアント）。
//
// 確認パック（CheckPackRunner）との違い:
//   - 1問ごとに正誤を見せない。章を通して解ききってから採点する（本番に近い形）。
//   - 見直しのために前の問題へ戻れる。未回答のまま次へ進むこともできる。
//   - 結果画面では、誤答が多いトピックを復習先として上位から並べる。
//
// 採点はクライアントで完結する（lib/themeExam.ts の純関数を使う）。
// 保存に失敗しても、結果の表示と復習の導線は止めない。

type Props = {
  examId: string;
  themeSlug: string;
  themeTitle: string;
  passRate: number;
  questions: ThemeExamQuestionView[];
};

const CHOICE_LABEL: Record<ChoiceKey, string> = { A: "ア", B: "イ", C: "ウ", D: "エ" };

/** 選択肢の並びを問題ごとに1度だけ決める（表示のたびに変わらないようにする）。 */
function shuffledChoices(q: ThemeExamQuestionView) {
  const shuffled = [...q.choices];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function ThemeExamRunner({
  examId,
  themeSlug,
  themeTitle,
  passRate,
  questions,
}: Props) {
  const [phase, setPhase] = useState<"intro" | "running" | "result">("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, ChoiceKey | null>>({});
  const [result, setResult] = useState<ThemeExamResult | null>(null);

  // この演習1回を識別するID。question_attempts の attempt_group_id に使う。
  const sessionIdRef = useRef<string>("");
  const startedAtRef = useRef<number>(0);
  const questionStartedAtRef = useRef<number>(0);
  // 問題ごとに費やした秒数。戻って解き直した場合は累計する。
  const timeSpentRef = useRef<Record<number, number>>({});

  // 選択肢の並びは開始時に1度だけ決める。表示のたびに入れ替わると見直しができない。
  const order = useMemo(
    () => new Map(questions.map((q) => [q.questionNumber, shuffledChoices(q)])),
    [questions],
  );

  const current = questions[index];
  const answeredCount = Object.values(answers).filter((v) => v !== null).length;

  /** 現在の問題に費やした時間を積み上げてから、次の問題へ移る。 */
  const commitElapsed = useCallback(() => {
    if (questionStartedAtRef.current === 0) return;
    const seconds = Math.round((Date.now() - questionStartedAtRef.current) / 1000);
    const number = questions[index].questionNumber;
    timeSpentRef.current[number] = (timeSpentRef.current[number] ?? 0) + seconds;
    questionStartedAtRef.current = Date.now();
  }, [index, questions]);

  const start = () => {
    sessionIdRef.current = `theme-exam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    startedAtRef.current = Date.now();
    questionStartedAtRef.current = Date.now();
    setPhase("running");
  };

  const move = (to: number) => {
    commitElapsed();
    setIndex(Math.min(Math.max(to, 0), questions.length - 1));
  };

  const finish = () => {
    commitElapsed();
    const graded = gradeThemeExam({
      sessionId: sessionIdRef.current,
      themeSlug,
      questions,
      answers,
      passRate,
    });
    setResult(graded);
    setPhase("result");

    // 保存は fire-and-forget。失敗しても結果の表示は続ける。
    const userId = getUserId();
    if (userId) {
      const answeredAt = new Date().toISOString();
      saveQuestionAttempts(
        userId,
        graded.questions.map((r) => ({
          questionId: r.questionId,
          questionType: "theme_exam" as const,
          topicId: r.topicId,
          selectedAnswer: r.selected,
          isCorrect: r.isCorrect,
          timeSpentSeconds: timeSpentRef.current[r.questionNumber] ?? null,
          answeredAt,
        })),
      );
    }
  };

  const retry = () => {
    setAnswers({});
    setIndex(0);
    setResult(null);
    timeSpentRef.current = {};
    setPhase("intro");
  };

  // --- 開始前 ---------------------------------------------------------------
  if (phase === "intro") {
    return (
      <Card as="section" className="p-5">
        <h2 className="text-base font-bold text-gray-900">{themeTitle}の総まとめ試験</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          この章の内容を横断して、本試験に近い形式で{questions.length}問を出題します。
          途中で正誤は表示しません。最後まで解いてから採点します。
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-gray-700">
          <li>・全{questions.length}問／合格ライン {passRate}%</li>
          <li>・前後の問題へ移動して見直せます</li>
          <li>・組合せ型・計算・資料の読み取りを含みます</li>
        </ul>
        <button type="button" onClick={start} className={buttonClass("primary", "lg", "mt-5 w-full")}>
          試験を始める
        </button>
      </Card>
    );
  }

  // --- 実施中 ---------------------------------------------------------------
  if (phase === "running" && current) {
    const choices = order.get(current.questionNumber) ?? current.choices;
    const selected = answers[current.questionNumber] ?? null;
    const isLast = index === questions.length - 1;

    return (
      <div className="space-y-4">
        <Card as="section" className="p-4">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="font-semibold text-gray-900">
              問 {current.questionNumber} / {questions.length}
            </span>
            <span>回答済み {answeredCount}問</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${((index + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* 資料や選択肢の並びを含む問題文は改行を保つ。 */}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
            {current.prompt}
          </p>

          <ul className="mt-4 space-y-2">
            {choices.map((choice) => {
              const isSelected = selected === choice.key;
              return (
                <li key={choice.key}>
                  <button
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [current.questionNumber]: isSelected ? null : choice.key,
                      }))
                    }
                    aria-pressed={isSelected}
                    className={[
                      "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition",
                      isSelected
                        ? "border-brand-600 bg-brand-50 text-brand-900"
                        : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        isSelected ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600",
                      ].join(" ")}
                    >
                      {CHOICE_LABEL[choice.key]}
                    </span>
                    <span className="whitespace-pre-wrap leading-relaxed">{choice.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => move(index - 1)}
            disabled={index === 0}
            className={buttonClass("secondary", "md", "flex-1")}
          >
            前へ
          </button>
          {isLast ? (
            <button type="button" onClick={finish} className={buttonClass("primary", "md", "flex-1")}>
              採点する
            </button>
          ) : (
            <button
              type="button"
              onClick={() => move(index + 1)}
              className={buttonClass("primary", "md", "flex-1")}
            >
              次へ
            </button>
          )}
        </div>

        {answeredCount < questions.length && (
          <p className="text-center text-xs text-gray-500">
            未回答が{questions.length - answeredCount}問あります。最後の問題から採点できます。
          </p>
        )}
      </div>
    );
  }

  // --- 結果 -----------------------------------------------------------------
  if (phase === "result" && result) {
    return (
      <div className="space-y-4">
        <Card as="section" className="p-5">
          <span
            className={[
              "inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1",
              result.passed
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-accent-50 text-accent-700 ring-accent-200",
            ].join(" ")}
          >
            {result.passed ? "合格ライン到達" : "もう一歩"}
          </span>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {result.correct} / {result.total}
            <span className="ml-2 text-base font-semibold text-gray-600">（{result.rate}%）</span>
          </p>
          {result.unanswered > 0 && (
            <p className="mt-1 text-xs text-gray-500">未回答 {result.unanswered}問</p>
          )}
        </Card>

        {result.reviewTopics.length > 0 && (
          <Card as="section" className="p-5">
            <h3 className="text-sm font-bold text-gray-900">復習するトピック</h3>
            <p className="mt-1 text-xs text-gray-600">誤答が多い順に並べています。</p>
            <ul className="mt-3 space-y-2">
              {result.reviewTopics.map((t) => (
                <li key={t.topicId}>
                  <Link
                    href={getLessonHref(t.topicId)}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 hover:bg-gray-50"
                  >
                    <span>{t.topicTitle}</span>
                    <span className="text-xs font-semibold text-accent-700">
                      {t.incorrectCount}問
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card as="section" className="p-5">
          <h3 className="text-sm font-bold text-gray-900">解答と解説</h3>
          <ol className="mt-3 space-y-4">
            {questions.map((q) => {
              const r = result.questions.find((x) => x.questionId === q.id);
              if (!r) return null;
              return (
                <li key={q.id} className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-gray-900">問 {q.questionNumber}</span>
                    <span
                      className={
                        r.isCorrect
                          ? "font-bold text-emerald-700"
                          : "font-bold text-accent-700"
                      }
                    >
                      {r.isCorrect ? "正解" : r.isUnanswered ? "未回答" : "不正解"}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
                    {q.prompt}
                  </p>
                  <p className="mt-2 text-sm text-gray-800">
                    正答：{CHOICE_LABEL[q.correctChoice]}{" "}
                    {q.choices.find((c) => c.key === q.correctChoice)?.text}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{q.explanation}</p>
                </li>
              );
            })}
          </ol>
        </Card>

        <div className="flex gap-2">
          <button type="button" onClick={retry} className={buttonClass("secondary", "md", "flex-1")}>
            もう一度解く
          </button>
          <Link
            href={`/learn/${themeSlug}`}
            className={buttonClass("primary", "md", "flex-1")}
            data-exam-id={examId}
          >
            この章へ戻る
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
