"use client";

import type {
  AppState,
  QuestionExposure,
  QuestionExposureMap,
  QuestionExposureState,
  UserAnswer,
  UserProfile,
  UserProgress,
} from "@/types";
import {
  getAnonymousQuestionExposureStates,
  getUnknownQuestionExposureStates,
} from "@/lib/questionExposure";
import type {
  DailyStudyTaskInput,
  ProgressLevel,
  ProgressReason,
} from "@/types/studyProgress";
import type { IntegratedLearningStatus } from "@/types/integratedStatus";
import type { PlanAdjustmentProposal } from "@/types/planAdjustment";
import type { AiGradingBootstrapResult } from "@/types/aiGrading";
import type { ExamReadinessResult } from "@/types/examReadiness";

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
  examReadiness: ExamReadinessResult | null;
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

// ---------------------------------------------------------------------------
// 初期表示ブートストラップの localStorage キャッシュ（stale-while-revalidate）
// ---------------------------------------------------------------------------
// /progress・/ai-grading は前回のサーバー応答を即表示し、最新値は背景フェッチで
// 差し替える。fequest: プレフィクスなので clearLocalUserData（ログアウト/切替）で
// 自動的に消える。二重の保険として保存時の userId も照合する。

const PROGRESS_BOOTSTRAP_CACHE_KEY = "fequest:progressBootstrapCache";
const AI_GRADING_BOOTSTRAP_CACHE_KEY = "fequest:aiGradingBootstrapCache";
const BOOTSTRAP_CACHE_TTL_MS = 24 * 60 * 60_000;

type BootstrapCacheEnvelope<T> = {
  userId: string | null;
  savedAt: number;
  data: T;
};

function readBootstrapCache<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BootstrapCacheEnvelope<T> | null;
    if (!parsed || typeof parsed !== "object" || !parsed.data) return null;
    if (
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > BOOTSTRAP_CACHE_TTL_MS
    ) {
      return null;
    }
    // 別ユーザーのキャッシュは使わない（アカウント切替の取りこぼし防止）。
    const currentUserId = getUserId();
    if (parsed.userId && currentUserId && parsed.userId !== currentUserId) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeBootstrapCache<T>(key: string, userId: string | null, data: T): void {
  if (!isBrowser()) return;
  try {
    const envelope: BootstrapCacheEnvelope<T> = {
      userId,
      savedAt: Date.now(),
      data,
    };
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    /* 容量超過などで書けなくても表示は継続 */
  }
}

/** /progress 用にキャッシュする範囲（AppState は localStorage 本体があるため含めない）。 */
export type ProgressBootstrapCache = {
  integratedStatus: IntegratedLearningStatus | null;
  examReadiness: ExamReadinessResult | null;
  planAdjustmentProposal: PlanAdjustmentProposal | null;
};

export function loadCachedProgressBootstrap(): ProgressBootstrapCache | null {
  return readBootstrapCache<ProgressBootstrapCache>(PROGRESS_BOOTSTRAP_CACHE_KEY);
}

export function saveCachedProgressBootstrap(
  userId: string | null,
  data: ProgressBootstrapCache,
): void {
  writeBootstrapCache(PROGRESS_BOOTSTRAP_CACHE_KEY, userId, data);
}

// 採点履歴は本文込みで大きくなり得るため、キャッシュには直近分だけ残す。
const AI_GRADING_CACHE_HISTORY_LIMIT = 50;

export function loadCachedAiGradingBootstrap(): AiGradingBootstrapResult | null {
  return readBootstrapCache<AiGradingBootstrapResult>(AI_GRADING_BOOTSTRAP_CACHE_KEY);
}

