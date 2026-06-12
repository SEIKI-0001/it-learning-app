const PROGRESS_KEY = 'it-kickstart-progress';

export interface Progress {
  completedLessons: string[];
  lessonScores: Record<string, number>;
  totalXP: number;
  earnedBadges: string[];
}

function defaultProgress(): Progress {
  return { completedLessons: [], lessonScores: {}, totalXP: 0, earnedBadges: [] };
}

export function getProgress(): Progress {
  if (typeof window === 'undefined') return defaultProgress();
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    return stored ? JSON.parse(stored) : defaultProgress();
  } catch {
    return defaultProgress();
  }
}

function saveProgress(progress: Progress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function completeLesson(
  moduleId: string,
  lessonId: string,
  correctAnswers: number,
  totalQuestions: number,
): Progress {
  const progress = getProgress();
  const key = `${moduleId}/${lessonId}`;
  const scorePercent = Math.round((correctAnswers / totalQuestions) * 100);
  const baseXP = 50;
  const bonusXP = Math.round((correctAnswers / totalQuestions) * 50);
  const xpEarned = baseXP + bonusXP;

  const alreadyCompleted = progress.completedLessons.includes(key);
  if (!alreadyCompleted) {
    progress.completedLessons.push(key);
    progress.totalXP += xpEarned;
  } else {
    // Re-attempt: only add XP if score improved
    const prevScore = progress.lessonScores[key] ?? 0;
    if (scorePercent > prevScore) {
      const prevBonus = Math.round((prevScore / 100) * 50);
      progress.totalXP += bonusXP - prevBonus;
    }
  }
  progress.lessonScores[key] = Math.max(scorePercent, progress.lessonScores[key] ?? 0);

  saveProgress(progress);
  return progress;
}

export function awardBadge(moduleId: string): Progress {
  const progress = getProgress();
  if (!progress.earnedBadges.includes(moduleId)) {
    progress.earnedBadges.push(moduleId);
    progress.totalXP += 200;
    saveProgress(progress);
  }
  return progress;
}

export function isLessonCompleted(moduleId: string, lessonId: string): boolean {
  return getProgress().completedLessons.includes(`${moduleId}/${lessonId}`);
}

export function getLessonScore(moduleId: string, lessonId: string): number | null {
  const score = getProgress().lessonScores[`${moduleId}/${lessonId}`];
  return score !== undefined ? score : null;
}

export function getModuleCompletionCount(moduleId: string): number {
  return getProgress().completedLessons.filter((k) => k.startsWith(`${moduleId}/`)).length;
}

export function resetProgress(): void {
  localStorage.removeItem(PROGRESS_KEY);
}
