import { questions } from "@/data/questions";
import { domainLabels, getTopicById, topics } from "@/data/topics";
import { daysBetween, isSameDay, todayISO } from "@/lib/date";
import type { AppRepository } from "@/lib/storage/types";
import type { StudyDomain, Topic } from "@/types/content";
import type { AnswerHistory, ReviewItem, UserProfile } from "@/types/user";
import type { AdminMetrics, DomainProgress, ProgressSummary, TopicAccuracy } from "@/types/study";

export function calculateTopicAccuracies(answers: AnswerHistory[]): TopicAccuracy[] {
  return topics.map((topic) => {
    const topicAnswers = answers.filter((answer) => answer.topicId === topic.id);
    const correct = topicAnswers.filter((answer) => answer.isCorrect).length;
    return {
      topicId: topic.id,
      attempts: topicAnswers.length,
      correct,
      accuracy: topicAnswers.length > 0 ? correct / topicAnswers.length : null
    };
  });
}

export function getCompletedTopicIds(answers: AnswerHistory[]): string[] {
  return Array.from(new Set(answers.filter((answer) => answer.isCorrect).map((answer) => answer.topicId)));
}

export async function getProgressSummary(
  repository: AppRepository,
  profile: UserProfile | null,
  userId: string
): Promise<ProgressSummary> {
  const answers = await repository.listAnswers(userId);
  const reviewItems = await repository.getReviewItems(userId);
  const completedTopicIds = getCompletedTopicIds(answers);
  const topicAccuracies = calculateTopicAccuracies(answers);
  const domainProgress = buildDomainProgress(answers, completedTopicIds);
  const weakTopics = getWeakTopics(topicAccuracies, reviewItems);
  const pendingReviewTopics = getPendingReviewTopics(reviewItems);
  const daysUntilExam = profile ? daysBetween(todayISO(), profile.examDate) : null;
  const completionRate = topics.length === 0 ? 0 : completedTopicIds.length / topics.length;

  return {
    totalTopics: topics.length,
    completedTopics: completedTopicIds.length,
    completionRate,
    daysUntilExam,
    status: getStudyStatus(daysUntilExam, completionRate, pendingReviewTopics.length),
    domainProgress,
    topicAccuracies,
    weakTopics,
    pendingReviewTopics,
    nextRecommendedTopic: pickNextTopic(topicAccuracies, completedTopicIds, reviewItems, profile)
  };
}

export async function getAdminMetrics(repository: AppRepository): Promise<AdminMetrics> {
  const [users, answers, reviewItems, sessions] = await Promise.all([
    repository.listUserProfiles(),
    repository.listAnswers(),
    repository.listReviewItems(),
    repository.listStudySessions()
  ]);

  const domainAccuracies = (Object.keys(domainLabels) as StudyDomain[]).map((domain) => {
    const domainAnswers = answers.filter((answer) => answer.domain === domain);
    const correct = domainAnswers.filter((answer) => answer.isCorrect).length;
    return {
      domain,
      attempts: domainAnswers.length,
      accuracy: domainAnswers.length > 0 ? correct / domainAnswers.length : null
    };
  });

  const weakTopicRanking = topics
    .map((topic) => {
      const topicAnswers = answers.filter((answer) => answer.topicId === topic.id);
      const wrongCount = topicAnswers.filter((answer) => !answer.isCorrect).length;
      const correct = topicAnswers.filter((answer) => answer.isCorrect).length;
      const reviewBoost = reviewItems.filter((item) => item.topicId === topic.id).length;
      return {
        topic,
        wrongCount: wrongCount + reviewBoost,
        accuracy: topicAnswers.length > 0 ? correct / topicAnswers.length : null
      };
    })
    .filter((item) => item.wrongCount > 0 || item.accuracy !== null)
    .sort((a, b) => b.wrongCount - a.wrongCount || (a.accuracy ?? 1) - (b.accuracy ?? 1))
    .slice(0, 8);

  return {
    registeredUsers: users.length,
    usersWithExamDate: users.filter((user) => Boolean(user.examDate)).length,
    studiedTodayUsers: new Set(sessions.filter((session) => isSameDay(session.startedAt)).map((s) => s.userId)).size,
    answeredTodayCount: answers.filter((answer) => isSameDay(answer.answeredAt)).length,
    domainAccuracies,
    weakTopicRanking
  };
}

function buildDomainProgress(answers: AnswerHistory[], completedTopicIds: string[]): DomainProgress[] {
  return (Object.keys(domainLabels) as StudyDomain[]).map((domain) => {
    const domainTopics = topics.filter((topic) => topic.domain === domain);
    const domainAnswers = answers.filter((answer) => answer.domain === domain);
    const correct = domainAnswers.filter((answer) => answer.isCorrect).length;
    const completedTopics = domainTopics.filter((topic) => completedTopicIds.includes(topic.id)).length;

    return {
      domain,
      totalTopics: domainTopics.length,
      completedTopics,
      completionRate: domainTopics.length > 0 ? completedTopics / domainTopics.length : 0,
      accuracy: domainAnswers.length > 0 ? correct / domainAnswers.length : null
    };
  });
}

function getWeakTopics(topicAccuracies: TopicAccuracy[], reviewItems: ReviewItem[]): Topic[] {
  const reviewTopicIds = new Set(reviewItems.filter((item) => item.priority >= 4).map((item) => item.topicId));
  return topicAccuracies
    .filter((accuracy) => {
      if (reviewTopicIds.has(accuracy.topicId)) return true;
      return accuracy.attempts >= 1 && (accuracy.accuracy ?? 1) < 0.7;
    })
    .map((accuracy) => getTopicById(accuracy.topicId))
    .filter((topic): topic is Topic => Boolean(topic))
    .slice(0, 8);
}

function getPendingReviewTopics(reviewItems: ReviewItem[]): Topic[] {
  const today = todayISO();
  return reviewItems
    .filter((item) => item.dueDate <= today)
    .sort((a, b) => b.priority - a.priority)
    .map((item) => getTopicById(item.topicId))
    .filter((topic): topic is Topic => Boolean(topic));
}

function pickNextTopic(
  accuracies: TopicAccuracy[],
  completedTopicIds: string[],
  reviewItems: ReviewItem[],
  profile: UserProfile | null
): Topic | undefined {
  const dueReview = getPendingReviewTopics(reviewItems)[0];
  if (dueReview) return dueReview;

  const weakDomain = profile?.weakDomains[0];
  const unlearned = topics.filter((topic) => !completedTopicIds.includes(topic.id));
  const inWeakDomain = weakDomain ? unlearned.find((topic) => topic.domain === weakDomain) : undefined;
  if (inWeakDomain) return inWeakDomain;

  const lowAccuracyTopic = accuracies
    .filter((accuracy) => accuracy.attempts > 0 && (accuracy.accuracy ?? 1) < 0.7)
    .map((accuracy) => getTopicById(accuracy.topicId))
    .find(Boolean);
  return lowAccuracyTopic ?? unlearned[0] ?? topics[0];
}

function getStudyStatus(
  daysUntilExam: number | null,
  completionRate: number,
  pendingReviewCount: number
): ProgressSummary["status"] {
  if (daysUntilExam === null) return "not_started";
  if (daysUntilExam <= 14) return "final_review";
  if (completionRate < 0.25 && daysUntilExam < 30) return "behind";
  if (pendingReviewCount >= 5 && daysUntilExam < 45) return "behind";
  return "on_track";
}
