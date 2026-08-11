import { themeExams } from "@/data/themeExams";
import { getTopic } from "@/lib/content";
import { getThemeBySlug } from "@/lib/learningCatalog";
import { getQuestionForDelivery } from "@/lib/questionBank/loader";
import type { ChoiceKey } from "@/types";
import type { LearningTheme } from "@/types/learningCatalog";
import type {
  ThemeExam,
  ThemeExamQuestionResult,
  ThemeExamQuestionView,
  ThemeExamResult,
} from "@/types/themeExam";
import { THEME_EXAM_PASS_RATE } from "@/types/themeExam";

// ============================================================================
// テーマ別 高難易度試験のデータアクセスと採点（純粋関数）。
// ----------------------------------------------------------------------------
// 問題の実体は統一問題バンク（lib/questionBank）にある。ここは
// 「どのテーマでどの問題をどの順に出すか」と「採点」だけを持つ。
//
// 採点をクライアントでも同じ実装で行えるよう、gradeThemeExam は
// QuestionRecord ではなく表示用の形（ThemeExamQuestionView）を受け取る。
// ============================================================================

const BY_SLUG = new Map(themeExams.map((e) => [e.themeSlug, e]));
const BY_ID = new Map(themeExams.map((e) => [e.examId, e]));

/** テーマslugから試験の構成を引く。 */
export function getThemeExam(themeSlug: string): ThemeExam | undefined {
  return BY_SLUG.get(themeSlug);
}

/** examIdから試験の構成を引く。 */
export function getThemeExamById(examId: string): ThemeExam | undefined {
  return BY_ID.get(examId);
}

/** 試験を持つテーマか。 */
export function hasThemeExam(themeSlug: string): boolean {
  return BY_SLUG.has(themeSlug);
}

/** すべての試験の構成。 */
export function getAllThemeExams(): ThemeExam[] {
  return themeExams;
}

/**
 * 出題する問題を表示用の形で解決する。
 *
 * 解決できないID・retired の問題は黙って除外する（画面を止めないため）。
 * 参照切れは npm run validate:questions が検出して CI で落とすので、
 * 画面側で気づけないぶんは検証側で必ず気づけるようにしてある。
 * questionNumber は除外後に振り直すので、表示上は常に 1..n が連番になる。
 */
export function resolveThemeExamQuestions(exam: ThemeExam): ThemeExamQuestionView[] {
  return exam.questionIds
    .map((id) => getQuestionForDelivery(id, "theme_exam"))
    .filter((q) => q !== undefined)
    .map((q, index) => ({
      id: q.id,
      questionNumber: index + 1,
      prompt: q.prompt,
      choices: q.choices,
      correctChoice: q.correctChoice,
      explanation: q.explanation,
      choiceExplanations: q.choiceExplanations,
      difficulty: q.estimatedDifficulty,
      topicId: q.primaryTopicId,
      topicTitle: getTopic(q.primaryTopicId)?.title ?? q.primaryTopicId,
      tags: q.tags ?? [],
    }));
}

/** 試験に対応するテーマ（学ぶ画面の章）。 */
export function getThemeExamTheme(exam: ThemeExam): LearningTheme | undefined {
  return getThemeBySlug(exam.themeSlug);
}

/** 正答率（％）。小数第1位を四捨五入した整数。母数0は0を返す。 */
export function percentage(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * 採点する。
 *
 * 未回答は不正解として正答数には数えないが、未回答数としても別に集計する
 * （「間違えた」と「手が回らなかった」を結果画面で区別するため）。
 */
export function gradeThemeExam(params: {
  sessionId: string;
  themeSlug: string;
  questions: ThemeExamQuestionView[];
  answers: Record<number, ChoiceKey | null>;
  passRate?: number;
}): ThemeExamResult {
  const { sessionId, themeSlug, questions, answers } = params;
  const passRate = params.passRate ?? THEME_EXAM_PASS_RATE;

  const results: ThemeExamQuestionResult[] = questions.map((q) => {
    const selected = answers[q.questionNumber] ?? null;
    return {
      questionId: q.id,
      questionNumber: q.questionNumber,
      selected,
      correctChoice: q.correctChoice,
      isCorrect: selected !== null && selected === q.correctChoice,
      isUnanswered: selected === null,
      topicId: q.topicId,
      topicTitle: q.topicTitle,
    };
  });

  const correct = results.filter((r) => r.isCorrect).length;
  const unanswered = results.filter((r) => r.isUnanswered).length;
  const rate = percentage(correct, results.length);

  // 復習先は「誤答が多い順」。同数のときは出題順を保つ（並びが実行ごとに変わらないように）。
  const counts = new Map<string, { topicTitle: string; incorrectCount: number }>();
  for (const r of results) {
    if (r.isCorrect) continue;
    const current = counts.get(r.topicId);
    if (current) current.incorrectCount += 1;
    else counts.set(r.topicId, { topicTitle: r.topicTitle, incorrectCount: 1 });
  }
  const reviewTopics = [...counts.entries()]
    .map(([topicId, v]) => ({ topicId, ...v }))
    .sort((a, b) => b.incorrectCount - a.incorrectCount);

  return {
    sessionId,
    themeSlug,
    total: results.length,
    correct,
    unanswered,
    rate,
    passed: rate >= passRate,
    questions: results,
    reviewTopics,
  };
}
