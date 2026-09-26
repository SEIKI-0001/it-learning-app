// 公式過去問の部分演習（分野別・3分野混合・ランダム・誤答の解き直し）で出す問題を選ぶ。
// 純粋関数（乱数はシードで固定）。サーバ・クライアントの両方から使う。
//
// 問題データは複製しない。ここが扱うのは問題バンクから作った軽い索引（ID・公式区分・
// 復習先トピック）だけで、問題本文はページが問題バンクから ID で引き直す。
//
// 選び方（その人の履歴を使う）:
//   1. まだ解いていない問題を優先する（未出題優先）
//   2. その中でも、弱点トピックに紐づく問題を先に出す
//   3. 足りなければ、前に間違えた問題 → 正解済みの問題の順で補う
//   同じ優先度の中はシード付きでシャッフルする（毎回同じ並びにしない）。

import type { TopicField } from "@/types/content";
import { OFFICIAL_EXAM_FIELDS } from "@/lib/questionBank/officialExamField";

export type DrillIndexEntry = {
  id: string;
  /** 公式問題冊子上の出題区分。 */
  field: TopicField;
  /** 復習先トピック。 */
  topicId: string;
};

export type DrillSelectionStage = "field-drill" | "mixed" | "random" | "retry-wrong";

export type DrillSelectionInput = {
  stage: DrillSelectionStage;
  index: DrillIndexEntry[];
  count: number;
  /** field-drill の対象分野。 */
  field?: TopicField;
  /** retry-wrong で解き直す問題（Today が履歴から決めて渡す）。 */
  ids?: string[];
  /** 解いたことのある問題。 */
  answeredIds: ReadonlySet<string>;
  /** 最新の回答が不正解の問題。 */
  wrongIds: ReadonlySet<string>;
  /** 弱点トピック（lib/learningLoop getWeakTopics など）。 */
  weakTopicIds: ReadonlySet<string>;
  seed: string;
};

/** 公式の出題構成（ストラテジ35・マネジメント20・テクノロジ45）。混合演習の配分に使う。 */
const FIELD_SHARE: Record<TopicField, number> = {
  strategy: 0.35,
  management: 0.2,
  technology: 0.45,
};

export const DRILL_COUNT_LIMIT = { min: 1, max: 30 } as const;

function seedNumber(seed: string): number {
  let value = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  let value = seedNumber(seed) || 1;
  const random = () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x1_0000_0000;
  };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** 優先度（小さいほど先）。未出題×弱点 → 未出題 → 誤答 → 正解済み。 */
function rank(entry: DrillIndexEntry, input: DrillSelectionInput): number {
  const unseen = !input.answeredIds.has(entry.id);
  const weak = input.weakTopicIds.has(entry.topicId);
  if (unseen) return weak ? 0 : 1;
  if (input.wrongIds.has(entry.id)) return 2;
  return 3;
}

function pick(pool: DrillIndexEntry[], count: number, input: DrillSelectionInput, salt: string): string[] {
  return seededShuffle(pool, `${input.seed}:${salt}`)
    .map((entry, order) => ({ entry, order, rank: rank(entry, input) }))
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, count)
    .map(({ entry }) => entry.id);
}

/** 混合演習の分野ごとの問題数（合計 count。端数は構成比の大きい分野から配る）。 */
export function mixedFieldCounts(count: number): Record<TopicField, number> {
  const base = Object.fromEntries(
    OFFICIAL_EXAM_FIELDS.map((field) => [field, Math.floor(count * FIELD_SHARE[field])]),
  ) as Record<TopicField, number>;
  let rest = count - Object.values(base).reduce((sum, n) => sum + n, 0);
  const order = [...OFFICIAL_EXAM_FIELDS].sort((a, b) => FIELD_SHARE[b] - FIELD_SHARE[a]);
  for (let i = 0; rest > 0; i += 1, rest -= 1) base[order[i % order.length]] += 1;
  return base;
}

export function clampDrillCount(value: number): number {
  if (!Number.isFinite(value)) return 10;
  return Math.max(DRILL_COUNT_LIMIT.min, Math.min(DRILL_COUNT_LIMIT.max, Math.floor(value)));
}

/** 部分演習で出す問題 ID を選ぶ。 */
export function selectDrillQuestionIds(input: DrillSelectionInput): string[] {
  const count = clampDrillCount(input.count);
  const known = new Set(input.index.map((entry) => entry.id));

  if (input.stage === "retry-wrong") {
    return [...new Set(input.ids ?? [])].filter((id) => known.has(id)).slice(0, count);
  }
  if (input.stage === "field-drill") {
    if (!input.field) return [];
    return pick(input.index.filter((entry) => entry.field === input.field), count, input, input.field);
  }
  if (input.stage === "mixed") {
    const counts = mixedFieldCounts(count);
    const picked = OFFICIAL_EXAM_FIELDS.flatMap((field) =>
      pick(input.index.filter((entry) => entry.field === field), counts[field], input, field));
    // 分野が混ざるように並べ替える（分野ごとに固まらないように）。
    return seededShuffle(picked, `${input.seed}:mixed`);
  }
  return pick(input.index, count, input, "random");
}
