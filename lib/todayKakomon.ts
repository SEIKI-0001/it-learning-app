// Today に出す公式過去問タスクを決める（純粋関数）。
//
// 開始可否は lib/kakomonAccess（Single Source of Truth）、段階の解放は
// lib/studyPlanner の buildKakomonStages() をそのまま使う。ここがするのは
// 「今日はどの段階を何問やるか」を1つ選び、Today のタスクの形にすることだけ。
//
// 段階の流れ（CP5 以降の基本ルート／前倒し解禁の人も同じ）:
//   分野別（1分野 KAKOMON_FIELD_DRILL_TARGET 問まで）→ 3分野混合 → ランダム
//   CP6（または試験直前）で時間がある日は 年度別100問（既存の /past-exams/[year]）
//   前日までの誤答があれば、それを最優先で解き直す（retry-wrong）
//
// 問題は必ず問題バンクから引く（ここでは ID と条件を URL に載せるだけで、複製しない）。

import type { TodayActivity, UserAnswer, UserProgress } from "@/types";
import type { Topic, TopicField } from "@/types/content";
import { FIELD_LABELS } from "@/types/content";
import { buildKakomonStages, kakomonAccessFor } from "@/lib/studyPlanner";
import { KAKOMON_FIELD_DRILL_TARGET } from "@/lib/pastExam/kakomonRules";
import { checkpointOrderOf } from "@/lib/kakomonAccess";
import { summarizeOfficialHistory, type OfficialHistory } from "@/lib/pastExam/officialHistory";
import { OFFICIAL_EXAM_FIELD_SCOPE, OFFICIAL_EXAM_FIELDS } from "@/lib/questionBank/officialExamField";
import { TODAY_ACTIVITY_PRIORITY } from "@/lib/learningLoop";
import { formatJapaneseExamYear } from "@/lib/pastExam/yearLabel";
import {
  ACTIVITY_KEYS,
  type DrillReason,
  type PastExamDrillSpec,
  type PastExamMockSpec,
  type PastExamRetrySpec,
} from "@/lib/todayActivitySpec";

export const PAST_EXAM_DRILL_ACTIVITY_ID = ACTIVITY_KEYS.past_exam_drill;
export const PAST_EXAM_RETRY_ACTIVITY_ID = ACTIVITY_KEYS.past_exam_retry;

/** 本番は100問120分。1問あたり約1.2分で見積もる。 */
const MINUTES_PER_QUESTION = 1.2;
/** 解き直しは1回10問まで。 */
const RETRY_MAX = 10;
/** 3分野混合からランダム演習へ移る目安（解いた公式過去問の総数）。 */
export const KAKOMON_MIXED_TARGET = 90;

/** 段階ごとの標準問題数（上限）と最低問題数。 */
const DRILL_SIZE = {
  field: { max: 15, min: 10 },
  mixed: { max: 20, min: 10 },
  random: { max: 30, min: 20 },
} as const;

export type DrillStage = "field-drill" | "mixed" | "random" | "retry-wrong";

export type KakomonTaskInput = {
  topics: Topic[];
  progress: UserProgress;
  answers: UserAnswer[];
  daysRemaining: number | null;
  /** 今日使える時間（分）。 */
  budgetMinutes: number;
  now: Date;
};

function questionMinutes(count: number): number {
  return Math.max(3, Math.round(count * MINUTES_PER_QUESTION));
}

/** 時間予算の半分程度に収まる問題数（段階ごとの下限・上限の範囲で）。 */
export function drillQuestionCount(stage: keyof typeof DRILL_SIZE, budgetMinutes: number): number {
  const { max, min } = DRILL_SIZE[stage];
  const fit = Math.floor((budgetMinutes * 0.5) / MINUTES_PER_QUESTION);
  return Math.max(min, Math.min(max, fit));
}

