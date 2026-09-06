"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { QuestionExposureMap, UserAnswer } from "@/types";
import type { CheckQuestion } from "@/types/content";
import type { WordlistEntry } from "@/types/wordlist";
import { buildQuizForEntry } from "@/lib/wordlist";
import { recordQuizResult } from "@/lib/wordlistProgress";
import {
  getUserId,
  saveQuestionAttempts,
  submitCheckPack,
  todayLocalDate,
  type QuestionAttemptInput,
} from "@/lib/userSession";
import { judgeRates, decidePackStage } from "@/lib/checkPackJudge";
import { getLessonHref } from "@/lib/learningCatalog";
import type { CheckPackResultStatus } from "@/types/checkPack";
import RecordingLockNotice from "@/components/billing/RecordingLockNotice";
import TopicQuiz from "@/components/learn/TopicQuiz";
import { buttonClass } from "@/components/ui/Button";

// 確認パックの実施フロー（クライアント）。
// 1) 基礎確認問題 → 2) 関連単語の確認 → 3) 過去問レベル問題 → 4) 結果 → 5) 次の推奨行動。
// 既存の TopicQuiz を3回使い回す。用語・過去問レベルも4択に整えて同じ部品で出す。
// API 失敗・Supabase 未設定・匿名でも、ローカル判定で結果まで到達できる（学習を止めない）。
//
// 「学習UX」と「正式な学習記録」は責務を分ける:
//   - 回答保存の成否に関わらず、ステップ遷移と結果表示は必ず進む。
//   - サーバー側の正式進捗（submitCheckPack → topic_progress / 合格準備度）は、
//     回答が authoritative に保存できたセッションでだけ動かす。
//   - 保存できなかったことは非ブロッキングの通知でユーザーに伝える。

type Phase = "intro" | "quiz" | "flashcards" | "exam" | "result";

/**
 * 回答バッチの保存結果。
 * - saved: サーバーが exposure を確定して返した（正式な学習記録として扱える）
 * - skipped: 未ログイン。サーバー保存の対象外で、失敗ではない
 * - unsaved: 401・障害・Supabase 未設定など。学習は続けるが記録には使わない
 */
type AttemptPersistence = "saved" | "skipped" | "unsaved";

// 確認パック専用の制限時間。
// 基礎確認は軽く、用語確認はテンポ重視、過去問レベルは本番感を出すため少し長めにする。
const MIN_STEP_SECONDS = 60;
const QUIZ_SECONDS_PER_QUESTION = 45;
const FLASHCARD_SECONDS_PER_TERM = 30;
const EXAM_SECONDS_PER_QUESTION = 75;

function stepLimitSeconds(count: number, secondsPerItem: number): number {
  return Math.max(MIN_STEP_SECONDS, count * secondsPerItem);
}

/** correct/total から正答率(0〜100)。total 0 は null（未実施扱い）。 */
function rateOf(correct: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((correct / total) * 100);
}

/** 単語エントリを4択の CheckQuestion に整える（TopicQuiz で出題するため）。 */
function flashcardToCheckQuestion(entry: WordlistEntry): CheckQuestion {
  const q = buildQuizForEntry(entry);
  return {
    id: entry.id,
    prompt: q.prompt,
    choices: q.choices,
    correctChoice: q.correctKey,
    explanation: q.explanation,
    difficulty: 2,
  };
}

const STATUS_LABEL: Record<CheckPackResultStatus, string> = {
  passed: "本番対応OK",
  review_needed: "もう一歩（要復習）",
  weak: "重点的に復習しよう",
  incomplete: "途中まで実施",
};

const STATUS_TONE: Record<CheckPackResultStatus, string> = {
  passed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  review_needed: "bg-accent-50 text-accent-700 ring-accent-200",
  weak: "bg-rose-50 text-rose-700 ring-rose-200",
  incomplete: "bg-gray-50 text-gray-700 ring-gray-200",
};

