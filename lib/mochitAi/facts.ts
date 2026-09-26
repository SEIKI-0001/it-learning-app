// モチット AI に渡す「事実」を、既存ロジックの結果から小さく組み立てる（純関数・DB非依存）。
//
// - 実力（score / band / confidence / 分野別 / 苦手）は ExamReadinessResult をそのまま言い換えるだけ。
//   ここで再計算・再判定しない。
// - 回答履歴は件数・正答率・トピック単位の集計に落としてから渡す（生の履歴を LLM に送らない）。
// - 判断材料が足りない項目は「足りない」と明示して渡し、LLM に推測させない。

import { EXAM_READINESS_CONFIG } from "@/lib/examReadiness/config";
import {
  confidenceLevelLabel,
  confidenceReasonLabel,
  primaryImprovementLabel,
  readinessBandLabel,
} from "@/lib/examReadiness/presentation";
import { overallStatusLabel, type IntegratedLearningStatus } from "@/types/integratedStatus";
import type { ExamReadinessResult } from "@/types/examReadiness";
import type { DailyQuestState } from "@/types/checkpoint";
import type { MochitQuestionContext, MochitTodaySnapshot } from "./types";

/** 集計に使う回答1件（question_attempts の必要列だけ）。 */
export type MochitAttempt = {
  topicId: string;
  isCorrect: boolean;
  answeredAt: string;
};

export type TopicInfo = { title: string; fieldId: string | null };
export type TopicResolver = (topicId: string) => TopicInfo | null;

/** トピック単位の傾向を語ってよい最低回答数。これ未満は「まだ判断できない」扱い。 */
export const MIN_TOPIC_ATTEMPTS = 3;
/** 分野単位の傾向を語ってよい最低回答数。 */
export const MIN_FIELD_ATTEMPTS = 5;
const UNSTABLE_ACCURACY = 0.6;
const RECENT_DAYS = 14;
const HALF_DAYS = 7;

const pct = (correct: number, total: number): number | null =>
  total > 0 ? Math.round((correct / total) * 100) : null;

function fieldLabel(fieldId: string | null): string {
  if (!fieldId) return "その他";
  return EXAM_READINESS_CONFIG.fields.find((f) => f.fieldId === fieldId)?.label ?? "その他";
}

// ---------------------------------------------------------------------------
// 実力（Exam Readiness の言い換え）
// ---------------------------------------------------------------------------

export type ReadinessFacts = {
  /** 実力の段階（アプリの判定。LLM はこれを変えない）。 */
  band: string;
  /** 0〜100。根拠不足で出せないときは null（=測定中）。 */
  score: number | null;
  /** 判定の確からしさ（低/中/高）。 */
  confidence: string;
  /** 確からしさが低い理由（根拠の不足など）。 */
  confidenceNotes: string[];
  fields: { field: string; score: number | null; judgeable: boolean }[];
  weakTopics: string[];
  /** アプリが決めた「いま一番効く改善」。 */
  nextImprovement: string | null;
};

export function readinessFacts(result: ExamReadinessResult | null): ReadinessFacts | null {
  if (!result) return null;
  return {
    band: readinessBandLabel(result.band),
    score: result.score,
    confidence: confidenceLevelLabel(result.confidence.level),
    confidenceNotes: result.confidence.reasons.slice(0, 3).map(confidenceReasonLabel),
    fields: result.fields.map((f) => ({
      field: f.label,
      score: f.scoreGate.evaluated ? f.score : null,
      judgeable: f.scoreGate.evaluated,
    })),
    weakTopics: result.weakTopics.slice(0, 5).map((t) => t.label),
    nextImprovement: primaryImprovementLabel(result.primaryImprovement, result),
  };
}

export type PaceFacts = {
  /** 予定に対する学習ペース（アプリの判定）。 */
  pace: string;
  risks: string[];
  weakTopics: string[];
};

export function paceFacts(status: IntegratedLearningStatus | null): PaceFacts | null {
  if (!status) return null;
  return {
    pace: overallStatusLabel(status.overallStatus),
    risks: status.mainRisks.slice(0, 3).map((r) => (r.detail ? `${r.label}（${r.detail}）` : r.label)),
    weakTopics: status.weakTopics.slice(0, 5).map((t) => t.title),
  };
}

// ---------------------------------------------------------------------------
// 回答履歴の集計
// ---------------------------------------------------------------------------

type Tally = { answered: number; correct: number };
const tally = (): Tally => ({ answered: 0, correct: 0 });
const add = (t: Tally, isCorrect: boolean) => {
  t.answered += 1;
  if (isCorrect) t.correct += 1;
};

export type TopicTrend = { topic: string; answered: number; accuracy: number };

