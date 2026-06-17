import type { StudyDomain } from "./content";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type ItExperience = "none" | "little" | "work" | "student";

export type UserProfile = {
  id: string;
  lineUserId?: string;
  createdAt: string;
  updatedAt: string;
  examDate: string;
  studyStartDate: string;
  weekdayMinutes: number;
  weekendMinutes: number;
  restWeekdays: Weekday[];
  selectedBookId: string;
  itExperience: ItExperience;
  weakDomains: StudyDomain[];
};

export type AnswerHistory = {
  id: string;
  userId: string;
  questionId: string;
  topicId: string;
  domain: StudyDomain;
  selectedChoiceId: "a" | "b" | "c" | "d";
  isCorrect: boolean;
  answeredAt: string;
};

export type ReviewItem = {
  userId: string;
  topicId: string;
  priority: number;
  reason: "wrong_answer" | "low_accuracy" | "manual" | "exam_near";
  dueDate: string;
  consecutiveCorrect: number;
  updatedAt: string;
};

export type StudySession = {
  id: string;
  userId: string;
  topicId: string;
  startedAt: string;
};