export function drillHref(params: {
  stage: DrillStage;
  count?: number;
  field?: TopicField;
  ids?: string[];
  task: string;
}): string {
  const search = new URLSearchParams({ stage: params.stage, from: "today", task: params.task });
  if (params.count) search.set("count", String(params.count));
  if (params.field) search.set("field", params.field);
  if (params.ids) search.set("ids", params.ids.join(","));
  return `/past-exams/drill?${search.toString()}`;
}

/** 分野別演習の対象分野（回答数が少ない分野 → 正答率が低い分野）。 */
function nextDrillField(history: OfficialHistory): TopicField | null {
  const candidates = OFFICIAL_EXAM_FIELDS
    .filter((field) => history.byField[field].answered < KAKOMON_FIELD_DRILL_TARGET)
    .sort((a, b) => {
      const sa = history.byField[a];
      const sb = history.byField[b];
      return sa.answered - sb.answered || (sa.accuracy ?? 0) - (sb.accuracy ?? 0);
    });
  return candidates[0] ?? null;
}

/** 年度別100問で次に解く年度（回答が少ない年度 → 新しい年度）。 */
function nextMockYear(history: OfficialHistory): number {
  return [...OFFICIAL_EXAM_FIELD_SCOPE.years]
    .sort((a, b) => (history.answeredByYear[a] ?? 0) - (history.answeredByYear[b] ?? 0) || b - a)[0];
}

const DRILL_REASON_TEXT: Record<DrillReason, string> = {
  // CP5 では分野別の回答数そのものが突破条件（3分野実戦）なので、それを理由に出す。
  cp5_field: `CP5突破に必要な「3分野実戦」（各分野${KAKOMON_FIELD_DRILL_TARGET}問）を進めます`,
  standard: "公式過去問で、本番で解ける力をつけます",
  early_exam_near: "試験日が近いので、公式過去問を前倒しで始めます",
  early_strong: "学習が十分進んでいるので、公式過去問を前倒しで始めます",
};

/** spec から Today のタスクを組み立てる（生成時も、別端末での復元時も同じ関数）。 */
export function kakomonActivityFromSpec(
  spec: PastExamRetrySpec | PastExamDrillSpec | PastExamMockSpec,
): TodayActivity {
  if (spec.kind === "past_exam_retry") {
    const n = spec.questionIds.length;
    return {
      id: PAST_EXAM_RETRY_ACTIVITY_ID,
      kind: "past_exam_retry",
      title: "前回の過去問の誤答を解き直す",
      detail: spec.pendingTotal > n
        ? `間違えた問題のうち古い順に${n}問`
        : "間違えた公式過去問だけを、もう一度",
      countLabel: `${n}問`,
      estimatedMinutes: questionMinutes(n),
      priority: TODAY_ACTIVITY_PRIORITY.pastExamRetry,
      reason: "間違えた過去問は、翌日以降に解き直すと定着します",
      href: drillHref({ stage: "retry-wrong", ids: spec.questionIds, task: PAST_EXAM_RETRY_ACTIVITY_ID }),
      ctaLabel: "誤答を解き直す",
      primaryEligible: true,
      spec,
    };
  }

  if (spec.kind === "past_exam_mock") {
    return {
      id: PAST_EXAM_DRILL_ACTIVITY_ID,
      kind: "past_exam_mock",
      title: `${formatJapaneseExamYear(spec.year)}の公式問題100問に挑戦`,
      detail: "本番と同じ100問・120分。終わったら誤答を復習に回します",
      countLabel: "100問",
      estimatedMinutes: 120,
      priority: TODAY_ACTIVITY_PRIORITY.pastExamDrill,
      reason: "本番と同じ形式で、時間配分まで練習します",
      href: `/past-exams/${spec.year}`,
      ctaLabel: "100問に挑戦する",
      primaryEligible: true,
      spec,
    };
  }

  const fieldLabel = spec.field ? FIELD_LABELS[spec.field] : "";
  const title = spec.stage === "field-drill"
    ? `${fieldLabel}の公式問題を${spec.count}問解く`
    : spec.stage === "mixed"
      ? `3分野の公式問題を${spec.count}問解く`
      : `公式問題をランダムに${spec.count}問解く`;
  const detail = spec.stage === "field-drill"
    ? `分野別演習（${fieldLabel} ${spec.answered ?? 0}/${KAKOMON_FIELD_DRILL_TARGET}問）`
    : spec.stage === "mixed"
      ? "3分野をバランスよく混ぜた演習"
      : "年度も分野も混ぜた実戦演習";
  return {
    id: PAST_EXAM_DRILL_ACTIVITY_ID,
    kind: "past_exam_drill",
    title,
    detail,
    countLabel: `${spec.count}問`,
    estimatedMinutes: questionMinutes(spec.count),
    priority: TODAY_ACTIVITY_PRIORITY.pastExamDrill,
    reason: DRILL_REASON_TEXT[spec.reason],
    // 問題が決まっていれば（別端末で先に開いた場合も）同じ問題で開く。
    href: drillHref({
      stage: spec.stage,
      field: spec.field,
      count: spec.count,
      ids: spec.questionIds,
      task: PAST_EXAM_DRILL_ACTIVITY_ID,
    }),
    ctaLabel: "公式問題を解く",
    primaryEligible: true,
    spec,
  };
}