export type RecentPerformanceFacts = {
  days: number;
  answered: number;
  accuracy: number | null;
  /** 回答した日数（学習ペースの目安）。 */
  activeDays: number;
  byField: { field: string; answered: number; accuracy: number | null; enoughData: boolean }[];
  /** 最近の正答が安定していないトピック（最低回答数を満たすものだけ）。 */
  unstableTopics: TopicTrend[];
  /** 前半7日より後半7日で正答率が上がった分野（両期間とも最低回答数を満たすものだけ）。 */
  improvedFields: { field: string; before: number; after: number }[];
};

/**
 * 直近14日の回答を分野・トピック単位に集計する。
 * localDayKey は回答日時→ローカル日付（学習日数を数えるため）。
 */
export function recentPerformanceFacts(
  attempts: MochitAttempt[],
  now: Date,
  resolveTopic: TopicResolver,
  localDayKey: (iso: string) => string,
): RecentPerformanceFacts {
  const since = now.getTime() - RECENT_DAYS * 86_400_000;
  const mid = now.getTime() - HALF_DAYS * 86_400_000;
  const all = tally();
  const byField = new Map<string, Tally>();
  const firstHalf = new Map<string, Tally>();
  const secondHalf = new Map<string, Tally>();
  const byTopic = new Map<string, Tally>();
  const days = new Set<string>();

  for (const a of attempts) {
    const at = Date.parse(a.answeredAt);
    if (!Number.isFinite(at) || at < since || at > now.getTime()) continue;
    const info = resolveTopic(a.topicId);
    const field = fieldLabel(info?.fieldId ?? null);
    add(all, a.isCorrect);
    add(byField.get(field) ?? byField.set(field, tally()).get(field)!, a.isCorrect);
    const half = at < mid ? firstHalf : secondHalf;
    add(half.get(field) ?? half.set(field, tally()).get(field)!, a.isCorrect);
    if (info) add(byTopic.get(info.title) ?? byTopic.set(info.title, tally()).get(info.title)!, a.isCorrect);
    days.add(localDayKey(a.answeredAt));
  }

  const unstableTopics = [...byTopic.entries()]
    .filter(([, t]) => t.answered >= MIN_TOPIC_ATTEMPTS && t.correct / t.answered < UNSTABLE_ACCURACY)
    .map(([topic, t]) => ({ topic, answered: t.answered, accuracy: pct(t.correct, t.answered)! }))
    .sort((a, b) => a.accuracy - b.accuracy || b.answered - a.answered)
    .slice(0, 5);

  const improvedFields = [...secondHalf.entries()].flatMap(([field, after]) => {
    const before = firstHalf.get(field);
    if (!before || before.answered < MIN_FIELD_ATTEMPTS || after.answered < MIN_FIELD_ATTEMPTS) return [];
    const b = pct(before.correct, before.answered)!;
    const a = pct(after.correct, after.answered)!;
    return a - b >= 10 ? [{ field, before: b, after: a }] : [];
  });

  return {
    days: RECENT_DAYS,
    answered: all.answered,
    accuracy: pct(all.correct, all.answered),
    activeDays: days.size,
    byField: [...byField.entries()].map(([field, t]) => ({
      field,
      answered: t.answered,
      accuracy: pct(t.correct, t.answered),
      enoughData: t.answered >= MIN_FIELD_ATTEMPTS,
    })),
    unstableTopics,
    improvedFields,
  };
}

/** 1つのトピックの直近の回答状況（問題・学習内容の質問で添える）。 */
export function topicPerformanceFacts(
  attempts: MochitAttempt[],
  topicId: string,
): { answered: number; accuracy: number | null; enoughData: boolean } {
  const t = tally();
  for (const a of attempts) if (a.topicId === topicId) add(t, a.isCorrect);
  return { answered: t.answered, accuracy: pct(t.correct, t.answered), enoughData: t.answered >= MIN_TOPIC_ATTEMPTS };
}

// ---------------------------------------------------------------------------
// 今日のまとめ（振り返り・今日の相談）
// ---------------------------------------------------------------------------

export type TodaySummaryFacts = {
  date: string;
  questionsAnswered: number;
  accuracy: number | null;
  topicsPracticed: string[];
  /** 今日すべて正解できたトピック（2問以上）。 */
  goodTopics: string[];
  /** 今日まちがいがあったトピック（復習候補）。 */
  reviewCandidates: string[];
  /** 以前（今日より前14日）は不安定だったが、今日は正答できたトピック。 */
  improvedTopics: string[];
  missions: { label: string; progress: number; goal: number; done: boolean }[] | null;
  missionsCompleted: number | null;
  tasks: MochitTodaySnapshot["tasks"] | null;
  tasksDone: number | null;
};