export function saveCachedAiGradingBootstrap(data: AiGradingBootstrapResult): void {
  writeBootstrapCache(AI_GRADING_BOOTSTRAP_CACHE_KEY, data.userId, {
    ...data,
    gradingHistory: data.gradingHistory.slice(0, AI_GRADING_CACHE_HISTORY_LIMIT),
  });
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
    const result: ProgressBootstrapResult = {
      userId: data.userId,
      appState: data.appState ?? null,
      integratedStatus: data.integratedStatus ?? null,
      examReadiness: data.examReadiness ?? null,
      planAdjustmentProposal: data.planAdjustmentProposal ?? null,
    };
    // 次回の /progress 初期表示を即時にするためキャッシュを更新する。
    saveCachedProgressBootstrap(data.userId, {
      integratedStatus: result.integratedStatus,
      examReadiness: result.examReadiness,
      planAdjustmentProposal: result.planAdjustmentProposal,
    });
    return result;
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
    const result: AiGradingBootstrapResult = {
      userId: data.userId ?? null,
      billingStatus: data.billingStatus,
      gradingHistory: data.gradingHistory,
      initialQuestionIndex:
        typeof data.initialQuestionIndex === "number"
          ? data.initialQuestionIndex
          : 0,
    };
    // 次回の /ai-grading 初期表示を即時にするためキャッシュを更新する。
    saveCachedAiGradingBootstrap(result);
    return result;
  } catch {
    return null;
  }
}

export type ReadinessTriggerInput = {
  triggerType: "learning_complete" | "review_complete" | "assessment";
  triggerId: string;
};

/**
 * 進捗をDBへ保存する。完了イベントは Promise を await し、通常の UI 同期は返り値を
 * 待たず従来どおり fire-and-forget で使える。
 */
export async function saveProgressToDb(
  userId: string,
  progress: UserProgress,
  readinessTrigger?: ReadinessTriggerInput | null,
): Promise<boolean> {
  try {
    const response = await fetch("/api/progress/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, progress, readinessTrigger: readinessTrigger ?? undefined }),
    });
    return response.ok;
  } catch {
    return false;
  }
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
 * 確認問題の結果を topic_progress に反映する。
 * 理解度はこの確認問題結果でのみ更新される（自己申告では上げない）。
 */
export async function reportTopicQuizResult(
  userId: string,
  topicId: string,
  correct: number,
  total: number,
  date: string,
  completionId: string,
): Promise<boolean> {
  try {
    const response = await fetch("/api/topic-progress/quiz-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, topicId, correct, total, date, completionId }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 確認パック（第2弾）
// ---------------------------------------------------------------------------

/** question_attempts に保存する1件の回答。 */
export type QuestionAttemptInput = {
  questionId: string;
  questionType:
    | "topic_quiz"
    | "exam_level"
    | "mini_exam"
    | "mock_exam"
    | "theme_exam"
    | "official_past";
  topicId: string;
  selectedAnswer?: string | null;
  isCorrect: boolean;
  mistakeReason?: string | null;
  timeSpentSeconds?: number | null;
  sourceTaskId?: string | null;
  answeredAt?: string | null;
  attemptMode?: "practice" | "exam" | null;
  attemptGroupId?: string | null;
};

function isQuestionExposureState(value: unknown): value is QuestionExposureState {
  return value === "first" || value === "seen" || value === "unknown";
}

function parseQuestionExposure(value: unknown): QuestionExposure | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.questionId !== "string"
    || row.questionId.length === 0
    || !isQuestionExposureState(row.state)
    || (row.attemptedBefore !== null && typeof row.attemptedBefore !== "boolean")
    || (row.firstAttemptAt !== null && typeof row.firstAttemptAt !== "string")
    || (row.attemptCount !== null
      && (typeof row.attemptCount !== "number" || !Number.isInteger(row.attemptCount)))
  ) return null;
  return row as QuestionExposure;
}

/**
 * Logged-in answer batch persistence and authoritative exposure classification.
 * Any unavailable or incomplete server result becomes unknown for the whole batch.
 */
export async function saveQuestionAttemptsWithExposure(
  userId: string,
  attempts: QuestionAttemptInput[],
): Promise<QuestionExposureMap> {
  const questionIds = attempts.map((attempt) => attempt.questionId);
  if (attempts.length === 0) return {};
  const unknown = getUnknownQuestionExposureStates(questionIds);
  try {
    const response = await fetch("/api/question-attempts/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, attempts }),
    });
    if (!response.ok) return unknown;
    const body = await response.json() as { ok?: boolean; exposures?: unknown };
    if (!body.ok || !Array.isArray(body.exposures)) return unknown;

    const exposures = body.exposures.map(parseQuestionExposure);
    if (exposures.some((exposure) => exposure === null)) return unknown;
    const result: Record<string, QuestionExposure> = { ...unknown };
    for (const exposure of exposures) {
      if (exposure && exposure.questionId in result) {
        result[exposure.questionId] = exposure;
      }
    }
    return result;
  } catch {
    return unknown;
  }
}

