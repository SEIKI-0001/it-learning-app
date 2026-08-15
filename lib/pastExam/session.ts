// 公式過去問 年度別演習の途中状態（localStorage）。
//
// 設計の要点:
//   - キーは fequest: プレフィクス。ログアウト・アカウント切替時の
//     clearLocalUserData() でまとめて消える（別ユーザーへの持ち越しを防ぐ）。
//   - さらにキーへ userId を含める。同じ端末を共有していても、
//     別ユーザーの途中状態を読み出さない。未ログイン（userId なし）は "anon"。
//   - 本番モードの残り時間は「保存した startedAt からの経過」で毎回計算する。
//     残り秒数そのものを保存すると、リロードで120分に戻ったり、
//     タブを閉じている間の経過が無視されたりする。
//   - 完了した演習は途中状態として復元しない（結果画面は別途保持する）。

import type { ChoiceKey, QuestionExposureState } from "@/types";
import type { PastExamMode, PastExamSession } from "@/types/pastExam";
import { EXAM_MODE_DURATION_MINUTES } from "@/types/pastExam";

const KEY_PREFIX = "fequest:pastExam";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * 途中状態の保存キー。ユーザー・年度・モードごとに分ける。
 * userId が無い（未ログイン）場合は "anon"。ログイン後に userId が付いても
 * anon の状態を引き継がない（別人の可能性があるため）。
 */
export function sessionStorageKey(
  userId: string | null,
  year: number,
  mode: PastExamMode,
): string {
  return `${KEY_PREFIX}:${userId ?? "anon"}:${year}:${mode}`;
}

function isValidSession(value: unknown): value is PastExamSession {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Partial<PastExamSession>;
  return (
    s.schemaVersion === 1 &&
    typeof s.sessionId === "string" &&
    typeof s.year === "number" &&
    (s.mode === "practice" || s.mode === "exam") &&
    typeof s.startedAt === "string" &&
    !Number.isNaN(Date.parse(s.startedAt)) &&
    typeof s.currentIndex === "number" &&
    typeof s.answers === "object" &&
    s.answers !== null &&
    typeof s.completed === "boolean"
  );
}

/** 途中状態を読む。壊れていた場合・完了済みの場合は null。 */
export function loadSession(
  userId: string | null,
  year: number,
  mode: PastExamMode,
): PastExamSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(sessionStorageKey(userId, year, mode));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSession(parsed)) return null;
    // 別の年度・モードのデータが同じキーに入っていたら信用しない。
    if (parsed.year !== year || parsed.mode !== mode) return null;
    if (parsed.completed) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** 途中状態を書く。保存に失敗しても演習は続行できるよう、例外は投げない。 */
export function saveSession(userId: string | null, session: PastExamSession): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      sessionStorageKey(userId, session.year, session.mode),
      JSON.stringify(session),
    );
  } catch {
    /* 容量超過などは無視する（画面を止めない） */
  }
  notifyChange();
}

/** 途中状態を消す。採点が終わったときと、やり直しを選んだときに呼ぶ。 */
export function clearSession(
  userId: string | null,
  year: number,
  mode: PastExamMode,
): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(sessionStorageKey(userId, year, mode));
  } catch {
    /* ignore */
  }
  notifyChange();
}

// ---------------------------------------------------------------------------
// useSyncExternalStore 用の購読口
// ---------------------------------------------------------------------------
//
// 「マウント後に localStorage を読む」を useEffect + setState でやると
// カスケードレンダリングになる（react-hooks/set-state-in-effect）。
// リポジトリ内の既存パターン（floatingMochitPreferences）に合わせて、
// 外部ストアとして購読する形にする。
//
// スナップショットは必ず文字列（プリミティブ）を返すこと。
// オブジェクトを返すと毎回参照が変わり、無限再レンダリングになる。

export const PAST_EXAM_CHANGE_EVENT = "fequest:pastExam:change";

function notifyChange(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(PAST_EXAM_CHANGE_EVENT));
}