/**
 * 今日の公式過去問タスクの spec（最大2件: 誤答の解き直し＋演習）。
 * 公式過去問がまだ解禁されていなければ空（条件未達の人に過去問を強制しない）。
 */
export function selectKakomonSpecs(
  input: KakomonTaskInput,
): (PastExamRetrySpec | PastExamDrillSpec | PastExamMockSpec)[] {
  const { topics, progress, answers, daysRemaining, budgetMinutes, now } = input;
  const access = kakomonAccessFor(topics, progress, answers, daysRemaining);
  if (!access.unlocked) return [];

  const stages = new Map(
    buildKakomonStages(topics, progress, answers, daysRemaining, now).map((stage) => [stage.id, stage]),
  );
  const history = summarizeOfficialHistory(answers, now);
  const order = checkpointOrderOf(progress) ?? 0;
  const specs: (PastExamRetrySpec | PastExamDrillSpec | PastExamMockSpec)[] = [];

  if (stages.get("retry-wrong")?.unlocked) {
    specs.push({
      kind: "past_exam_retry",
      questionIds: history.pendingWrongIds.slice(0, RETRY_MAX),
      pendingTotal: history.pendingWrongIds.length,
    });
  }

  const reason: DrillReason = access.route === "early"
    ? access.reason === "exam_near" ? "early_exam_near" : "early_strong"
    : "standard";

  // CP6（または試験直前）で時間がある日は、既存の年度別100問に挑戦する。
  if (stages.get("mock")?.unlocked && order >= 6 && budgetMinutes >= 120) {
    specs.push({ kind: "past_exam_mock", year: nextMockYear(history) });
    return specs;
  }

  const field = nextDrillField(history);
  if (field && stages.get("field-drill")?.unlocked) {
    specs.push({
      kind: "past_exam_drill",
      stage: "field-drill",
      field,
      count: drillQuestionCount("field", budgetMinutes),
      answered: history.byField[field].answered,
      reason: order === 5 ? "cp5_field" : reason,
    });
    return specs;
  }

  if (stages.get("random")?.unlocked || !field) {
    const mixed = history.totalAnswered < KAKOMON_MIXED_TARGET;
    specs.push({
      kind: "past_exam_drill",
      stage: mixed ? "mixed" : "random",
      count: drillQuestionCount(mixed ? "mixed" : "random", budgetMinutes),
      reason,
    });
  }
  return specs;
}

export function buildKakomonActivities(input: KakomonTaskInput): TodayActivity[] {
  return selectKakomonSpecs(input).map(kakomonActivityFromSpec);
}
