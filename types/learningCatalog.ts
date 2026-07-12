import type { TopicField } from "@/types/content";

/** 学ぶページへの遷移元。学習の記録形式には影響させない。 */
export type LessonEntrySource =
  | "learn"
  | "today"
  | "review"
  | "plan"
  | "progress";

/** レッスン内で最初に見せたい学習活動。 */
export type LessonActivity = "learn" | "quiz" | "review" | "check-pack";

export type LearningSection = {
  id: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  /** 既存TopicのID。教材本文はここへ複製しない。 */
  lessonIds: string[];
};

/** 参考書の章にあたる、学ぶ画面上のテーマ。 */
export type LearningTheme = {
  id: string;
  slug: string;
  field: TopicField;
  /** 参考書上の章番号。表示順とは別に明示しておく。 */
  chapterNumber: number;
  title: string;
  description: string;
  icon: string;
  order: number;
  sections: LearningSection[];
};

export type LessonLocation = {
  theme: LearningTheme;
  section: LearningSection;
  lessonId: string;
};

export type LessonStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "review_due";

export type ThemeProgress = {
  themeId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  reviewDueCount: number;
  status: "not_started" | "in_progress" | "completed";
  nextLessonId: string | null;
};
