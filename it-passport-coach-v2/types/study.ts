import type { Question, StudyDomain, Topic } from "./content";

export type TopicAccuracy = {
  topicId: string;
  attempts: number;
  correct: number;
  accuracy: number | null;
};

export type DomainProgress = {
  domain: StudyDomain;
  totalTopics: number;
  completedTopics: number;
  completionRate: number;
  accuracy: number | null;
};

export type StudyRecommendation = {
  userId: string;
  date: string;
  topic: Topic;
  estimatedMinutes: number;
  bookRange: string;
  beginnerExplanation: string;
  diagramText: string;
  questions: Question[];
  reviewTopics: Topic[];
  nextAction: string;
  reason: string;
};

export type ProgressSummary = {
  totalTopics: number;
  completedTopics: number;
  completionRate: number;
  daysUntilExam: number | null;
  status: "not_started" | "on_track" | "behind" | "final_review";
  domainProgress: DomainProgress[];
  topicAccuracies: TopicAccuracy[];
  weakTopics: Topic[];
  pendingReviewTopics: Topic[];
  nextRecommendedTopic?: Topic;
};

export type AdminMetrics = {
  registeredUsers: number;
  usersWithExamDate: number;
  studiedTodayUsers: number;
  answeredTodayCount: number;
  domainAccuracies: Array<{
    domain: StudyDomain;
    attempts: number;
    accuracy: number | null;
  }>;
  weakTopicRanking: Array<{
    topic: Topic;
    wrongCount: number;
    accuracy: number | null;
  }>;
};
