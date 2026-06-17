import type { AnswerHistory, ReviewItem, StudySession, UserProfile } from "@/types/user";

export type AppRepository = {
  getUserProfile(userId: string): Promise<UserProfile | null>;
  upsertUserProfile(profile: UserProfile): Promise<UserProfile>;
  listUserProfiles(): Promise<UserProfile[]>;
  recordAnswer(answer: AnswerHistory): Promise<AnswerHistory>;
  listAnswers(userId?: string): Promise<AnswerHistory[]>;
  getReviewItems(userId: string): Promise<ReviewItem[]>;
  upsertReviewItem(item: ReviewItem): Promise<ReviewItem>;
  deleteReviewItem(userId: string, topicId: string): Promise<void>;
  listReviewItems(userId?: string): Promise<ReviewItem[]>;
  recordStudySession(session: StudySession): Promise<StudySession>;
  listStudySessions(userId?: string): Promise<StudySession[]>;
};

export type LocalDatabase = {
  users: UserProfile[];
  answers: AnswerHistory[];
  reviewItems: ReviewItem[];
  studySessions: StudySession[];
};
