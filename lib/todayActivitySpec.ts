// Today のトピック以外のタスクを「復元に必要な最小限の中身（spec）」で表す。
//
// spec は daily_study_tasks.activity_payload にそのまま保存され、別端末でも同じ spec から
// 同じタスク（タイトル・対象の単語/問題・リンク）を組み立て直す。表示文言は保存しない
// （文言を直しても保存済みのタスクに古い文言が残らないように）。
//
// このモジュールは依存を持たない（API ルートの入力検証からも使う）。
// spec → TodayActivity の組み立ては lib/todayVocab・lib/todayKakomon が担う。

import type { TodayActivityKind } from "@/types";
import type { TopicField } from "@/types/content";

export const ACTIVITY_PAYLOAD_VERSION = 1;

export type VocabSpec = {
  kind: "vocab";
  /** stabilizing=用語定着待ち / review=期限・苦手 / related=今日のトピックの未学習語 */
  variant: "stabilizing" | "review" | "related";
  wordIds: string[];
  /** review のうち期限が来ている語数（残りは苦手語）。 */
  dueCount?: number;
  /** stabilizing / related の元トピック。 */
  topicId?: string;
  /** CP5 以降の復習語（優先度が変わる）。 */
  late?: boolean;
};

export type PastExamRetrySpec = {
  kind: "past_exam_retry";
  questionIds: string[];
  /** 解き直し待ちの総数（出題はそのうち questionIds だけ）。 */
  pendingTotal: number;
};

export type DrillReason = "cp5_field" | "standard" | "early_exam_near" | "early_strong";

export type PastExamDrillSpec = {
  kind: "past_exam_drill";
  stage: "field-drill" | "mixed" | "random";
  count: number;
  field?: TopicField;
  /** 分野別演習を出した時点の、その分野の回答数。 */
  answered?: number;
  reason: DrillReason;
  /** 演習画面で選んだ問題（最初に開いた端末で決まり、以後どの端末でも同じ問題）。 */
  questionIds?: string[];
};

export type PastExamMockSpec = {
  kind: "past_exam_mock";
  year: number;
};

export type TodayActivitySpec = VocabSpec | PastExamRetrySpec | PastExamDrillSpec | PastExamMockSpec;

export type TodayActivityPayload = TodayActivitySpec & { v: typeof ACTIVITY_PAYLOAD_VERSION };

/** activity の種類 → その日の識別子（1日1件/識別子）。 */
export const ACTIVITY_KEYS = {
  vocab: "act:vocab",
  past_exam_drill: "act:past-exam",
  past_exam_mock: "act:past-exam",
  past_exam_retry: "act:past-exam-retry",
} as const satisfies Record<TodayActivityKind, string>;

export type TodayActivityKey = (typeof ACTIVITY_KEYS)[TodayActivityKind];

export const ALL_ACTIVITY_KEYS: readonly TodayActivityKey[] = ["act:vocab", "act:past-exam", "act:past-exam-retry"];

export function isActivityKey(value: unknown): value is TodayActivityKey {
  return ALL_ACTIVITY_KEYS.includes(value as TodayActivityKey);
}

/** daily_study_tasks.task_type（vocab は既存の flashcard を再利用する）。 */
export const ACTIVITY_TASK_TYPES = {
  vocab: "flashcard",
  past_exam_drill: "past_exam_drill",
  past_exam_retry: "past_exam_retry",
  past_exam_mock: "past_exam_mock",
} as const satisfies Record<TodayActivityKind, string>;

const MAX_IDS = 30;
const ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const FIELDS: readonly TopicField[] = ["strategy", "management", "technology"];

function ids(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_IDS) return null;
  return value.every((id) => typeof id === "string" && ID.test(id)) ? [...value] : null;
}

function optionalIds(value: unknown): string[] | undefined | null {
  return value === undefined ? undefined : ids(value);
}

function nonNegativeInt(value: unknown, max = 10_000): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;
}

function optionalTopicId(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  return typeof value === "string" && ID.test(value) ? value : null;
}

/**
 * 保存された payload を検証して spec に戻す（不正・未知の版なら null）。
 * API の入力検証と、DB から読んだ値の復元の両方で使う。
 */
export function parseActivityPayload(value: unknown): TodayActivitySpec | null {
  if (typeof value !== "object" || value === null) return null;
  const p = value as Record<string, unknown>;
  if (p.v !== ACTIVITY_PAYLOAD_VERSION) return null;

  if (p.kind === "vocab") {
    const wordIds = ids(p.wordIds);
    const topicId = optionalTopicId(p.topicId);
    if (!wordIds || topicId === null) return null;
    if (p.variant !== "stabilizing" && p.variant !== "review" && p.variant !== "related") return null;
    if (p.dueCount !== undefined && !nonNegativeInt(p.dueCount, wordIds.length)) return null;
    if (p.late !== undefined && typeof p.late !== "boolean") return null;
    if (p.variant !== "review" && !topicId) return null;
    return {
      kind: "vocab",
      variant: p.variant,
      wordIds,
      ...(p.dueCount === undefined ? {} : { dueCount: p.dueCount as number }),
      ...(topicId ? { topicId } : {}),
      ...(p.late === undefined ? {} : { late: p.late as boolean }),
    };
  }

  if (p.kind === "past_exam_retry") {
    const questionIds = ids(p.questionIds);
    if (!questionIds || !nonNegativeInt(p.pendingTotal)) return null;
    return { kind: "past_exam_retry", questionIds, pendingTotal: p.pendingTotal as number };
  }

  if (p.kind === "past_exam_drill") {
    if (p.stage !== "field-drill" && p.stage !== "mixed" && p.stage !== "random") return null;
    if (!nonNegativeInt(p.count, MAX_IDS) || (p.count as number) === 0) return null;
    if (p.field !== undefined && !FIELDS.includes(p.field as TopicField)) return null;
    if (p.stage === "field-drill" && p.field === undefined) return null;
    if (p.answered !== undefined && !nonNegativeInt(p.answered)) return null;
    if (!["cp5_field", "standard", "early_exam_near", "early_strong"].includes(p.reason as string)) return null;
    const questionIds = optionalIds(p.questionIds);
    if (questionIds === null) return null;
    return {
      kind: "past_exam_drill",
      stage: p.stage,
      count: p.count as number,
      reason: p.reason as DrillReason,
      ...(p.field === undefined ? {} : { field: p.field as TopicField }),
      ...(p.answered === undefined ? {} : { answered: p.answered as number }),
      ...(questionIds ? { questionIds } : {}),
    };
  }

  if (p.kind === "past_exam_mock") {
    if (!Number.isInteger(p.year) || (p.year as number) < 2000 || (p.year as number) > 2100) return null;
    return { kind: "past_exam_mock", year: p.year as number };
  }

  return null;
}

export function toActivityPayload(spec: TodayActivitySpec): TodayActivityPayload {
  return { ...spec, v: ACTIVITY_PAYLOAD_VERSION };
}
