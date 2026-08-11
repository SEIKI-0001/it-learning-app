// テーマ別 高難易度試験の型。
//
// 位置づけ:
//   確認パック（トピック単位）… そのトピックを一つずつ確実にするための演習。
//   テーマ別試験（章単位）    … 章を通して、複数トピックをまたぐ問い方に耐えられるかを見る。
//   公式過去問（年度単位）    … 本番そのものを通しで解く。
//
// なぜ章単位の層を別に設けるか:
//   公式過去問の約2割は「適切なものだけを全て挙げたものはどれか」の組合せ型、
//   約2割は資料や擬似言語のプログラムを読ませる問題で、いずれも1トピックだけでは
//   成立しない。トピック単位の確認パックにこの形式を入れると、そのトピックの
//   理解を測るという役割から外れてしまうため、章単位の演習として分けている。
//
// 記録:
//   回答は question_attempts に question_type = "theme_exam" で残す。
//   確認パック（exam_level）とは別の種類として集計できるようにするため。

import type { ChoiceKey } from "@/types";
import type { Difficulty } from "@/types/content";

/** 1テーマぶんの試験の構成。data/themeExams.ts が持つ。 */
export type ThemeExam = {
  /** 例: "theme-exam-information-security"。 */
  examId: string;
  /** data/learningCatalog.ts の LearningTheme.slug。 */
  themeSlug: string;
  /** 出題する問題ID（この順で出す）。 */
  questionIds: string[];
  /** 合格とみなす正答率（％）。 */
  passRate: number;
};

/** 出題1問ぶんの表示用の形。正答と解説も含む（採点はクライアントで完結する）。 */
export type ThemeExamQuestionView = {
  id: string;
  /** 1始まりの出題番号。 */
  questionNumber: number;
  prompt: string;
  choices: { key: ChoiceKey; text: string }[];
  correctChoice: ChoiceKey;
  explanation: string;
  /** 選択肢ごとの短い解説。結果画面で誤答の理由を示すために使う。 */
  choiceExplanations?: Partial<Record<ChoiceKey, string>>;
  difficulty: Difficulty;
  /** 復習先のトピックID。 */
  topicId: string;
  /** 復習先のトピック名（結果画面の表示用）。 */
  topicTitle: string;
  tags: string[];
};

/** 1問ぶんの採点結果。 */
export type ThemeExamQuestionResult = {
  questionId: string;
  questionNumber: number;
  selected: ChoiceKey | null;
  correctChoice: ChoiceKey;
  isCorrect: boolean;
  isUnanswered: boolean;
  topicId: string;
  topicTitle: string;
};

/** 試験1回ぶんの採点結果。 */
export type ThemeExamResult = {
  /** この演習1回を識別するID。question_attempts の attempt_group_id に使う。 */
  sessionId: string;
  themeSlug: string;
  total: number;
  correct: number;
  unanswered: number;
  /** 正答率（％、小数第1位を四捨五入した整数）。 */
  rate: number;
  passed: boolean;
  questions: ThemeExamQuestionResult[];
  /** 誤答が多い順に並べた復習先トピック。 */
  reviewTopics: { topicId: string; topicTitle: string; incorrectCount: number }[];
};

/** 既定の合格ライン。公式試験の総合評価点（1000点満点中600点）に合わせる。 */
export const THEME_EXAM_PASS_RATE = 60;
