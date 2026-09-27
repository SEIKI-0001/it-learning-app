import "server-only";

// Learning Context 層（モチット AI 用）。
//
// 「いまの学習状態」を既存のサービス層・テーブルから集め、LLM に渡してよい小さな事実へ整える。
// - 実力: getCurrentReadiness（/progress と同じ ExamReadinessResult）
// - 学習ペース: integrated_learning_status の最新スナップショット（ここでは再計算しない）
// - 試験日: user_profiles.exam_date
// - 回答: question_attempts の直近15日分（アプリ側で集計し、生の履歴は渡さない）
// - 今日のミッション: user_progress.checkpoint_progress.dailyQuests（Today が固定した3件）
// - 今日のルート / 表示中の問題: 画面が既存ロジックで出した内容（クライアントから受け取り、丸めて使う）
//
// 資格固有の部分（トピック解決・ミッション名）は引数の resolver に寄せ、将来ほかの資格でも
// 同じ組み立て方で差し替えられるようにしている。
// 会話履歴には頼らず、毎回ここで最新の状態を読み直す。

import type { SupabaseClient } from "@supabase/supabase-js";
import { getTopic } from "@/lib/content";
import { getQuestDef } from "@/lib/dailyQuests";
import { integratedStatusRowToStatus, type IntegratedStatusRow } from "@/lib/dbMappers";
import { getCurrentReadiness } from "@/lib/examReadiness/service";
import { daysUntilExamDate } from "@/lib/planningInputs";
import { getLatestIntegratedStatusRow } from "@/lib/progressBootstrap";
import type { ExamReadinessResult } from "@/types/examReadiness";
import type { IntegratedLearningStatus } from "@/types/integratedStatus";
import type { CheckpointProgress, DailyQuestState } from "@/types/checkpoint";
import {
  localDateKey,
  localDayStartMs,
  paceFacts,
  readinessFacts,
  recentPerformanceFacts,
  todaySummaryFacts,
  topicPerformanceFacts,
  type MochitAttempt,
  type TopicResolver,
} from "./facts";
import type {
  MochitIntent,
  MochitPageKind,
  MochitQuestionContext,
  MochitTodaySnapshot,
} from "./types";

const ATTEMPT_WINDOW_DAYS = 15;
const ATTEMPT_ROW_LIMIT = 1500;

const IMPORTANCE_LABEL: Record<number, string> = { 1: "基礎", 2: "重要", 3: "最重要" };
const FREQUENCY_LABEL: Record<string, string> = { low: "低め", medium: "ふつう", high: "高い" };

export const itPassportTopicResolver: TopicResolver = (topicId) => {
  const topic = getTopic(topicId);
  return topic ? { title: topic.title, fieldId: topic.field } : null;
};

// ---------------------------------------------------------------------------
// 個別の取得（失敗しても相談自体は止めない：null を返す）
// ---------------------------------------------------------------------------

export async function getLearningStatus(
  supabase: SupabaseClient,
  userId: string,
  now: Date,
): Promise<ExamReadinessResult | null> {
  try {
    return await getCurrentReadiness({ supabase, userId, now });
  } catch (error) {
    console.error("[mochit-ai] readiness unavailable", error);
    return null;
  }
}

export async function getStudyPace(
  supabase: SupabaseClient,
  userId: string,
): Promise<IntegratedLearningStatus | null> {
  try {
    const row = await getLatestIntegratedStatusRow(supabase, userId);
    return row ? integratedStatusRowToStatus(row as IntegratedStatusRow) : null;
  } catch (error) {
    console.error("[mochit-ai] integrated status unavailable", error);
    return null;
  }
}

export async function getExamDate(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("exam_date")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return (data as { exam_date: string | null } | null)?.exam_date ?? null;
}

