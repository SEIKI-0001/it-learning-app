// 到達度判定型・低入力進捗管理 第2弾 — 確認パックの型定義
//
// 設計方針:
//   - 確認パック = 確認問題（基礎理解）＋ 単語帳（用語定着）＋ 過去問レベル問題（本番対応力）
//     を1つに束ね、トピックごとに「本番対応OK」まで判定できるようにする。
//   - 自己申告では理解度・本番対応力を上げない。
//     基礎理解 → 確認問題 / 用語定着 → 単語帳 / 本番対応力 → 過去問レベル問題 の結果で見る。
//   - 本番対応OK（exam_ready）は過去問レベル問題の結果で判定する。
//   - API失敗 / Supabase未設定でも画面を止めない（既存のフォールバック方針を踏襲）。

import type { ChoiceKey } from "@/types";
import type { CheckQuestion, Difficulty } from "@/types/content";

// ---------------------------------------------------------------------------
// 過去問レベル問題（本番対応力を見るオリジナル4択問題）
// ---------------------------------------------------------------------------
// CheckQuestion と構造互換にして、既存の TopicQuiz でそのまま出題できるようにする。

export type ExamLevelQuestion = {
  id: string;
  topicId: string;
  prompt: string;
  choices: { key: ChoiceKey; text: string }[];
  correctChoice: ChoiceKey;
  explanation: string;
  difficulty: Difficulty;
  /** 誤答復習・分析用のタグ（任意）。 */
  examTags?: string[];
};

/** ExamLevelQuestion を CheckQuestion（TopicQuiz が受け取る形）に変換する。 */
export function examLevelToCheckQuestion(q: ExamLevelQuestion): CheckQuestion {
  return {
    id: q.id,
    prompt: q.prompt,
    choices: q.choices,
    correctChoice: q.correctChoice,
    explanation: q.explanation,
    difficulty: q.difficulty,
    reviewTags: q.examTags,
  };
}

// ---------------------------------------------------------------------------
// 確認パック（トピック単位の束）
// ---------------------------------------------------------------------------

/** 実施をすすめるタイミングの目安。 */
export type CheckPackTiming =
  | "after_learning" // 学習直後
  | "review_day" // 復習日
  | "exam_prep"; // 直前対策

export type TopicCheckPack = {
  packId: string;
  topicId: string;
  /** 確認問題（トピックの checkQuestions の id）。空/未一致ならトピックの全問を使う。 */
  quizQuestionIds: string[];
  /** 関連単語（wordlist のエントリ id）。 */
  flashcardIds: string[];
  /** 過去問レベル問題（examLevelQuestions の id）。 */
  examLevelQuestionIds: string[];
  recommendedTiming: CheckPackTiming;
  difficulty: Difficulty;
};

// ---------------------------------------------------------------------------
// 判定結果
// ---------------------------------------------------------------------------

/** 確認パック1回ぶんの結果ステータス。 */
export type CheckPackResultStatus =
  | "passed" // 過去問レベルまで本番対応OK
  | "review_needed" // 基準未達（要復習）
  | "weak" // 複数回未達
  | "incomplete"; // 途中までしか実施していない

export type TopicCheckPackAttempt = {
  attemptId: string;
  userId: string;
  packId: string;
  topicId: string;
  startedAt?: string | null;
  completedAt?: string | null;
  quizScoreRate?: number | null; // 0〜100
  flashcardScoreRate?: number | null; // 0〜100
  examLevelScoreRate?: number | null; // 0〜100
  resultStatus: CheckPackResultStatus;
  nextAction?: string | null;
  createdAt?: string;
};

// ---------------------------------------------------------------------------
// 判定しきい値（自己申告では上げない・結果でのみ判定）
// ---------------------------------------------------------------------------

/** 確認問題 75%以上 → 基礎理解OK */
export const QUIZ_PASS_RATE = 75;
/** 関連単語 80%以上 mastered 相当 → 用語定着OK */
export const FLASHCARD_PASS_RATE = 80;
/** 過去問レベル問題 70%以上 → 本番対応OK */
export const EXAM_LEVEL_PASS_RATE = 70;