export type CurrentSessionQuestionExposureResult = {
  authState: "authenticated" | "anonymous" | "unknown";
  userId: string | null;
  exposures: QuestionExposureMap;
};

export type AuthenticatedQuestionExposureResult = {
  authState: "authenticated";
  userId: string;
  exposures: QuestionExposureMap;
};

export type AssessmentAttemptSaveErrorCode =
  | "network"
  | "http"
  | "malformed_response"
  | "authentication";

export class AssessmentAttemptSaveError extends Error {
  constructor(
    readonly code: AssessmentAttemptSaveErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AssessmentAttemptSaveError";
  }
}

export type QuestionExposureIdentity = Pick<
  CurrentSessionQuestionExposureResult,
  "authState" | "userId"
>;

export type StartAssessmentSessionInput = {
  action: "start";
  sessionId: string;
  source: "checkpoint" | "summary" | "mock" | "official_past";
  mode: "practice" | "exam";
  startedAt: string;
  questionCount: number;
};

export type CompleteAssessmentSessionInput = {
  action: "complete";
  sessionId: string;
  completedAt: string;
  answers: Array<{
    idempotencyKey: string;
    canonicalQuestionId: string;
    topicId: string;
    isCorrect: boolean;
    answeredAt: string;
  }>;
};

export type AbandonAssessmentSessionInput = {
  action: "abandon";
  sessionId: string;
  completedAt: string;
};

export type AssessmentSessionLifecycle = {
  sessionId: string;
  status: "in_progress" | "completed" | "abandoned";
};

export type AssessmentSessionClientErrorCode =
  | "network"
  | "http"
  | "malformed_response"
  | "unexpected_status";

export class AssessmentSessionClientError extends Error {
  constructor(
    readonly code: AssessmentSessionClientErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AssessmentSessionClientError";
  }
}

/** Creates a database-compatible UUID even in older browsers without randomUUID(). */
export function createAssessmentSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function assessmentAnswerIdempotencyKey(
  sessionId: string,
  canonicalQuestionId: string,
): string {
  return `assessment:${sessionId}:${canonicalQuestionId}`;
}

export function startAssessmentSessionForCurrentSession(
  input: StartAssessmentSessionInput,
): Promise<AssessmentSessionLifecycle> {
  return postAssessmentSession(input);
}

export function completeAssessmentSessionForCurrentSession(
  input: CompleteAssessmentSessionInput,
): Promise<AssessmentSessionLifecycle> {
  return postAssessmentSession(input);
}

export function abandonAssessmentSessionForCurrentSession(
  input: AbandonAssessmentSessionInput,
): Promise<AssessmentSessionLifecycle> {
  return postAssessmentSession(input);
}

async function postAssessmentSession(
  input:
    | StartAssessmentSessionInput
    | CompleteAssessmentSessionInput
    | AbandonAssessmentSessionInput,
): Promise<AssessmentSessionLifecycle> {
  let response: Response;
  try {
    response = await fetch("/api/assessment-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (cause) {
    throw new AssessmentSessionClientError(
      "network",
      cause instanceof Error ? cause.message : "Assessment session request failed",
    );
  }
  if (!response.ok) {
    throw new AssessmentSessionClientError(
      "http",
      `Assessment session request returned HTTP ${response.status}`,
    );
  }

  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new AssessmentSessionClientError(
      "malformed_response",
      "Assessment session response was not valid JSON",
    );
  }
  if (
    !isClientRecord(value)
    || value.ok !== true
    || !isClientRecord(value.session)
    || value.session.sessionId !== input.sessionId
    || !isAssessmentSessionStatus(value.session.status)
  ) {
    throw new AssessmentSessionClientError(
      "malformed_response",
      "Assessment session response did not contain a valid lifecycle",
    );
  }
  const expectedStatus = input.action === "start"
    ? "in_progress"
    : input.action === "complete"
      ? "completed"
      : "abandoned";
  if (value.session.status !== expectedStatus) {
    throw new AssessmentSessionClientError(
      "unexpected_status",
      `Assessment session returned ${value.session.status} for ${input.action}`,
    );
  }
  return {
    sessionId: value.session.sessionId,
    status: value.session.status,
  };
}

function isClientRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAssessmentSessionStatus(
  value: unknown,
): value is AssessmentSessionLifecycle["status"] {
  return value === "in_progress" || value === "completed" || value === "abandoned";
}

/** Resolve only a server-cookie identity; localStorage is never an authority. */
export async function resolveQuestionExposureIdentity(): Promise<QuestionExposureIdentity> {
  try {
    const response = await fetch("/api/session/state", { method: "GET" });
    if (response.status === 401) {
      clearUserId();
      return { authState: "anonymous", userId: null };
    }
    if (!response.ok) return { authState: "unknown", userId: null };
    const body = await response.json() as { ok?: boolean; userId?: unknown };
    if (!body.ok || typeof body.userId !== "string" || body.userId.length === 0) {
      return { authState: "unknown", userId: null };
    }
    setUserId(body.userId);
    return { authState: "authenticated", userId: body.userId };
  } catch {
    return { authState: "unknown", userId: null };
  }
}

/**
 * Records a batch against the cookie-authenticated user. A local user ID is
 * deliberately never sent: the response's userId is the server-confirmed
 * identity used by subsequent progress writers.
 */
export async function saveQuestionAttemptsForCurrentSession(
  attempts: QuestionAttemptInput[],
  anonymousAnswers: UserAnswer[],
): Promise<CurrentSessionQuestionExposureResult> {
  const questionIds = attempts.map((attempt) => attempt.questionId);
  if (attempts.length === 0) {
    return { authState: "unknown", userId: null, exposures: {} };
  }
  const unknown = getUnknownQuestionExposureStates(questionIds);
  try {
    const response = await fetch("/api/question-attempts/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempts }),
    });
    if (response.status === 401) {
      clearUserId();
      return {
        authState: "anonymous",
        userId: null,
        exposures: getAnonymousQuestionExposureStates(anonymousAnswers, questionIds),
      };
    }
    if (!response.ok) {
      return { authState: "unknown", userId: null, exposures: unknown };
    }
    const body = await response.json() as {
      ok?: boolean;
      userId?: unknown;
      exposures?: unknown;
    };
    if (
      !body.ok
      || typeof body.userId !== "string"
      || body.userId.length === 0
      || !Array.isArray(body.exposures)
    ) {
      return { authState: "unknown", userId: null, exposures: unknown };
    }
    const parsed = body.exposures.map(parseQuestionExposure);
    const requestedIds = new Set(questionIds);
    const returnedIds = new Set(
      parsed.flatMap((exposure) => exposure ? [exposure.questionId] : []),
    );
    if (
      parsed.some((exposure) => exposure === null)
      || parsed.length !== requestedIds.size
      || returnedIds.size !== parsed.length
      || [...requestedIds].some((questionId) => !returnedIds.has(questionId))
    ) {
      return { authState: "unknown", userId: null, exposures: unknown };
    }
    setUserId(body.userId);
    return {
      authState: "authenticated",
      userId: body.userId,
      exposures: Object.fromEntries(
        parsed.map((exposure) => [exposure!.questionId, exposure!]),
      ),
    };
  } catch {
    return { authState: "unknown", userId: null, exposures: unknown };
  }
}

/**
 * Strict assessment persistence contract. Assessment finalization may proceed
 * only after the server confirms an authenticated, complete authoritative
 * exposure response. Every ambiguous outcome throws so the caller can retry
 * its unchanged frozen batch.
 */
