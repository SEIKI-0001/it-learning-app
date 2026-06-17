import { getBookTitle } from "@/data/books";
import { getQuestionsByTopic } from "@/data/questions";
import { getTopicById, topics } from "@/data/topics";
import { daysBetween, getWeekday, todayISO } from "@/lib/date";
import { getCompletedTopicIds, calculateTopicAccuracies } from "@/lib/progress";
import { sortReviewItems } from "@/lib/review";
import type { AppRepository } from "@/lib/storage/types";
import type { Topic } from "@/types/content";
import type { UserProfile } from "@/types/user";
import type { StudyRecommendation } from "@/types/study";

export async function buildTodayRecommendation(
  repository: AppRepository,
  profile: UserProfile
): Promise<StudyRecommendation> {
  const [answers, reviewItems] = await Promise.all([
    repository.listAnswers(profile.id),
    repository.getReviewItems(profile.id)
  ]);
  const completedTopicIds = getCompletedTopicIds(answers);
  const accuracies = calculateTopicAccuracies(answers);
  const dueReviews = sortReviewItems(reviewItems.filter((item) => item.dueDate <= todayISO()));
  const dueReviewTopics = dueReviews
    .map((item) => getTopicById(item.topicId))
    .filter((topic): topic is Topic => Boolean(topic));

  const daysUntilExam = daysBetween(todayISO(), profile.examDate);
  const availableMinutes = getAvailableMinutes(profile);
  const topic = pickTopicForToday({
    profile,
    completedTopicIds,
    dueReviewTopics,
    daysUntilExam,
    accuracies
  });

  const reviewTopics = dueReviewTopics.filter((reviewTopic) => reviewTopic.id !== topic.id).slice(0, 2);
  const questions = getQuestionsByTopic(topic.id).slice(0, daysUntilExam <= 14 ? 2 : 1);
  const estimatedMinutes = Math.min(
    availableMinutes,
    Math.max(15, topic.recommendedMinutes + reviewTopics.length * 8)
  );

  return {
    userId: profile.id,
    date: todayISO(),
    topic,
    estimatedMinutes,
    bookRange: topic.bookReferenceNotes[profile.selectedBookId] ?? topic.bookReferenceNotes.generic,
    beginnerExplanation: topic.beginnerExplanation,
    diagramText: topic.diagramText,
    questions,
    reviewTopics,
    nextAction: buildNextAction(daysUntilExam, reviewTopics.length, questions.length),
    reason: buildReason(topic, dueReviewTopics, daysUntilExam, profile)
  };
}

type PickTopicInput = {
  profile: UserProfile;
  completedTopicIds: string[];
  dueReviewTopics: Topic[];
  daysUntilExam: number;
  accuracies: ReturnType<typeof calculateTopicAccuracies>;
};

function pickTopicForToday(input: PickTopicInput): Topic {
  const { profile, completedTopicIds, dueReviewTopics, daysUntilExam, accuracies } = input;

  if (daysUntilExam <= 14) {
    const urgentReview = dueReviewTopics[0];
    if (urgentReview) return urgentReview;

    const lowAccuracy = accuracies
      .filter((accuracy) => accuracy.attempts > 0 && (accuracy.accuracy ?? 1) < 0.75)
      .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1))
      .map((accuracy) => getTopicById(accuracy.topicId))
      .find(Boolean);
    if (lowAccuracy) return lowAccuracy;
  }

  const dueReview = dueReviewTopics[0];
  if (dueReview && dueReview.reviewPriority >= 5) return dueReview;

  const unlearned = topics.filter((topic) => !completedTopicIds.includes(topic.id));
  const weakDomainTopic = unlearned.find((topic) => profile.weakDomains.includes(topic.domain));
  if (weakDomainTopic) return weakDomainTopic;

  return unlearned[0] ?? dueReview ?? topics[0];
}

function getAvailableMinutes(profile: UserProfile): number {
  const weekday = getWeekday();
  if (profile.restWeekdays.includes(weekday)) {
    return 15;
  }
  return weekday === "sunday" || weekday === "saturday"
    ? profile.weekendMinutes
    : profile.weekdayMinutes;
}

function buildNextAction(daysUntilExam: number, reviewCount: number, questionCount: number): string {
  if (daysUntilExam <= 14) {
    return "解説を読んだら、同じテーマの過去問をもう1問解いて記憶を固めましょう。";
  }
  if (reviewCount > 0) {
    return "今日のテーマ後に、復習カードを1つだけ片付けましょう。";
  }
  if (questionCount > 0) {
    return "確認問題に答えて、解説のひっかけポイントだけメモしましょう。";
  }
  return "参考書の該当範囲を読み、重要語句を自分の言葉で1行にまとめましょう。";
}

function buildReason(
  topic: Topic,
  dueReviewTopics: Topic[],
  daysUntilExam: number,
  profile: UserProfile
): string {
  if (dueReviewTopics.some((reviewTopic) => reviewTopic.id === topic.id)) {
    return "復習期限が来ているため、忘れ始める前に短く戻します。";
  }
  if (daysUntilExam <= 14) {
    return "試験日が近いため、新しい範囲より得点に直結しやすい弱点確認を優先します。";
  }
  if (profile.weakDomains.includes(topic.domain)) {
    return "初回設定で苦手意識がある分野なので、早めに慣れておきます。";
  }
  return `${getBookTitle(profile.selectedBookId)}と過去問演習をつなげやすい未学習テーマです。`;
}