export function todaySummaryFacts(input: {
  date: string;
  dayStartMs: number;
  now: Date;
  attempts: MochitAttempt[];
  resolveTopic: TopicResolver;
  missions: DailyQuestState | null;
  missionLabel: (id: string) => string | null;
  today: MochitTodaySnapshot | null;
}): TodaySummaryFacts {
  const { dayStartMs, now, attempts, resolveTopic } = input;
  const todayAll = tally();
  const todayByTopic = new Map<string, Tally>();
  const beforeByTopic = new Map<string, Tally>();
  for (const a of attempts) {
    const at = Date.parse(a.answeredAt);
    if (!Number.isFinite(at) || at > now.getTime()) continue;
    const title = resolveTopic(a.topicId)?.title;
    if (at >= dayStartMs) {
      add(todayAll, a.isCorrect);
      if (title) add(todayByTopic.get(title) ?? todayByTopic.set(title, tally()).get(title)!, a.isCorrect);
    } else if (title) {
      add(beforeByTopic.get(title) ?? beforeByTopic.set(title, tally()).get(title)!, a.isCorrect);
    }
  }
  const entries = [...todayByTopic.entries()];
  const missions = input.missions
    ? input.missions.quests.map((q) => ({
        label: input.missionLabel(q.id) ?? q.id,
        progress: Math.min(q.progress, q.goal),
        goal: q.goal,
        done: q.progress >= q.goal,
      }))
    : null;
  const tasks = input.today && input.today.date === input.date ? input.today.tasks : null;
  return {
    date: input.date,
    questionsAnswered: todayAll.answered,
    accuracy: pct(todayAll.correct, todayAll.answered),
    topicsPracticed: entries.map(([topic]) => topic).slice(0, 8),
    goodTopics: entries.filter(([, t]) => t.answered >= 2 && t.correct === t.answered).map(([topic]) => topic).slice(0, 5),
    reviewCandidates: entries.filter(([, t]) => t.correct < t.answered).map(([topic]) => topic).slice(0, 5),
    improvedTopics: entries
      .filter(([topic, t]) => {
        const before = beforeByTopic.get(topic);
        return (
          t.correct === t.answered &&
          before !== undefined &&
          before.answered >= MIN_TOPIC_ATTEMPTS &&
          before.correct / before.answered < UNSTABLE_ACCURACY
        );
      })
      .map(([topic]) => topic)
      .slice(0, 5),
    missions,
    missionsCompleted: missions ? missions.filter((m) => m.done).length : null,
    tasks,
    tasksDone: tasks ? tasks.filter((t) => t.state === "done").length : null,
  };
}

// ---------------------------------------------------------------------------
// 日付
// ---------------------------------------------------------------------------

/** クライアントのローカル日付の 0:00 を UTC ミリ秒にする（offset は Date#getTimezoneOffset の値）。 */
export function localDayStartMs(localDate: string, timezoneOffsetMinutes: number): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + timezoneOffsetMinutes * 60_000;
}

/** UTC 日時をクライアントのローカル日付（YYYY-MM-DD）にする。 */
export function localDateKey(iso: string, timezoneOffsetMinutes: number): string {
  const at = Date.parse(iso) - timezoneOffsetMinutes * 60_000;
  return new Date(at).toISOString().slice(0, 10);
}

/** 問題コンテキストを、長さを丸めて安全な形に整える（クライアントからの値をそのまま信用しない）。 */
export function sanitizeQuestionContext(
  q: MochitQuestionContext | null | undefined,
  limits: { text: number; choice: number },
): MochitQuestionContext | null {
  if (!q || typeof q !== "object") return null;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  const prompt = str(q.prompt, limits.text).trim();
  if (!prompt || !Array.isArray(q.choices)) return null;
  const choices = q.choices
    .slice(0, 6)
    .map((c) => ({ label: str(c?.label, 4), text: str(c?.text, limits.choice) }))
    .filter((c) => c.label && c.text);
  if (choices.length < 2) return null;
  const correctLabel = str(q.correctLabel, 4);
  if (!choices.some((c) => c.label === correctLabel)) return null;
  const selected = typeof q.selectedLabel === "string" ? q.selectedLabel.slice(0, 4) : null;
  return {
    questionId: str(q.questionId, 120),
    topicId: q.topicId ? str(q.topicId, 120) : undefined,
    prompt,
    choices,
    correctLabel,
    selectedLabel: selected && choices.some((c) => c.label === selected) ? selected : null,
    explanation: q.explanation ? str(q.explanation, limits.text) : undefined,
    selectedChoiceExplanation: q.selectedChoiceExplanation ? str(q.selectedChoiceExplanation, limits.choice) : undefined,
    sourceLabel: q.sourceLabel ? str(q.sourceLabel, 80) : undefined,
  };
}
