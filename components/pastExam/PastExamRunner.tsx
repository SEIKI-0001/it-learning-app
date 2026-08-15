"use client";

// 公式過去問 年度別演習のRunner。
//
// 既存の TopicQuiz は「選択肢をシャッフルする」「回答したら必ず正答を出す」挙動なので
// 流用しない。公式過去問では出題順・選択肢順が公式の並びそのものであることに意味があり、
// 本番モードでは採点まで正答を見せてはいけない。TopicQuiz 側は一切変更していない。
//
// 画面の段階:
//   select  … モード選択（前回の途中状態があれば「再開する」を出す）
//   running … 出題
//   result  … 採点結果

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Button from "@/components/ui/Button";
import PastExamQuestionCard from "@/components/pastExam/PastExamQuestionCard";
import PastExamResultView from "@/components/pastExam/PastExamResultView";
import type { PastExamQuestionView } from "@/lib/pastExam/questionView";
import {
  gradePastExam,
  recordPastExamLearningResult,
} from "@/lib/pastExam/scoring";
import { saveAllAttempts, saveSingleAttempt } from "@/lib/pastExam/saveAttempts";
import {
  getAnonymousQuestionExposureStates,
  getUnknownQuestionExposureStates,
} from "@/lib/questionExposure";
import {
  clearSession,
  createSession,
  formatRemaining,
  getResumableServerSnapshot,
  getResumableSnapshot,
  loadSession,
  parseResumable,
  remainingSeconds,
  saveSession,
  subscribeToSessions,
  withAnswer,
  withAnswerExposure,
} from "@/lib/pastExam/session";
import {
  getUserIdServerSnapshot,
  getUserIdSnapshot,
  subscribeToUserId,
} from "@/lib/pastExam/userIdStore";
import { loadAppState, saveAppState } from "@/lib/storage";
import { saveProgressToDb } from "@/lib/userSession";
import type { ChoiceKey } from "@/types";
import type { QuestionExposureMap, QuestionExposureState } from "@/types";
import {
  EXAM_MODE_DURATION_MINUTES,
  type PastExamMode,
  type PastExamResult,
  type PastExamSession,
} from "@/types/pastExam";

type Phase = "select" | "running" | "result";

type Props = {
  year: number;
  yearLabel: string;
  questions: PastExamQuestionView[];
};

