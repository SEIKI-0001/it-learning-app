// モチット相談（AI 相談シート）のストア。ページ → 常駐モチットへの一方向の受け渡し口。
//
// - 開閉: 常駐モチットのタップ、または画面内の「モチットに聞く」ボタンから開く。
// - 表示中の問題: 問題画面が「回答後の問題」を公開する。未回答の問題は公開しない
//   （正解をモチットに聞けてしまうと確認問題・試験の判定材料が崩れるため）。
// - 今日のルート: Today が既存ロジックで決めたタスクを公開する（モチットは作り直さない）。
// - 振り返り: Today の完了を受けて、その日1回だけ「30秒だけ振り返る」を差し出す。
//
// どれも React 外の小さな外部ストア（useSyncExternalStore で読む）。学習ロジックには触れない。

import type {
  MochitQuestionContext,
  MochitTodaySnapshot,
} from "@/lib/mochitAi/types";

export type MochitReflectionStatus = "none" | "offered" | "dismissed" | "completed";

export type MochitConsultState = {
  open: boolean;
  /** 開くたびに増える（シートが「開いた瞬間」を知るため）。 */
  openSeq: number;
  /** 開いた入口。計測用。 */
  openedFrom: "pet" | "question_button" | "reflection" | null;
  /** 開くと同時に始めたい相談（「モチットに聞く」ボタン・振り返り）。 */
  pending: { kind: "question" | "reflection" } | null;
  /** 画面に表示中の、回答済みの問題。 */
  question: { owner: string; context: MochitQuestionContext } | null;
  today: MochitTodaySnapshot | null;
  reflection: { date: string; status: MochitReflectionStatus };
};

const REFLECTION_STORAGE_KEY = "fequest:mochitReflection:v1";

let state: MochitConsultState = {
  open: false,
  openSeq: 0,
  openedFrom: null,
  pending: null,
  question: null,
  today: null,
  reflection: { date: "", status: "none" },
};
const listeners = new Set<() => void>();

function emit(next: MochitConsultState) {
  state = next;
  for (const listener of listeners) listener();
}

export function subscribeMochitConsult(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMochitConsultSnapshot(): MochitConsultState {
  return state;
}

export function openMochitConsult(options: {
  from?: MochitConsultState["openedFrom"];
  question?: MochitQuestionContext;
  reflection?: boolean;
} = {}) {
  const question = options.question
    ? { owner: "ask-button", context: options.question }
    : state.question;
  emit({
    ...state,
    open: true,
    openSeq: state.openSeq + 1,
    openedFrom: options.from ?? "pet",
    question,
    pending: options.question ? { kind: "question" } : options.reflection ? { kind: "reflection" } : null,
  });
}

export function closeMochitConsult() {
  if (!state.open) return;
  emit({ ...state, open: false, pending: null });
}

/** 開いた直後の相談を受け取ったら消す（二重に送らない）。 */
export function consumeMochitConsultPending() {
  if (!state.pending) return;
  emit({ ...state, pending: null });
}

/**
 * 表示中の回答済み問題を公開する。owner は公開したコンポーネントの識別子で、
 * 取り下げ（null）は同じ owner のものだけを消す（別の問題を消さない）。
 */
export function publishMochitQuestion(owner: string, context: MochitQuestionContext | null) {
  if (context) {
    if (state.question?.owner === owner && state.question.context.questionId === context.questionId
      && state.question.context.selectedLabel === context.selectedLabel) return;
    emit({ ...state, question: { owner, context } });
    return;
  }
  if (state.question?.owner !== owner) return;
  emit({ ...state, question: null });
}

export function publishMochitToday(snapshot: MochitTodaySnapshot | null) {
  if (JSON.stringify(state.today) === JSON.stringify(snapshot)) return;
  emit({ ...state, today: snapshot });
}

// ---------------------------------------------------------------------------
// 振り返り（1日1回・強制しない）
// ---------------------------------------------------------------------------

function readReflectionRecord(): { date: string; status: MochitReflectionStatus } | null {
  try {
    const raw = window.localStorage.getItem(REFLECTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { date?: unknown; status?: unknown };
    if (typeof parsed.date !== "string") return null;
    if (parsed.status !== "dismissed" && parsed.status !== "completed") return null;
    return { date: parsed.date, status: parsed.status };
  } catch {
    return null;
  }
}

function writeReflectionRecord(date: string, status: "dismissed" | "completed") {
  try {
    window.localStorage.setItem(REFLECTION_STORAGE_KEY, JSON.stringify({ date, status }));
  } catch {
    // 保存できなくても、その画面の間は同じ状態を保つ
  }
}

/**
 * 今日の学習が完了したときに呼ぶ。その日にもう閉じた／終えた振り返りは出し直さない。
 * 新しく差し出したときだけ true。
 */
export function offerMochitReflection(date: string): boolean {
  if (state.reflection.date === date && state.reflection.status !== "none") return false;
  const record = readReflectionRecord();
  if (record && record.date === date) {
    emit({ ...state, reflection: record });
    return false;
  }
  emit({ ...state, reflection: { date, status: "offered" } });
  return true;
}

export function settleMochitReflection(status: "dismissed" | "completed") {
  const { date } = state.reflection;
  if (!date) return;
  writeReflectionRecord(date, status);
  emit({ ...state, reflection: { date, status } });
}

/** テスト用：ストアを初期状態へ戻す。 */
export function resetMochitConsultStoreForTest() {
  state = {
    open: false,
    openSeq: 0,
    openedFrom: null,
    pending: null,
    question: null,
    today: null,
    reflection: { date: "", status: "none" },
  };
  for (const listener of listeners) listener();
}
