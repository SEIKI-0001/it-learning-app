// 章の仕上げ（総まとめ試験＋AI理解チェック）の記録。
//
// 保存先: UserProgress.checkpointProgress.chapterReview（user_progress.checkpoint_progress jsonb）。
// DBマイグレーションは不要。端末間マージは lib/mergeAppState.ts の mergeChapterReview が担う。
//
// 2つの記録は意図して分けてある:
//   themeExams          … 四択の総まとめ試験の結果。合否はここだけが決める。
//   understandingSignals … AI理解チェックの結果。学習支援用の補助シグナルで、
//                          合否・章クリア・Mastery には一切使わない（LLM判定は揺らぐため）。
//
// フィールドを足すときは必ず同時に:
//   1. ここに optional で追加
//   2. lib/mergeAppState.ts の mergeChapterReview を更新
//   3. test/mergeCheckpointProgress.test.ts を更新

/** 章ごとの総まとめ試験の記録。 */
export type ThemeExamRecord = {
  /** 最新の正答率（％）。 */
  latestRate: number;
  latestCorrect: number;
  latestTotal: number;
  /** 最高正答率（％）。 */
  bestRate: number;
  /** 一度でも合格したか。再受験で不合格になっても取り消さない。 */
  passed: boolean;
  /** 初めて合格した日時（ISO）。 */
  firstPassedAt?: string;
  /** 最新の受験日時（ISO）。 */
  lastAttemptAt: string;
};

/**
 * AI理解チェックの3段階。点数ではなく「次に何をするか」が伝わる語にする。
 *   solid  … 理解できている
 *   almost … あと一歩
 *   review … ここを確認しよう
 */
export type UnderstandingLevel = "solid" | "almost" | "review";

/** AI理解チェック1回ぶんの補助シグナル（トピック単位で最新の1件を持つ）。 */
export type UnderstandingSignal = {
  topicId: string;
  questionId: string;
  themeSlug: string;
  level: UnderstandingLevel;
  /** AIが挙げた不足点（最大3件）。要確認Topicの理由表示に使う。 */
  missingPoints: string[];
  /** 確認した日時（ISO）。 */
  checkedAt: string;
};

export type ChapterReviewState = {
  /** themeSlug → 総まとめ試験の記録。 */
  themeExams?: Record<string, ThemeExamRecord>;
  /** topicId → 最新のAI理解チェック結果。 */
  understandingSignals?: Record<string, UnderstandingSignal>;
};
