// AI採点（記述問題）の共有型定義。
// 問題データは data/writtenQuestions.ts、採点処理は lib/ai/gradeWrittenAnswer.ts。
// クライアント(app/ai-grading/page.tsx)・API Route・採点ロジックで共通利用する。

/** 記述問題の難易度。 */
export type WrittenDifficulty = "normal" | "hard";

/** 記述問題1問ぶんのデータ。公式過去問は転載せずオリジナル設問とする。 */
export type WrittenQuestion = {
  id: string;
  category: string;
  difficulty: WrittenDifficulty;
  question: string;
  /** 模範解答（採点の基準・結果表示に使う）。 */
  modelAnswer: string;
  /** 採点観点（観点ごとに満たせているかをAIが見る）。 */
  rubric: string[];
  /** 含まれていてほしい重要キーワード。 */
  keywords: string[];
};

/** 採点グレード（S〜D）。 */
export type WrittenGrade = "S" | "A" | "B" | "C" | "D";

/** AI採点の結果。Gemini からの JSON もこの形に合わせる。 */
export type GradeResult = {
  score: number;
  grade: WrittenGrade;
  isCorrect: boolean;
  summary: string;
  goodPoints: string[];
  missingPoints: string[];
  feedback: string;
  modelAnswer: string;
  nextReviewTheme: string;
};

/** 採点に使われたプロバイダ。 */
export type GradeProvider = "gemini" | "claude";

/** 保存済みのAI採点記録（履歴・復習用）。DB(ai_grading_records)の1行に対応。 */
export type GradingRecord = {
  id: string;
  questionId: string;
  category: string;
  userAnswer: string;
  result: GradeResult;
  provider: GradeProvider;
  model: string;
  createdAt: string;
};
