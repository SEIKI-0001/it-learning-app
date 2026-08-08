// 作問の設計図（QuestionBlueprint）。
//
// なぜ必要か:
//   これまでの取り込み経路は「完成した候補JSON」から始まっていた。
//   何を測る問題を、どういう筋道で、どんな誤答で成立させるかは作った人の頭の中にしかなく、
//   出来上がったものを見て良し悪しを言うしかなかった。
//   設計図を先に書いて残すと、次の3つができるようになる:
//     - 完成品が狙いどおりか（設計図との整合）を機械的に検査できる
//     - 公式問題のレベル感を、参照した問題として明示できる
//     - 作り直すときに「何を作ろうとしていたか」から始められる
//
// 生成そのものはアプリの実行時には行わない。設計図の作成・検証・変換はすべて
// オフラインのスクリプト（scripts/question-bank/blueprint.mjs）で行う。
//
// 重要: 設計図は「作問の指示」であって出典ではない。
// referenceQuestionIds に公式問題を並べても、それは「この問題をもとに出題した」という
// 主張にはならない（それは modified_official + official.derivedFromQuestionId の役目）。

import type { QuestionPattern } from "@/types/questionBank";

/** 参照できる公式問題の数の範囲。 */
export const MIN_REFERENCE_QUESTIONS = 2;
export const MAX_REFERENCE_QUESTIONS = 5;

/** 設計図が指定できる難易度（作問時の estimatedDifficulty と同じ目盛り）。 */
export const MIN_TARGET_DIFFICULTY = 1;
export const MAX_TARGET_DIFFICULTY = 3;

export type QuestionBlueprint = {
  /** 設計図のID。完成した問題のIDと対応させる（1設計図 = 1問）。 */
  id: string;
  /** アプリ内トピックID（復習導線の主キー）。完成問題の primaryTopicId と一致させる。 */
  primaryTopicId: string;
  /** シラバス上の位置（data/ipaSyllabus.ts の IpaSyllabusItem.id）。 */
  syllabusNode?: string;
  /**
   * この問題で何が分かれば正解できるか。
   * 「〜を知っている」ではなく「〜を判断できる」の形で書く（測れる粒度にするため）。
   */
  learningObjective: string;
  questionPattern: QuestionPattern;
  /** 狙う難易度（1〜3）。完成問題の estimatedDifficulty と一致させる。 */
  targetDifficulty: number;
  /**
   * 正解に至るまでに踏む必要のある推論の段。
   * 1段しかない問題は用語の暗記に落ちるので、application 以上では2段以上を求める。
   */
  requiredReasoningSteps: string[];
  /**
   * 誤答をどう成立させるか（例: "上位概念と取り違える" / "順序を入れ替える"）。
   * 誤答の作り方を先に決めておかないと、消去法だけで解ける問題になりやすい。
   */
  distractorStrategies: string[];
  /**
   * 作問時に参照する公式問題のID。レベル感を合わせるために見るもので、出典ではない。
   * 問題バンクに実在する公式問題であること（検証で確認する）。
   */
  referenceQuestionIds: string[];
  /**
   * 参照問題から持ち込んではいけない要素（例: "同じ企業名" / "同じ数値"）。
   * 「参考にする」と「引き写す」の線をどこに引いたかを残す。
   */
  prohibitedCopyElements: string[];
  /**
   * 作問プロンプトの版。data/question-bank/prompts/<promptVersion>.md に対応する。
   * 完成問題の generation.promptVersion と一致させる。
   */
  promptVersion: string;
  /** 補足（任意）。 */
  notes?: string;
};

/** 設計図ファイル1件ぶん。 */
export type QuestionBlueprintFile = {
  schemaVersion: 1;
  blueprints: QuestionBlueprint[];
};