export default function PastExamRunner({ year, yearLabel, questions }: Props) {
  const [phase, setPhase] = useState<Phase>("select");
  const [session, setSession] = useState<PastExamSession | null>(null);
  const [result, setResult] = useState<PastExamResult | null>(null);

  // 採点は1セッションにつき1回だけ走らせる。
  //
  // 採点を複数回通すと、本番モードでは saveAllAttempts() が100問ぶんの保存を
  // そのたびに送るため、同じ回答が二重に記録される。二重に走りうる経路が複数ある:
  //   - 「採点する」の連打（再描画前に onClick が続けて発火する）
  //   - 時間切れの自動採点と手動採点の競合
  //   - 残り0秒のあいだタイマーが毎秒 onTimeUp を呼び続ける
  //
  // state だけでは再描画を待つ隙に通り抜けるので、同期的に閉じる ref を正とし、
  // state（submitting）はボタンを無効化する表示のためだけに使う。
  const submittedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  // userId はサーバ描画では分からない（localStorage）。確定するまで（null の間）は
  // 保存しない。未確定のまま書くと anon 側のキーへ書いてしまう。
  const rawUserId = useSyncExternalStore(
    subscribeToUserId,
    getUserIdSnapshot,
    getUserIdServerSnapshot,
  );
  const userReady = rawUserId !== null;
  const userId = rawUserId ? rawUserId : null;

  // 再開できる途中状態があるか。保存・削除のたびに購読側へ通知される。
  const resumableSnapshot = useSyncExternalStore(
    subscribeToSessions,
    useCallback(() => getResumableSnapshot(userId, year), [userId, year]),
    getResumableServerSnapshot,
  );
  const resumable = parseResumable(resumableSnapshot);

  const persist = useCallback(
    (next: PastExamSession) => {
      setSession(next);
      if (userReady) saveSession(userId, next);
    },
    [userReady, userId],
  );

  const persistExposure = useCallback(
    (sessionId: string, questionNumber: number, exposureState: QuestionExposureState) => {
      setSession((current) => {
        if (!current || current.sessionId !== sessionId) return current;
        const next = withAnswerExposure(current, questionNumber, exposureState);
        if (userReady) saveSession(userId, next);
        return next;
      });
    },
    [userReady, userId],
  );

  /** 新しい演習を始めるたびに採点ガードを開け直す（セッション単位の1回制限のため）。 */
  const allowSubmit = useCallback(() => {
    submittedRef.current = false;
    setSubmitting(false);
  }, []);

  const start = useCallback(
    (mode: PastExamMode) => {
      const existing = loadSession(userId, year, mode);
      const next = existing ?? createSession(year, mode);
      allowSubmit();
      persist(next);
      setPhase("running");
    },
    [userId, year, persist, allowSubmit],
  );

  const restart = useCallback(
    (mode: PastExamMode) => {
      clearSession(userId, year, mode);
      const next = createSession(year, mode);
      allowSubmit();
      persist(next);
      setPhase("running");
    },
    [userId, year, persist, allowSubmit],
  );

  const finish = useCallback(
    async (current: PastExamSession) => {
      // 2回目以降は何もしない。ここを通すと保存も採点もやり直される。
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);

      const graded = gradePastExam({
        sessionId: current.sessionId,
        year,
        mode: current.mode,
        // PastExamQuestionView は GradableQuestion を構造的に満たす。
        questions,
        answers: current.answers,
      });

      const currentState = loadAppState();
      let exposures: QuestionExposureMap;
      if (!userId) {
        exposures = getAnonymousQuestionExposureStates(
          currentState?.answers ?? [],
          questions.map((question) => question.id),
        );
      } else if (current.mode === "exam") {
        exposures = await saveAllAttempts({
          userId,
          questions,
          answers: current.answers,
          mode: current.mode,
          sessionId: current.sessionId,
        });
      } else {
        exposures = getUnknownQuestionExposureStates(
          questions.map((question) => question.id),
        );
        for (const question of questions) {
          const exposureState = current.answers[question.questionNumber]?.exposureState;
          if (!exposureState) continue;
          exposures = {
            ...exposures,
            [question.id]: {
              questionId: question.id,
              state: exposureState,
              attemptedBefore:
                exposureState === "first"
                  ? false
                  : exposureState === "seen"
                    ? true
                    : null,
              firstAttemptAt: null,
              attemptCount: null,
            },
          };
        }
      }

      if (currentState) {
        const next = recordPastExamLearningResult(
          currentState,
          graded,
          current.answers,
          exposures,
        );
        saveAppState(next);
        if (userId) saveProgressToDb(userId, next.progress);
      }

      // 完了した演習は途中状態として残さない（購読側へも通知される）。
      clearSession(userId, year, current.mode);
      setResult(graded);
      setPhase("result");
    },
    [questions, userId, year],
  );

  if (phase === "result" && result) {
    return (
      <PastExamResultView
        result={result}
        questions={questions}
        yearLabel={yearLabel}
        onRestart={() => {
          setResult(null);
          setPhase("select");
        }}
      />
    );
  }

  if (phase === "running" && session) {
    return (
      <QuestionStage
        session={session}
        questions={questions}
        onChange={persist}
        onExposure={persistExposure}
        onFinish={finish}
        userId={userId}
        submitting={submitting}
      />
    );
  }

  return (
    <ModeSelect
      total={questions.length}
      resumable={resumable}
      onStart={start}
      onRestart={restart}
    />
  );
}

// ---------------------------------------------------------------------------
// モード選択
// ---------------------------------------------------------------------------

function ModeSelect({
  total,
  resumable,
  onStart,
  onRestart,
}: {
  total: number;
  resumable: Record<PastExamMode, boolean>;
  onStart: (mode: PastExamMode) => void;
  onRestart: (mode: PastExamMode) => void;
}) {
  return (
    <div className="space-y-4">
      <ModeCard
        title="練習モード"
        description={`公式の並びどおりに${total}問を解きます。1問ごとに正誤と解説を確認でき、前後の問題へ自由に移動できます。制限時間はありません。`}
        points={[
          "回答するとすぐ解説が出る",
          "回答は最初の1回で確定する",
          "制限時間なし",
          "途中でやめても再開できる",
        ]}
        resumable={resumable.practice}
        onStart={() => onStart("practice")}
        onRestart={() => onRestart("practice")}
      />
      <ModeCard
        title="本番モード"
        description={`本番と同じ${EXAM_MODE_DURATION_MINUTES}分で${total}問に挑戦します。解答中は正答も解説も表示されません。終了するか時間切れになると採点します。`}
        points={[
          `制限時間 ${EXAM_MODE_DURATION_MINUTES} 分`,
          "採点まで正答・解説は見えない",
          "リロードしても残り時間は戻らない",
        ]}
        resumable={resumable.exam}
        onStart={() => onStart("exam")}
        onRestart={() => onRestart("exam")}
      />
    </div>
  );
}

