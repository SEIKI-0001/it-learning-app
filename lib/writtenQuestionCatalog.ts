import {
  getTopicIdsForWrittenQuestion,
  getWrittenQuestion,
  getWrittenQuestions,
  getWrittenQuestionsForTopic,
} from "@/data/writtenQuestions";
import { getTopic } from "@/lib/content";
import { getAllThemes, getLessonLocation } from "@/lib/learningCatalog";
import type { WrittenQuestion } from "@/types/aiGrading";
import type { TopicField } from "@/types/content";

// AI採点の問題一覧（自分で選ぶ）用の索引。
//
// 問題本文は data/writtenQuestions.ts、章・Topic の対応は TOPIC_WRITTEN_QUESTION_IDS と
// 学ぶ画面の目次（data/learningCatalog.ts）から導く。ここに問題データを複製しない。

export const FIELD_LABEL: Record<TopicField, string> = {
  strategy: "ストラテジ",
  management: "マネジメント",
  technology: "テクノロジ",
};

export type WrittenQuestionPlacement = {
  topicId: string;
  topicTitle: string;
  themeSlug: string;
  themeTitle: string;
  chapterNumber: number;
  field: TopicField;
};

export type WrittenQuestionEntry = {
  question: WrittenQuestion;
  /** 紐づくトピック（学ぶ画面の並び順）。先頭を代表として一覧に出す。 */
  placements: WrittenQuestionPlacement[];
};

function placementsOf(questionId: string): WrittenQuestionPlacement[] {
  return getTopicIdsForWrittenQuestion(questionId).flatMap((topicId) => {
    const location = getLessonLocation(topicId);
    const topic = getTopic(topicId);
    if (!location || !topic) return [];
    return [{
      topicId,
      topicTitle: topic.title,
      themeSlug: location.theme.slug,
      themeTitle: location.theme.title,
      chapterNumber: location.theme.chapterNumber,
      field: location.theme.field,
    }];
  });
}

let cachedEntries: WrittenQuestionEntry[] | null = null;

/** 全問題を、学ぶ画面の章・トピックの並び順で返す。 */
export function getWrittenQuestionEntries(): WrittenQuestionEntry[] {
  if (cachedEntries) return cachedEntries;
  const lessonOrder = new Map(
    getAllThemes()
      .flatMap((theme) => [...theme.sections].sort((a, b) => a.order - b.order).flatMap((s) => s.lessonIds))
      .map((topicId, index) => [topicId, index]),
  );
  const rank = (entry: WrittenQuestionEntry) =>
    Math.min(...entry.placements.map((p) => lessonOrder.get(p.topicId) ?? Number.MAX_SAFE_INTEGER));
  const placementRank = (p: WrittenQuestionPlacement) => lessonOrder.get(p.topicId) ?? Number.MAX_SAFE_INTEGER;
  cachedEntries = getWrittenQuestions()
    .map((question) => ({
      question,
      placements: placementsOf(question.id).sort((a, b) => placementRank(a) - placementRank(b)),
    }))
    .sort((a, b) => rank(a) - rank(b));
  return cachedEntries;
}

export type WrittenQuestionFilter = {
  field?: TopicField | "all";
  themeSlug?: string | "all";
  status?: "all" | "unanswered" | "answered";
  query?: string;
};

/** 一覧の絞り込み。キーワードは題名・問題文・Topic名・章名・カテゴリ・採点キーワードから探す。 */
export function filterWrittenQuestionEntries(
  entries: readonly WrittenQuestionEntry[],
  filter: WrittenQuestionFilter,
  answeredIds: ReadonlySet<string> = new Set(),
): WrittenQuestionEntry[] {
  const query = filter.query?.trim().toLowerCase() ?? "";
  return entries.filter((entry) => {
    const { question, placements } = entry;
    if (filter.field && filter.field !== "all" && !placements.some((p) => p.field === filter.field)) return false;
    if (filter.themeSlug && filter.themeSlug !== "all" && !placements.some((p) => p.themeSlug === filter.themeSlug)) {
      return false;
    }
    if (filter.status === "answered" && !answeredIds.has(question.id)) return false;
    if (filter.status === "unanswered" && answeredIds.has(question.id)) return false;
    if (!query) return true;
    const haystack = [
      question.title,
      question.question,
      question.category,
      ...question.keywords,
      ...placements.flatMap((p) => [p.topicTitle, p.themeTitle]),
    ].join("\n").toLowerCase();
    return haystack.includes(query);
  });
}

/**
 * URL の指定から開く問題を決める。
 *   ?questionId=… … その問題（最優先）
 *   ?topicId=…    … そのトピックに紐づく問題のうち、未回答のもの（無ければ先頭）
 * どちらも解決できなければ undefined（おまかせ出題に任せる）。
 */
export function resolveRequestedQuestionId(
  params: { questionId?: string | null; topicId?: string | null },
  answeredIds: ReadonlySet<string> = new Set(),
): string | undefined {
  if (params.questionId && getWrittenQuestion(params.questionId)) return params.questionId;
  if (params.topicId) {
    const questions = getWrittenQuestionsForTopic(params.topicId);
    return (questions.find((q) => !answeredIds.has(q.id)) ?? questions[0])?.id;
  }
  return undefined;
}

/** 特定の問題を開く /ai-grading の URL。一覧・Today・今後の学習導線で共通に使う。 */
export function getAiGradingQuestionHref(questionId: string): string {
  return `/ai-grading?questionId=${encodeURIComponent(questionId)}`;
}