export default function CheckPackRunner({
  packId,
  topicId,
  topicTitle,
  quizQuestions,
  flashcardEntries,
  examQuestions,
}: {
  packId: string;
  topicId: string;
  topicTitle: string;
  quizQuestions: CheckQuestion[];
  flashcardEntries: WordlistEntry[];
  examQuestions: CheckQuestion[];
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [quizRate, setQuizRate] = useState<number | null>(null);
  const [flashcardRate, setFlashcardRate] = useState<number | null>(null);
  const [examLevelRate, setExamLevelRate] = useState<number | null>(null);
  const [serverStatus, setServerStatus] = useState<{
    resultStatus: CheckPackResultStatus;
    nextAction: string;
  } | null>(null);
  // 保存できなかった回答があるセッションかどうか。
  // ref は finalize の判定用（同一イベント内で即時に読む必要がある）、state は通知の表示用。
  const unsavedAnswersRef = useRef(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const startedAtRef = useRef<string>(new Date().toISOString());

  // 単語の4択は初回だけ生成する（設問が毎レンダーで変わらないように固定）。
  const flashcardQuestions = useMemo(
    () => flashcardEntries.map(flashcardToCheckQuestion),
    [flashcardEntries],
  );

  const hasFlashcards = flashcardQuestions.length > 0;
  const hasExam = examQuestions.length > 0;

  /**
   * 回答バッチを保存し、正式な学習記録として扱えるかどうかだけを返す。
   * 例外は投げない（保存の失敗で学習フローを止めないため）。
   */
  async function saveAttempts(
    answers: UserAnswer[],
    questionType: QuestionAttemptInput["questionType"],
  ): Promise<AttemptPersistence> {
    const userId = getUserId();
    // 未ログインはそもそもサーバー保存の対象外。「失敗」ではないので通知も出さない。
    if (!userId) return "skipped";
    const attempts: QuestionAttemptInput[] = answers.map((a) => ({
      questionId: a.questionId,
      questionType,
      topicId,
      selectedAnswer: a.selectedChoice ?? null,
      isCorrect: a.isCorrect,
      answeredAt: a.answeredAt,
    }));
    let exposures: QuestionExposureMap = {};
    try {
      exposures = await saveQuestionAttempts(userId, attempts);
    } catch {
      // ネットワーク断など。unknown と同じ「保存できなかった」扱いにする。
      exposures = {};
    }
    // unknown / 欠落は保存の受領証にならない（401・障害・Supabase 未設定を含む）。
    const persisted = attempts.every((attempt) => {
      const exposure = exposures[attempt.questionId];
      return exposure !== undefined && exposure.state !== "unknown";
    });
    if (persisted) return "saved";
    unsavedAnswersRef.current = true;
    setSaveFailed(true);
    return "unsaved";
  }

  async function handleQuizDone(answers: UserAnswer[]) {
    const correct = answers.filter((a) => a.isCorrect).length;
    const rate = rateOf(correct, answers.length);
    // 保存の結果は記録の話。成否に関わらず次のステップへ必ず進む。
    await saveAttempts(answers, "topic_quiz");
    setQuizRate(rate);
    setPhase(hasFlashcards ? "flashcards" : hasExam ? "exam" : "result");
    if (!hasFlashcards && !hasExam) {
      await finalize(rate, null, null);
    }
  }

  function handleFlashcardsDone(answers: UserAnswer[]) {
    const correct = answers.filter((a) => a.isCorrect).length;
    const rate = rateOf(correct, answers.length);
    setFlashcardRate(rate);
    // 単語帳の進捗（localStorage/DB）も更新する。
    for (const a of answers) recordQuizResult(a.questionId, a.isCorrect);
    setPhase(hasExam ? "exam" : "result");
    if (!hasExam) void finalize(quizRate, rate, null);
  }

  async function handleExamDone(answers: UserAnswer[]) {
    const correct = answers.filter((a) => a.isCorrect).length;
    const rate = rateOf(correct, answers.length);
    await saveAttempts(answers, "exam_level");
    setExamLevelRate(rate);
    setPhase("result");
    await finalize(quizRate, flashcardRate, rate);
  }

  // 結果をサーバーへ送り、topic_progress を更新する（失敗してもローカル判定で表示継続）。
  async function finalize(
    q: number | null,
    f: number | null,
    e: number | null,
  ) {
    const userId = getUserId();
    if (!userId) return;
    // 未保存の回答が混ざったセッションは、正式な到達度証拠にならない。
    // stage（本番対応OK）・合格準備度をこの結果で動かさない。
    if (unsavedAnswersRef.current) return;
    const res = await submitCheckPack(userId, {
      packId,
      topicId,
      quizRate: q,
      flashcardRate: f,
      examLevelRate: e,
      startedAt: startedAtRef.current,
      date: todayLocalDate(),
    });
    if (res) setServerStatus({ resultStatus: res.resultStatus, nextAction: res.nextAction });
  }

  // ---- 表示 ---------------------------------------------------------------

  if (phase === "intro") {
    return (
      <div className="space-y-5">
        <RecordingLockNotice variant="compact" />
        <IntroCard
          topicTitle={topicTitle}
          quizCount={quizQuestions.length}
          flashcardCount={flashcardQuestions.length}
          examCount={examQuestions.length}
        />
        <button
          type="button"
          onClick={() => setPhase("quiz")}
          className={buttonClass("primary", "lg", "w-full")}
        >
          確認パックを始める
        </button>
      </div>
    );
  }

  if (phase === "quiz") {
    return (
      <StepShell step={1} title="基礎確認問題" note="まずは基礎理解のチェック。">
        <TopicQuiz
          key={`${packId}:quiz`}
          topicId={topicId}
          questions={quizQuestions}
          onComplete={handleQuizDone}
          completeLabel="次へ（用語の確認）"
          dense
          timeLimitSeconds={stepLimitSeconds(
            quizQuestions.length,
            QUIZ_SECONDS_PER_QUESTION,
          )}
        />
      </StepShell>
    );
  }

  if (phase === "flashcards") {
    return (
      <StepShell step={2} title="関連用語の確認" note="用語が定着しているかチェック。">
        {saveFailed && <SaveFailedNotice />}
        <TopicQuiz
          key={`${packId}:flashcards`}
          topicId={topicId}
          questions={flashcardQuestions}
          onComplete={handleFlashcardsDone}
          completeLabel={hasExam ? "次へ（過去問レベル）" : "結果を見る"}
          dense
          timeLimitSeconds={stepLimitSeconds(
            flashcardQuestions.length,
            FLASHCARD_SECONDS_PER_TERM,
          )}
        />
      </StepShell>
    );
  }

  if (phase === "exam") {
    return (
      <StepShell
        step={3}
        title="過去問レベル問題"
        note="本番対応力のチェック。ここが「本番対応OK」の判定になります。"
      >
        {saveFailed && <SaveFailedNotice />}
        <TopicQuiz
          key={`${packId}:exam`}
          topicId={topicId}
          questions={examQuestions}
          onComplete={handleExamDone}
          completeLabel="結果を見る"
          dense
          timeLimitSeconds={stepLimitSeconds(
            examQuestions.length,
            EXAM_SECONDS_PER_QUESTION,
          )}
        />
      </StepShell>
    );
  }

  // result
  const rates = { quizRate, flashcardRate, examLevelRate };
  const local = decidePackStage(judgeRates(rates), 0);
  const resultStatus = serverStatus?.resultStatus ?? local.resultStatus;
  const nextAction = serverStatus?.nextAction ?? local.nextAction;

  return (
    <div className="space-y-5">
      {saveFailed && <SaveFailedNotice />}
      <div
        className={`animate-pop-in rounded-xl p-5 text-center ring-1 ${STATUS_TONE[resultStatus]}`}
      >
        <p className="text-sm font-bold">確認パックの結果</p>
        <p className="mt-1 text-2xl font-bold">{STATUS_LABEL[resultStatus]}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <RateCard label="確認問題" rate={quizRate} passRate={75} />
        <RateCard label="関連用語" rate={flashcardRate} passRate={80} />
        <RateCard label="過去問レベル" rate={examLevelRate} passRate={70} />
      </div>

      <div className="rounded-xl bg-white p-4 border border-gray-200">
        <p className="text-xs font-semibold text-brand-700">次の推奨行動</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-gray-700">
          {nextAction}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href={getLessonHref(topicId)}
          className={buttonClass("primary", "md")}
        >
          レッスンに戻る
        </Link>
        <Link
          href="/progress"
          className="rounded-xl bg-white px-6 py-3 text-center font-bold text-brand-600 ring-1 ring-brand-200"
        >
          進捗を見る
        </Link>
      </div>
    </div>
  );
}

/**
 * 保存できなかったことを伝える非ブロッキングの通知。
 * 学習は続けられること、記録には反映されないことの両方を短く伝える。
 */
function SaveFailedNotice() {
  return (
    <div
      role="status"
      className="rounded-xl bg-accent-50 px-4 py-3 text-sm font-semibold text-accent-800 ring-1 ring-accent-200"
    >
      学習記録を保存できませんでした。学習はそのまま続けられます。
      <span className="mt-0.5 block text-xs font-semibold text-accent-700">
        この回の結果は進捗・合格準備度には反映されません。
      </span>
    </div>
  );
}

function IntroCard({
  topicTitle,
  quizCount,
  flashcardCount,
  examCount,
}: {
  topicTitle: string;
  quizCount: number;
  flashcardCount: number;
  examCount: number;
}) {
  return (
    <div className="rounded-xl bg-white p-5 border border-gray-200">
      <h2 className="text-base font-bold text-gray-800">
        「{topicTitle}」の確認パック
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        3つのチェックで、いまの到達度と「本番対応OK」かどうかを確かめます。
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        <StepLine n={1} label="基礎確認問題" count={quizCount} unit="問" hint="基礎理解" />
        <StepLine n={2} label="関連用語の確認" count={flashcardCount} unit="語" hint="用語定着" />
        <StepLine n={3} label="過去問レベル問題" count={examCount} unit="問" hint="本番対応力" />
      </ul>
    </div>
  );
}

function StepLine({
  n,
  label,
  count,
  unit,
  hint,
}: {
  n: number;
  label: string;
  count: number;
  unit: string;
  hint: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
        {n}
      </span>
      <span className="font-semibold text-gray-800">{label}</span>
      <span className="ml-auto text-xs text-gray-500">
        {count}
        {unit}・{hint}
      </span>
    </li>
  );
}

function StepShell({
  step,
  title,
  note,
  children,
}: {
  step: number;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-brand-50 px-4 py-3">
        <p className="text-xs font-bold text-brand-600">ステップ {step} / 3</p>
        <p className="text-sm font-bold text-brand-800">{title}</p>
        <p className="mt-0.5 text-xs text-brand-700">{note}</p>
      </div>
      {children}
    </div>
  );
}

function RateCard({
  label,
  rate,
  passRate,
}: {
  label: string;
  rate: number | null;
  passRate: number;
}) {
  const passed = rate != null && rate >= passRate;
  const tone =
    rate == null
      ? "border-gray-200 bg-white text-gray-500"
      : passed
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-accent-200 bg-accent-50 text-accent-700";
  return (
    <div className={`rounded-lg border px-2 py-3 text-center ${tone}`}>
      <p className="text-xl font-semibold tabular-nums">{rate == null ? "—" : `${rate}%`}</p>
      <p className="mt-0.5 text-[11px] font-semibold">{label}</p>
      <p className="text-[10px] opacity-70">{passRate}%で合格</p>
    </div>
  );
}
