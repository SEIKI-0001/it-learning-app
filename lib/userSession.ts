"use client";

import type { AppState, UserAnswer, UserProfile, UserProgress } from "@/types";
import type {
  DailyStudyTaskInput,
  ProgressLevel,
  ProgressReason,
} from "@/types/studyProgress";
import type { IntegratedLearningStatus } from "@/types/integratedStatus";
import type { PlanAdjustmentProposal } from "@/types/planAdjustment";
import type { AiGradingBootstrapResult } from "@/types/aiGrading";

// LINE 経由で解決した user_id を localStorage に保存し、以降のDB保存に使う。
// user_id が無ければ（= 直接アクセス）すべて localStorage だけで動く（フォールバック）。

const USER_ID_KEY = "fequest:userId";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getUserId(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(USER_ID_KEY);
  } catch {
    return null;
  }
}

export function setUserId(userId: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(USER_ID_KEY, userId);
  } catch {
    /* ignore */
  }
}

export function clearUserId(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(USER_ID_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * この端末に残っているユーザーデータ（fequest:* の localStorage / sessionStorage）を
 * すべて破棄する。ログアウト時と、セッションのユーザーがローカルの user_id と
 * 食い違った（＝共有端末で別アカウントに切り替わった）ときに呼ぶ。
 * 前のユーザーの学習状態・単語帳・参考書などが次のユーザーに混入するのを防ぐ。
 */
export function clearLocalUserData(): void {
  if (!isBrowser()) return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const targets: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith("fequest:")) targets.push(key);
      }
      for (const key of targets) storage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  invalidateSessionRestore();
}

/** URL の ?t=... から一時トークンを取り出す。 */
export function readTokenFromUrl(): string | null {
  if (!isBrowser()) return null;
  try {
    return new URLSearchParams(window.location.search).get("t");
  } catch {
    return null;
  }
}

export type ResolveResult = {
  userId: string;
  appState: AppState | null; // DB に既存データがあれば復元用の AppState
};

export type ProgressBootstrapResult = ResolveResult & {
  integratedStatus: IntegratedLearningStatus | null;
  planAdjustmentProposal: PlanAdjustmentProposal | null;
};

/** トークンを検証し、user_id と（あれば）DB上の AppState を取得する。 */
export async function resolveToken(token: string): Promise<ResolveResult | null> {
  try {
    const res = await fetch("/api/session/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean } & Partial<ResolveResult>;
    if (!data.ok || !data.userId) return null;
    return { userId: data.userId, appState: data.appState ?? null };
  } catch {
    return null;
  }
}

// SPA セッション内で /api/session/state を一度だけ呼ぶためのキャッシュ。
// ページ遷移ごとに毎回サーバー（getUser + DB）へ問い合わせるのを防ぐ。
// モジュール変数はクライアントサイド遷移の間は保持されるため、全画面で共有される。
let sessionRestorePromise: Promise<ResolveResult | null> | null = null;

/**
 * セッション復元を「このページロード中に一度だけ」実行する。
 * 2回目以降の呼び出し（＝別ページへの遷移）は最初の結果を再利用し、ネットワークを発生させない。
 */
export function restoreFromSessionOnce(): Promise<ResolveResult | null> {
  if (!sessionRestorePromise) {
    sessionRestorePromise = restoreFromSession();
  }
  return sessionRestorePromise;
}

/**
 * セッション復元キャッシュを破棄する（ログイン直後・ログアウト時などの明示的な再検証用）。
 */
export function invalidateSessionRestore(): void {
  sessionRestorePromise = null;
}

/**
 * 現在のセッション（Google ログイン / LINE 署名 Cookie）から user_id と DB上の AppState を復元する。
 * ?t= が無い直接アクセス時に使う。未ログインなら null。
 */
export async function restoreFromSession(): Promise<ResolveResult | null> {
  try {
    const res = await fetch("/api/session/state", { method: "GET" });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean } & Partial<ResolveResult>;
    if (!data.ok || !data.userId) return null;
    return { userId: data.userId, appState: data.appState ?? null };
  } catch {
    return null;
  }
}

/**
 * 統合進捗の合格準備度をローカルにキャッシュする。
 * バッジ判定（b-cp6-high-readiness）がサーバー値と同じ準備度を参照できるようにするため。
 * fequest: プレフィクスなので clearLocalUserData（ログアウト/切替）で自動消去される。
 */
function cacheIntegratedReadiness(score: unknown): void {
  if (typeof score !== "number" || !Number.isFinite(score)) return;
  try {
    window.localStorage.setItem("fequest:integratedReadiness", String(score));
  } catch {
    /* localStorage 不可でも学習は継続 */
  }
}

/**
 * /progress 初期表示に必要なサーバー状態をまとめて取得する。
 * 未ログイン・失敗時は null、Supabase 未設定時は中身 null の結果を返す
 * （どちらも既存の localStorage 表示を継続）。
 */