export async function getRecentAttempts(
  supabase: SupabaseClient,
  userId: string,
  now: Date,
): Promise<MochitAttempt[]> {
  const since = new Date(now.getTime() - ATTEMPT_WINDOW_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("question_attempts")
    .select("topic_id, is_correct, answered_at")
    .eq("user_id", userId)
    .gte("answered_at", since)
    .order("answered_at", { ascending: false })
    .limit(ATTEMPT_ROW_LIMIT);
  if (error) {
    console.error("[mochit-ai] attempts unavailable", error.message);
    return [];
  }
  return ((data ?? []) as { topic_id: string; is_correct: boolean; answered_at: string }[]).map((r) => ({
    topicId: r.topic_id,
    isCorrect: Boolean(r.is_correct),
    answeredAt: r.answered_at,
  }));
}

/** Today が固定した今日の3ミッション（その日の分が保存されていなければ null）。 */
export async function getTodayMissions(
  supabase: SupabaseClient,
  userId: string,
  localDate: string,
): Promise<DailyQuestState | null> {
  const { data, error } = await supabase
    .from("user_progress")
    .select("checkpoint_progress")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  const quests = (data as { checkpoint_progress: CheckpointProgress | null } | null)?.checkpoint_progress
    ?.dailyQuests;
  return quests && quests.date === localDate ? quests : null;
}

// ---------------------------------------------------------------------------
// 意図ごとの組み立て
// ---------------------------------------------------------------------------

export type MochitLearningContextInput = {
  supabase: SupabaseClient;
  userId: string;
  now: Date;
  intent: MochitIntent;
  page: MochitPageKind;
  localDate: string;
  timezoneOffsetMinutes: number;
  question: MochitQuestionContext | null;
  learnTopicId: string | null;
  today: MochitTodaySnapshot | null;
  resolveTopic?: TopicResolver;
};

export type MochitLearningContext = {
  /** LLM に渡す事実（JSON にして送る）。 */
  facts: Record<string, unknown>;
  /** 回答ガード用：アプリが判定した実力の段階ラベル（取得していなければ null）。 */
  band: string | null;
};

const NEEDS: Record<MochitIntent, { readiness: boolean; pace: boolean; attempts: boolean; missions: boolean }> = {
  status: { readiness: true, pace: true, attempts: true, missions: false },
  plan: { readiness: true, pace: true, attempts: true, missions: false },
  today: { readiness: true, pace: true, attempts: true, missions: true },
  reflection: { readiness: false, pace: false, attempts: true, missions: true },
  question: { readiness: false, pace: false, attempts: true, missions: false },
  learn: { readiness: false, pace: false, attempts: true, missions: false },
  general: { readiness: true, pace: true, attempts: false, missions: false },
};

export async function buildMochitLearningContext(
  input: MochitLearningContextInput,
): Promise<MochitLearningContext> {
  const { supabase, userId, now, intent, localDate, timezoneOffsetMinutes } = input;
  const resolveTopic = input.resolveTopic ?? itPassportTopicResolver;
  const need = NEEDS[intent];

  const [readiness, pace, examDate, attempts, missions] = await Promise.all([
    need.readiness ? getLearningStatus(supabase, userId, now) : Promise.resolve(null),
    need.pace ? getStudyPace(supabase, userId) : Promise.resolve(null),
    getExamDate(supabase, userId),
    need.attempts ? getRecentAttempts(supabase, userId, now) : Promise.resolve([] as MochitAttempt[]),
    need.missions ? getTodayMissions(supabase, userId, localDate) : Promise.resolve(null),
  ]);

  const status = readinessFacts(readiness);
  const facts: Record<string, unknown> = {
    page: input.page,
    exam: {
      examDate: examDate ?? "未設定",
      daysUntilExam: daysUntilExamDate(examDate, now) ?? "未設定",
    },
  };

  if (need.readiness) {
    facts.readiness = status ?? "判断材料不足（まだ実力を判定できるデータが無い）";
  }
  if (need.pace) {
    const p = paceFacts(pace);
    facts.studyPace = p ?? "判断材料不足";
  }

  const dayKey = (iso: string) => localDateKey(iso, timezoneOffsetMinutes);
  if (intent === "status" || intent === "plan") {
    facts.recent14Days = recentPerformanceFacts(attempts, now, resolveTopic, dayKey);
  }

  if (intent === "today" || intent === "reflection") {
    const dayStart = localDayStartMs(localDate, timezoneOffsetMinutes) ?? now.getTime() - 86_400_000;
    facts.today = todaySummaryFacts({
      date: localDate,
      dayStartMs: dayStart,
      now,
      attempts,
      resolveTopic,
      missions,
      missionLabel: (id) => getQuestDef(id)?.label ?? null,
      today: input.today,
    });
    if (input.today?.primary && input.today.date === localDate) {
      facts.todayPrimary = input.today.primary;
    }
  }

  if (intent === "question" && input.question) {
    const q = input.question;
    const topicId = q.topicId ?? null;
    facts.question = {
      source: q.sourceLabel,
      prompt: q.prompt,
      choices: q.choices.map((c) => `${c.label}: ${c.text}`),
      correct: q.correctLabel,
      selected: q.selectedLabel ?? "未回答",
      result: q.selectedLabel === null ? "未回答" : q.selectedLabel === q.correctLabel ? "正解" : "不正解",
      explanation: q.explanation,
      whySelectedIsWrong: q.selectedChoiceExplanation,
      topic: topicId ? resolveTopic(topicId)?.title : undefined,
    };
    if (topicId) facts.topicRecent = topicPerformanceFacts(attempts, topicId);
  } else if (intent === "question") {
    facts.question = "表示中の問題は無い（問題に答えた後に聞くと、その問題について説明できる）";
  }

  if (intent === "learn" && input.learnTopicId) {
    const topic = getTopic(input.learnTopicId);
    if (topic) {
      facts.learn = {
        title: topic.title,
        category: topic.category,
        summary: topic.summary,
        examPoint: topic.examPoint,
        commonMistakes: topic.commonMistakes?.slice(0, 3),
        importance: IMPORTANCE_LABEL[topic.importance] ?? undefined,
        examFrequency: topic.examFrequency ? FREQUENCY_LABEL[topic.examFrequency] : undefined,
      };
      facts.topicRecent = topicPerformanceFacts(attempts, topic.id);
    }
  }

  return { facts, band: status?.band ?? null };
}
