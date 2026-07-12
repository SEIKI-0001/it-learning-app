import { learningThemes } from "@/data/learningCatalog";
import { getAllTopics, getTopic } from "@/lib/content";
import type { UserProgress } from "@/types";
import type { Topic } from "@/types/content";
import type {
  LearningSection,
  LearningTheme,
  LessonActivity,
  LessonEntrySource,
  LessonLocation,
  LessonStatus,
  ThemeProgress,
} from "@/types/learningCatalog";

export { learningThemes } from "@/data/learningCatalog";

export function getAllThemes(): LearningTheme[] {
  return [...learningThemes].sort((a, b) => a.order - b.order);
}

export function getThemeBySlug(themeSlug: string): LearningTheme | undefined {
  return learningThemes.find((theme) => theme.slug === themeSlug);
}

export function getSectionBySlug(
  themeSlug: string,
  sectionSlug: string,
): LearningSection | undefined {
  return getThemeBySlug(themeSlug)?.sections.find(
    (section) => section.slug === sectionSlug,
  );
}

export function getLessonLocation(lessonId: string): LessonLocation | undefined {
  for (const theme of learningThemes) {
    for (const section of theme.sections) {
      if (section.lessonIds.includes(lessonId)) {
        return { theme, section, lessonId };
      }
    }
  }
  return undefined;
}

export function getLessonsForSection(section: LearningSection): Topic[] {
  return section.lessonIds
    .map((lessonId) => getTopic(lessonId))
    .filter((topic): topic is Topic => Boolean(topic));
}

export function getLessonsForTheme(theme: LearningTheme): Topic[] {
  return theme.sections.flatMap(getLessonsForSection);
}

export function getOrderedLessonIds(): string[] {
  return getAllThemes().flatMap((theme) =>
    [...theme.sections]
      .sort((a, b) => a.order - b.order)
      .flatMap((section) => section.lessonIds),
  );
}

export function getLessonHref(
  lessonId: string,
  options: {
    from?: LessonEntrySource;
    activity?: LessonActivity;
    anchor?: string;
  } = {},
): string {
  const location = getLessonLocation(lessonId);
  if (!location) return "/learn";

  const { theme, section } = location;
  const query = new URLSearchParams();
  if (options.from) query.set("from", options.from);
  if (options.activity) query.set("activity", options.activity);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const anchor = options.anchor ? `#${options.anchor}` : "";
  return `/learn/${theme.slug}/${section.slug}/${lessonId}${suffix}${anchor}`;
}

export function getLessonStatus(
  lessonId: string,
  progress: UserProgress | undefined,
): LessonStatus {
  if (!progress) return "not_started";
  if (progress.reviewQueue.some((item) => item.topicId === lessonId)) {
    return "review_due";
  }
  const mastery = progress.topicMastery[lessonId] ?? 0;
  if (progress.completedTopics.includes(lessonId) || mastery >= 100) {
    return "completed";
  }
  if (mastery > 0) return "in_progress";
  return "not_started";
}

function isLessonCompleted(lessonId: string, progress: UserProgress): boolean {
  return (
    progress.completedTopics.includes(lessonId) ||
    (progress.topicMastery[lessonId] ?? 0) >= 100
  );
}

export function getNextLessonForTheme(
  theme: LearningTheme,
  progress: UserProgress | undefined,
): Topic | undefined {
  const lessonId = getLessonsForTheme(theme)
    .map((lesson) => lesson.id)
    .find((id) => !progress || !isLessonCompleted(id, progress));
  return lessonId ? getTopic(lessonId) : undefined;
}

export function getThemeProgress(
  theme: LearningTheme,
  progress: UserProgress | undefined,
): ThemeProgress {
  const lessons = getLessonsForTheme(theme);
  const completedLessons = progress
    ? lessons.filter((lesson) => isLessonCompleted(lesson.id, progress)).length
    : 0;
  const totalLessons = lessons.length;
  const reviewDueCount = progress
    ? lessons.filter((lesson) =>
        progress.reviewQueue.some((item) => item.topicId === lesson.id),
      ).length
    : 0;
  const progressPercent =
    totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  return {
    themeId: theme.id,
    totalLessons,
    completedLessons,
    progressPercent,
    reviewDueCount,
    status:
      completedLessons === 0
        ? "not_started"
        : completedLessons >= totalLessons
          ? "completed"
          : "in_progress",
    nextLessonId: getNextLessonForTheme(theme, progress)?.id ?? null,
  };
}

export function getContinueLesson(
  progress: UserProgress | undefined,
): Topic | undefined {
  if (!progress) return undefined;
  const orderedIds = getOrderedLessonIds();
  const completedIds = new Set(progress.completedTopics);
  const lastCompleted = [...progress.completedTopics]
    .reverse()
    .find((id) => orderedIds.includes(id));
  const afterLast = lastCompleted
    ? orderedIds.slice(orderedIds.indexOf(lastCompleted) + 1).find((id) => !completedIds.has(id))
    : undefined;
  const firstIncomplete = orderedIds.find((id) => !completedIds.has(id));
  return getTopic(afterLast ?? firstIncomplete ?? "");
}

export function getAdjacentLessons(lessonId: string): {
  previous?: Topic;
  next?: Topic;
} {
  const ids = getOrderedLessonIds();
  const index = ids.indexOf(lessonId);
  if (index === -1) return {};
  return {
    previous: index > 0 ? getTopic(ids[index - 1]) : undefined,
    next: index < ids.length - 1 ? getTopic(ids[index + 1]) : undefined,
  };
}

/** 開発時・テストで使う、静的カタログの整合性検査。 */
export function validateLearningCatalog(): string[] {
  const errors: string[] = [];
  const topicIds = new Set(getAllTopics().map((topic) => topic.id));
  const registeredIds = new Set<string>();
  const themeSlugs = new Set<string>();
  const themeOrders = new Set<number>();
  const chapterNumbers = new Set<number>();

  for (const theme of learningThemes) {
    if (themeSlugs.has(theme.slug)) errors.push(`テーマslugが重複しています: ${theme.slug}`);
    themeSlugs.add(theme.slug);
    if (themeOrders.has(theme.order)) errors.push(`テーマorderが重複しています: ${theme.order}`);
    themeOrders.add(theme.order);
    if (chapterNumbers.has(theme.chapterNumber)) {
      errors.push(`章番号が重複しています: ${theme.chapterNumber}`);
    }
    chapterNumbers.add(theme.chapterNumber);

    const sectionSlugs = new Set<string>();
    const sectionOrders = new Set<number>();
    for (const section of theme.sections) {
      if (section.lessonIds.length === 0) {
        errors.push(`空のセクションがあります: ${theme.title} > ${section.title}`);
      }
      if (sectionSlugs.has(section.slug)) {
        errors.push(`セクションslugが重複しています: ${theme.slug}/${section.slug}`);
      }
      sectionSlugs.add(section.slug);
      if (sectionOrders.has(section.order)) {
        errors.push(`セクションorderが重複しています: ${theme.title} > ${section.order}`);
      }
      sectionOrders.add(section.order);

      for (const lessonId of section.lessonIds) {
        if (!topicIds.has(lessonId)) errors.push(`存在しないTopic IDです: ${lessonId}`);
        if (registeredIds.has(lessonId)) errors.push(`Topic IDが重複しています: ${lessonId}`);
        registeredIds.add(lessonId);
      }
    }
  }

  for (const topicId of topicIds) {
    if (!registeredIds.has(topicId)) errors.push(`カタログ未登録のTopicです: ${topicId}`);
  }
  return errors;
}