export async function fetchProgressBootstrap(
  userId?: string | null,
): Promise<ProgressBootstrapResult | null> {
  try {
    const res = await fetch("/api/progress/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId ?? undefined }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean } & Partial<ProgressBootstrapResult>;
    if (!data.ok || !data.userId) return null;
    setUserId(data.userId);
    if (data.integratedStatus) {
      cacheIntegratedReadiness(data.integratedStatus.readinessScore);
    }
    return {
      userId: data.userId,
      appState: data.appState ?? null,
      integratedStatus: data.integratedStatus ?? null,
      planAdjustmentProposal: data.planAdjustmentProposal ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * /ai-grading 初期表示に必要なサーバー状態をまとめて取得する。
 * 失敗時は null を返し、呼び出し側が既存の個別APIフォールバックへ戻る。
 */
export async function fetchAiGradingBootstrap(
  userId?: string | null,
): Promise<AiGradingBootstrapResult | null> {
  try {
    const res = await fetch("/api/ai-grading/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId ?? undefined }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean } & Partial<AiGradingBootstrapResult>;
    if (!data.ok || !data.billingStatus || !Array.isArray(data.gradingHistory)) {
      return null;
    }
    if (data.userId) setUserId(data.userId);
    return {
      userId: data.userId ?? null,
      billingStatus: data.billingStatus,
      gradingHistory: data.gradingHistory,
      initialQuestionIndex:
        typeof data.initialQuestionIndex === "number"
          ? data.initialQuestionIndex
          : 0,
    };
  } catch {
    return null;
  }
}

/** 進捗をDBへ保存（user_id がある場合のみ呼ぶ。失敗してもUIは止めない）。 */
export function saveProgressToDb(userId: string, progress: UserProgress): void {
  void fetch("/api/progress/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, progress }),
  }).catch(() => {
    /* fire-and-forget */
  });
}

/** プロフィールをDBへ保存（オンボーディング完了時）。 */
export function saveProfileToDb(userId: string, profile: UserProfile): void {
  void fetch("/api/progress/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, profile }),
  }).catch(() => {
    /* fire-and-forget */
  });
}

/** 回答履歴をDBへ保存。 */
export function saveAnswersToDb(
  userId: string,
  dayNo: number,
  answers: UserAnswer[],
): void {
  void fetch("/api/answers/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, dayNo, answers }),
  }).catch(() => {
    /* fire-and-forget */
  });
}

export type FeedbackAnswers = {
  q1_service?: string;
  q2_tedious?: string;
  q3_unclear?: string;
  q4_onemore?: string;
  q5_easier?: string;
};

// ---------------------------------------------------------------------------
// 到達度判定型・低入力進捗管理（daily tasks / progress report / topic progress）
// ---------------------------------------------------------------------------

/** 端末ローカルのタイムゾーンでの今日の日付（"YYYY-MM-DD"）。 */
export function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * /today の今日のメニューを daily_study_tasks に保存（fire-and-forget）。
 * 既存タスクは上書きしない（サーバー側 ignoreDuplicates）ので、
 * 表示のたびに呼んでも重複や実績の巻き戻しは起きない。
 */
export function saveDailyTasksToDb(
  userId: string,
  date: string,
  tasks: DailyStudyTaskInput[],
): void {
  if (tasks.length === 0) return;
  void fetch("/api/daily-tasks/upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, date, tasks }),
  }).catch(() => {
    /* fire-and-forget */
  });
}

/**
 * 1日1回の達成度報告を保存（同日上書き）。保存可否を返す。
 * user_id が無い（匿名）場合は false（保存せず UI は継続）。
 */
export async function reportDailyProgress(
  userId: string,
  date: string,
  selectedLevel: ProgressLevel,
  optionalReason: ProgressReason | null,
): Promise<boolean> {
  try {
    const res = await fetch("/api/daily-progress/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, date, selectedLevel, optionalReason }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 確認問題の結果を topic_progress に反映（fire-and-forget）。
 * 理解度はこの確認問題結果でのみ更新される（自己申告では上げない）。
 */
export function reportTopicQuizResult(
  userId: string,
  topicId: string,
  correct: number,
  total: number,
  date: string,
): void {
  void fetch("/api/topic-progress/quiz-result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, topicId, correct, total, date }),
  }).catch(() => {
    /* fire-and-forget */
  });
}

// ---------------------------------------------------------------------------
// 確認パック（第2弾）
// ---------------------------------------------------------------------------

/** question_attempts に保存する1件の回答。 */
export type QuestionAttemptInput = {
  questionId: string;
  questionType: "topic_quiz" | "exam_level" | "mini_exam" | "mock_exam";
  topicId: string;
  selectedAnswer?: string | null;
  isCorrect: boolean;
  mistakeReason?: string | null;
  timeSpentSeconds?: number | null;
  sourceTaskId?: string | null;
  answeredAt?: string | null;
};

/**
 * 問題の回答ログを question_attempts に保存（fire-and-forget）。
 * user_id が無い（匿名）場合は何もしない。失敗しても UI は止めない。
 */
export function saveQuestionAttempts(
  userId: string,
  attempts: QuestionAttemptInput[],
): void {
  if (attempts.length === 0) return;
  void fetch("/api/question-attempts/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, attempts }),
  }).catch(() => {
    /* fire-and-forget */
  });
}

export type CheckPackSubmitResult = {
  stage: string;
  resultStatus: "passed" | "review_needed" | "weak" | "incomplete";
  nextAction: string;
};

/**
 * 確認パックの結果を保存し、topic_progress.stage を更新する。
 * 成功すればサーバー判定（stage / resultStatus / nextAction）を返す。
 * 未ログイン・未設定・失敗なら null（呼び出し側はローカル判定で表示を継続）。
 */
export async function submitCheckPack(
  userId: string,
  input: {
    packId: string;
    topicId: string;
    quizRate: number | null;
    flashcardRate: number | null;
    examLevelRate: number | null;
    startedAt?: string;
    date?: string;
  },
): Promise<CheckPackSubmitResult | null> {
  try {
    const res = await fetch("/api/check-pack/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...input }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean } & Partial<CheckPackSubmitResult>;
    if (!data.ok || !data.stage || !data.resultStatus || !data.nextAction) return null;
    return {
      stage: data.stage,
      resultStatus: data.resultStatus,
      nextAction: data.nextAction,
    };
  } catch {
    return null;
  }
}

/** 1トピックの現在ステージを取得。未ログイン/未設定/失敗なら null。 */
export async function fetchTopicStage(
  userId: string,
  topicId: string,
): Promise<string | null> {
  try {
    const res = await fetch("/api/topic-progress/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, topicId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean; stage?: string };
    return data.ok && data.stage ? data.stage : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 統合進捗判定（第3弾）
// ---------------------------------------------------------------------------

/**
 * 統合進捗を計算して当日分を保存し、結果を返す（/progress・/today の表示用）。
 * 未ログイン・Supabase 未設定・失敗なら null（呼び出し側は非表示で継続）。
 */
export async function refreshIntegratedStatus(
  userId: string,
): Promise<IntegratedLearningStatus | null> {
  try {
    const res = await fetch("/api/integrated-status/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok: boolean;
      status?: IntegratedLearningStatus;
    };
    if (data.ok && data.status) {
      cacheIntegratedReadiness(data.status.readinessScore);
      return data.status;
    }
    return null;
  } catch {
    return null;
  }
}

/** 最新の統合進捗スナップショットを取得。未ログイン/未設定/未保存なら null。 */
export async function fetchLatestIntegratedStatus(
  userId: string,
): Promise<IntegratedLearningStatus | null> {
  try {
    const res = await fetch("/api/integrated-status/latest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok: boolean;
      status?: IntegratedLearningStatus | null;
    };
    if (data.ok && data.status) {
      cacheIntegratedReadiness(data.status.readinessScore);
      return data.status;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// リカバリ案・計画修正（第4弾）
// ---------------------------------------------------------------------------

/**
 * 最新の統合進捗から立て直し提案を生成（または同日の既存提案を再利用）して返す。
 * 未ログイン・Supabase 未設定・提案不要・失敗なら null（呼び出し側は非表示で継続）。
 */
export async function generatePlanAdjustment(
  userId: string,
): Promise<PlanAdjustmentProposal | null> {
  try {
    const res = await fetch("/api/plan-adjustment/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok: boolean;
      proposal?: PlanAdjustmentProposal | null;
    };
    return data.ok && data.proposal ? data.proposal : null;
  } catch {
    return null;
  }
}

/** 最新の有効な立て直し提案（proposed / accepted）を取得。無ければ null。 */
export async function fetchLatestPlanAdjustment(
  userId: string,
): Promise<PlanAdjustmentProposal | null> {
  try {
    const res = await fetch("/api/plan-adjustment/latest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok: boolean;
      proposal?: PlanAdjustmentProposal | null;
    };
    return data.ok && data.proposal ? data.proposal : null;
  } catch {
    return null;
  }
}

/**
 * 立て直し提案に応答する（承認 / 見送り）。
 * 承認時のみサーバー側で計画を補正する。更新後の提案を返す（失敗なら null）。
 */
export async function respondToPlanAdjustment(
  userId: string,
  proposalId: string,
  action: "accept" | "reject",
  selectedOptionId?: string,
): Promise<PlanAdjustmentProposal | null> {
  try {
    const res = await fetch("/api/plan-adjustment/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, proposalId, action, selectedOptionId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok: boolean;
      proposal?: PlanAdjustmentProposal | null;
    };
    return data.ok && data.proposal ? data.proposal : null;
  } catch {
    return null;
  }
}

/** フィードバックをDBへ保存。 */
export async function saveFeedbackToDb(
  userId: string,
  dayNo: number,
  feedback: FeedbackAnswers,
): Promise<boolean> {
  try {
    const res = await fetch("/api/feedback/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, dayNo, feedback }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