export async function saveAssessmentQuestionAttemptsForCurrentSession(
  attempts: QuestionAttemptInput[],
): Promise<AuthenticatedQuestionExposureResult> {
  const questionIds = attempts.map((attempt) => attempt.questionId);
  const requestedIds = new Set(questionIds);
  if (attempts.length === 0 || requestedIds.size !== attempts.length) {
    throw new AssessmentAttemptSaveError(
      "malformed_response",
      "assessment attempt batch must contain unique questions",
    );
  }

  let response: Response;
  try {
    response = await fetch("/api/question-attempts/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempts }),
    });
  } catch {
    throw new AssessmentAttemptSaveError(
      "network",
      "assessment attempt save response was not acknowledged",
    );
  }

  if (response.status === 401) {
    clearUserId();
    throw new AssessmentAttemptSaveError(
      "authentication",
      "assessment attempt save requires authentication",
    );
  }
  if (!response.ok) {
    throw new AssessmentAttemptSaveError(
      "http",
      `assessment attempt save failed with HTTP ${response.status}`,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AssessmentAttemptSaveError(
      "malformed_response",
      "assessment attempt save returned malformed JSON",
    );
  }

  if (
    !isClientRecord(body)
    || body.ok !== true
    || typeof body.userId !== "string"
    || body.userId.length === 0
    || !Array.isArray(body.exposures)
  ) {
    throw new AssessmentAttemptSaveError(
      "malformed_response",
      "assessment attempt save returned an invalid response",
    );
  }

  const parsed = body.exposures.map(parseQuestionExposure);
  const returnedIds = new Set(
    parsed.flatMap((exposure) => exposure ? [exposure.questionId] : []),
  );
  if (
    parsed.some((exposure) => exposure === null)
    || parsed.some((exposure) =>
      exposure!.attemptedBefore === null
      || exposure!.attemptCount === null
      || exposure!.attemptCount < 0
    )
    || parsed.length !== requestedIds.size
    || returnedIds.size !== parsed.length
    || [...requestedIds].some((questionId) => !returnedIds.has(questionId))
    || [...returnedIds].some((questionId) => !requestedIds.has(questionId))
  ) {
    throw new AssessmentAttemptSaveError(
      "malformed_response",
      "assessment attempt save returned incomplete exposures",
    );
  }

  setUserId(body.userId);
  return {
    authState: "authenticated",
    userId: body.userId,
    exposures: Object.fromEntries(
      parsed.map((exposure) => [exposure!.questionId, exposure!]),
    ),
  };
}

/** Compatibility wrapper exposing authoritative persistence to completion callers. */
export function saveQuestionAttempts(
  userId: string,
  attempts: QuestionAttemptInput[],
): Promise<QuestionExposureMap> {
  return saveQuestionAttemptsWithExposure(userId, attempts);
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
    startedAt: string;
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
 * 予定の健全性を計算して当日分を保存し、同じサーバー処理で読んだ共有
 * Exam Readiness と一緒に返す（Today で current を重複取得しないため）。
 * 未ログイン・Supabase 未設定・失敗なら null（呼び出し側は非表示で継続）。
 */
export async function refreshIntegratedStatus(
  userId: string,
): Promise<{
  status: IntegratedLearningStatus;
  examReadiness: ExamReadinessResult | null;
} | null> {
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
      examReadiness?: ExamReadinessResult | null;
    };
    if (data.ok && data.status) {
      const examReadiness = data.examReadiness ?? null;
      const cached = loadCachedProgressBootstrap();
      saveCachedProgressBootstrap(getUserId(), {
        integratedStatus: data.status,
        examReadiness,
        planAdjustmentProposal: cached?.planAdjustmentProposal ?? null,
      });
      return { status: data.status, examReadiness };
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
    if (data.ok && data.status) return data.status;
    return null;
  } catch {
    return null;
  }
}

/** セッション本人の完全な最新 Exam Readiness 結果を取得する。 */
export async function fetchCurrentExamReadiness(): Promise<ExamReadinessResult | null> {
  try {
    const response = await fetch("/api/exam-readiness/current", {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = await response.json() as {
      ok?: boolean;
      readiness?: ExamReadinessResult | null;
    };
    if (!body.ok) return null;
    const readiness = body.readiness ?? null;
    const cached = loadCachedProgressBootstrap();
    saveCachedProgressBootstrap(getUserId(), {
      integratedStatus: cached?.integratedStatus ?? null,
      examReadiness: readiness,
      planAdjustmentProposal: cached?.planAdjustmentProposal ?? null,
    });
    return readiness;
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