/** 途中状態の変化（保存・削除・別タブでの更新）を購読する。 */
export function subscribeToSessions(listener: () => void): () => void {
  if (!isBrowser()) return () => undefined;

  const handleLocal = () => listener();
  const handleStorage = (event: StorageEvent) => {
    if (event.key && !event.key.startsWith(KEY_PREFIX)) return;
    listener();
  };

  window.addEventListener(PAST_EXAM_CHANGE_EVENT, handleLocal);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(PAST_EXAM_CHANGE_EVENT, handleLocal);
    window.removeEventListener("storage", handleStorage);
  };
}

/**
 * 「どのモードに再開可能な途中状態があるか」を文字列で返す。
 * 例: "practice" / "exam" / "practice,exam" / ""（なし）。
 * userId もキーに含めるので、アカウントが切り替われば別の値になる。
 */
export function getResumableSnapshot(userId: string | null, year: number): string {
  if (!isBrowser()) return "";
  const modes: PastExamMode[] = ["practice", "exam"];
  return modes.filter((mode) => loadSession(userId, year, mode) !== null).join(",");
}

/** サーバ描画時は「まだ分からない」を表す null。 */
export function getResumableServerSnapshot(): null {
  return null;
}

/** getResumableSnapshot の文字列を扱いやすい形にする。 */
export function parseResumable(snapshot: string | null): Record<PastExamMode, boolean> {
  const set = new Set((snapshot ?? "").split(",").filter(Boolean));
  return { practice: set.has("practice"), exam: set.has("exam") };
}

/** 新しい演習を始める。sessionId は attempt_group_id としてDBにも渡る。 */
export function createSession(
  year: number,
  mode: PastExamMode,
  now: Date = new Date(),
): PastExamSession {
  return {
    schemaVersion: 1,
    sessionId: newSessionId(),
    year,
    mode,
    startedAt: now.toISOString(),
    currentIndex: 0,
    answers: {},
    completed: false,
  };
}

/** crypto.randomUUID が無い環境（古いブラウザ・テスト）でも動くID生成。 */
function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `pe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 回答を記録した新しいセッションを返す（引数は変更しない）。
 * 同じ問題に answer し直した場合、所要時間は累計する。
 */
export function withAnswer(
  session: PastExamSession,
  questionNumber: number,
  selected: ChoiceKey | null,
  elapsedSeconds: number,
  now: Date = new Date(),
): PastExamSession {
  const previous = session.answers[questionNumber];
  return {
    ...session,
    answers: {
      ...session.answers,
      [questionNumber]: {
        selected,
        answeredAt: now.toISOString(),
        ...(previous?.exposureState
          ? { exposureState: previous.exposureState }
          : {}),
        timeSpentSeconds: Math.max(
          0,
          Math.round((previous?.timeSpentSeconds ?? 0) + elapsedSeconds),
        ),
      },
    },
  };
}

/** 回答保存時に確定した初見状態だけを追記する（旧セッションとの互換を保つ）。 */
export function withAnswerExposure(
  session: PastExamSession,
  questionNumber: number,
  exposureState: QuestionExposureState,
): PastExamSession {
  const answer = session.answers[questionNumber];
  if (!answer) return session;
  return {
    ...session,
    answers: {
      ...session.answers,
      [questionNumber]: { ...answer, exposureState },
    },
  };
}

// ---------------------------------------------------------------------------
// 本番モードのタイマー
// ---------------------------------------------------------------------------

/** 本番モードの制限時間（秒）。 */
export const EXAM_MODE_DURATION_SECONDS = EXAM_MODE_DURATION_MINUTES * 60;

/**
 * 残り秒数を、保存された開始時刻からの経過で求める。
 * リロードやタブの再表示があっても、開始時刻が変わらない限り残り時間は戻らない。
 * 0 未満にはしない（時間切れは 0）。
 */
export function remainingSeconds(
  session: Pick<PastExamSession, "startedAt">,
  now: Date = new Date(),
): number {
  const started = Date.parse(session.startedAt);
  if (Number.isNaN(started)) return 0;
  const elapsed = Math.floor((now.getTime() - started) / 1000);
  return Math.max(0, EXAM_MODE_DURATION_SECONDS - elapsed);
}

/** 時間切れか。 */
export function isTimeUp(
  session: Pick<PastExamSession, "startedAt">,
  now: Date = new Date(),
): boolean {
  return remainingSeconds(session, now) <= 0;
}

/** 残り秒数を "mm:ss" / "h:mm:ss" 表記にする。 */
export function formatRemaining(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