function ModeCard({
  title,
  description,
  points,
  resumable,
  onStart,
  onRestart,
}: {
  title: string;
  description: string;
  points: string[];
  resumable: boolean;
  onStart: () => void;
  onRestart: () => void;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{description}</p>
      <ul className="mt-3 space-y-1">
        {points.map((point) => (
          <li key={point} className="flex gap-1.5 text-xs text-gray-600">
            <span aria-hidden="true" className="text-brand-600">
              •
            </span>
            {point}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onStart}>{resumable ? "続きから再開する" : "始める"}</Button>
        {resumable && (
          <Button variant="secondary" onClick={onRestart}>
            最初からやり直す
          </Button>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 出題
// ---------------------------------------------------------------------------

function QuestionStage({
  session,
  questions,
  onChange,
  onExposure,
  onFinish,
  userId,
  submitting,
}: {
  session: PastExamSession;
  questions: PastExamQuestionView[];
  onChange: (next: PastExamSession) => void;
  onExposure: (
    sessionId: string,
    questionNumber: number,
    exposureState: QuestionExposureState,
  ) => void;
  onFinish: (session: PastExamSession) => Promise<void>;
  userId: string | null;
  /** 採点処理が走り出したか。ボタンを無効化して連打の入口を塞ぐ。 */
  submitting: boolean;
}) {
  const isExam = session.mode === "exam";
  const index = Math.min(Math.max(0, session.currentIndex), questions.length - 1);
  const question = questions[index];
  const answer = session.answers[question.questionNumber];
  const selected = answer?.selected ?? null;

  // 練習モードでは、回答済みの問題に戻ったときも解説を出す。
  const revealAnswer = !isExam && selected !== null;

  // 練習モードは最初に選んだ回答で確定する。正答と解説を見てから選び直せると、
  // 誤答を正答に付け替えられてしまい、回答履歴が実力を表さなくなるため。
  // 本番モードは採点までいつでも選び直せる（採点前は正答が見えないので問題ない）。
  const answerLocked = !isExam && selected !== null;

  // 同一セッションで保存済みの問題。回答の確定は上の answerLocked で足りるが、
  // 再描画前に連打された場合まで含めて「1問1回」を守るための保険。
  const savedQuestionsRef = useRef<Set<string>>(new Set());
  const [classifying, setClassifying] = useState(false);
  const saveKey = `${session.sessionId}:${question.questionNumber}`;

  // 1問あたりの所要時間を測る基準。問題を切り替えたら測り直す。
  // Date.now() はレンダリング中に呼べない（純粋でない）ので、初期値は 0 にして
  // マウント後の effect で入れる。0 のまま回答された場合は下で経過を捨てる。
  const enteredAt = useRef<number>(0);
  useEffect(() => {
    enteredAt.current = Date.now();
  }, [index]);

  const answeredCount = Object.values(session.answers).filter(
    (a) => a.selected !== null,
  ).length;

  const handleSelect = async (key: ChoiceKey) => {
    // UI 側でも選択肢を disabled にしているが、表示に依らずここでも弾く。
    if (answerLocked || (!isExam && savedQuestionsRef.current.has(saveKey))) return;

    const now = Date.now();
    // effect が走る前に回答された場合（enteredAt が 0）は、経過時間を 0 とする。
    const elapsed = enteredAt.current === 0 ? 0 : (now - enteredAt.current) / 1000;
    enteredAt.current = now;
    const next = withAnswer(session, question.questionNumber, key, elapsed);
    onChange(next);

    // 練習モードは1問ごとに保存する（回答は確定するので1問1回だけ送る）。
    if (!isExam) {
      const saved = next.answers[question.questionNumber];
      if (saved) {
        savedQuestionsRef.current.add(saveKey);
        setClassifying(true);
        const exposure = userId
          ? await saveSingleAttempt({
            userId,
            question,
            answer: saved,
            mode: session.mode,
            sessionId: next.sessionId,
          })
          : getAnonymousQuestionExposureStates(
            loadAppState()?.answers ?? [],
            [question.id],
          );
        onExposure(
          next.sessionId,
          question.questionNumber,
          exposure[question.id]?.state ?? "unknown",
        );
        setClassifying(false);
      }
    }
  };

  const goTo = (nextIndex: number) => {
    const clamped = Math.min(Math.max(0, nextIndex), questions.length - 1);
    onChange({ ...session, currentIndex: clamped });
  };

  return (
    <div className="space-y-4">
      <StageHeader
        session={session}
        answeredCount={answeredCount}
        total={questions.length}
        onTimeUp={() => onFinish(session)}
      />

      <PastExamQuestionCard
        question={question}
        index={index}
        total={questions.length}
        selected={selected}
        onSelect={handleSelect}
        revealAnswer={revealAnswer}
        disabled={answerLocked}
      />

      <nav className="flex items-center justify-between gap-2" aria-label="問題の移動">
        <Button
          variant="secondary"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
        >
          前の問題
        </Button>
        <span className="text-xs text-gray-500" aria-live="polite">
          {index + 1} / {questions.length}
        </span>
        <Button
          variant="secondary"
          onClick={() => goTo(index + 1)}
          disabled={index === questions.length - 1}
        >
          次の問題
        </Button>
      </nav>

      <QuestionJumpGrid
        questions={questions}
        session={session}
        currentIndex={index}
        onJump={goTo}
      />

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-600">
          {answeredCount} / {questions.length} 問に回答しました。
          {answeredCount < questions.length &&
            "未回答のまま採点すると、その問題は不正解として集計されます。"}
        </p>
        <Button
          className="mt-3 w-full"
          onClick={() => void onFinish(session)}
          disabled={submitting || classifying}
        >
          {submitting ? "採点中…" : classifying ? "回答保存中…" : "採点する"}
        </Button>
      </div>
    </div>
  );
}

/** 進捗と、本番モードの残り時間。 */
function StageHeader({
  session,
  answeredCount,
  total,
  onTimeUp,
}: {
  session: PastExamSession;
  answeredCount: number;
  total: number;
  onTimeUp: () => void;
}) {
  const isExam = session.mode === "exam";
  const [remaining, setRemaining] = useState(() =>
    isExam ? remainingSeconds(session) : 0,
  );

  // 時間切れで自動採点する。onTimeUp は毎回関数が変わるので ref で受ける
  // （依存に入れるとタイマーが張り直され続ける）。
  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // 時間切れの通知は1回だけにする。残り0秒のあいだ毎秒 onTimeUp を呼び続けると、
  // 採点側のガードを外したときにそのまま二重保存になる（多重防御としてここでも止める）。
  const timeUpNotifiedRef = useRef(false);

  useEffect(() => {
    if (!isExam) return;
    // 残り時間は毎秒「開始時刻からの経過」で計算し直す。
    // 残り秒数を減算していく方式にすると、タブが非表示の間に止まってしまう。
    const tick = () => {
      const left = remainingSeconds(session);
      setRemaining(left);
      if (left <= 0 && !timeUpNotifiedRef.current) {
        timeUpNotifiedRef.current = true;
        onTimeUpRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isExam, session]);

  const progress = Math.round((answeredCount / total) * 100);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-gray-500">
          {isExam ? "本番モード" : "練習モード"}
        </p>
        {isExam && (
          <p
            className={`font-mono text-sm font-bold tabular-nums ${
              remaining <= 300 ? "text-accent-700" : "text-gray-900"
            }`}
            role="timer"
            aria-live="off"
          >
            残り {formatRemaining(remaining)}
          </p>
        )}
      </div>
      <div
        className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={answeredCount}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="回答済みの問題数"
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/** 未回答の問題へ飛ぶための一覧。本番モードでも移動できる必要がある。 */
function QuestionJumpGrid({
  questions,
  session,
  currentIndex,
  onJump,
}: {
  questions: PastExamQuestionView[];
  session: PastExamSession;
  currentIndex: number;
  onJump: (index: number) => void;
}) {
  return (
    <details className="rounded-xl border border-gray-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-900">
        問題一覧から選ぶ
      </summary>
      <div className="grid grid-cols-8 gap-1.5 px-4 pb-4 sm:grid-cols-10">
        {questions.map((q, i) => {
          const answered = session.answers[q.questionNumber]?.selected != null;
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onJump(i)}
              aria-current={isCurrent ? "true" : undefined}
              aria-label={`問${q.questionNumber}${answered ? "（回答済み）" : "（未回答）"}`}
              className={`rounded py-1.5 text-xs font-semibold transition ${
                isCurrent
                  ? "bg-brand-600 text-white"
                  : answered
                    ? "bg-brand-50 text-brand-700 hover:bg-brand-100"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {q.questionNumber}
            </button>
          );
        })}
      </div>
    </details>
  );
}
