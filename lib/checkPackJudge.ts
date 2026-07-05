import type { CheckPackResultStatus } from "@/types/checkPack";
import {
  EXAM_LEVEL_PASS_RATE,
  FLASHCARD_PASS_RATE,
  QUIZ_PASS_RATE,
} from "@/types/checkPack";
import type { TopicStage } from "@/types/studyProgress";

// ============================================================================
// 確認パックの判定（純粋関数・集計ロジック）。
// ----------------------------------------------------------------------------
// 方針:
//   - 自己申告では上げない。基礎理解=確認問題 / 用語定着=単語帳 /
//     本番対応力=過去問レベル問題の「結果」でのみ判定する。
//   - 本番対応OK（exam_ready）は過去問レベル問題の結果で判定する。
//   - このモジュールは DB にも React にも依存しない。
//     → 次フェーズの IntegratedLearningStatus からも再利用できるよう分離している。
// ============================================================================

/** パック各セクションの実施結果（0〜100 の正答率、または未実施 null）。 */
export type PackRates = {
  quizRate: number | null;
  flashcardRate: number | null;
  examLevelRate: number | null;
};

/** しきい値に対する各セクションの合否・実施状況。 */
export type PackJudgement = {
  quizAttempted: boolean;
  termsAttempted: boolean;
  examAttempted: boolean;
  quizOk: boolean;
  termsOk: boolean;
  examOk: boolean;
  /** 3セクションすべてを実施したか（未実施があると incomplete 判定に使う）。 */
  complete: boolean;
};

/** 正答率としきい値から各セクションの合否を求める。 */
export function judgeRates(rates: PackRates): PackJudgement {
  const quizAttempted = rates.quizRate != null;
  const termsAttempted = rates.flashcardRate != null;
  const examAttempted = rates.examLevelRate != null;
  return {
    quizAttempted,
    termsAttempted,
    examAttempted,
    quizOk: quizAttempted && (rates.quizRate as number) >= QUIZ_PASS_RATE,
    termsOk:
      termsAttempted && (rates.flashcardRate as number) >= FLASHCARD_PASS_RATE,
    examOk:
      examAttempted && (rates.examLevelRate as number) >= EXAM_LEVEL_PASS_RATE,
    complete: quizAttempted && termsAttempted && examAttempted,
  };
}

export type StageDecision = {
  stage: TopicStage;
  resultStatus: CheckPackResultStatus;
  nextAction: string;
  /** 更新後の連続失敗回数（topic_progress に保存する）。 */
  consecutiveFailedCount: number;
};

/**
 * パックの判定結果から topic_progress.stage / result_status / 次の推奨行動を決める。
 *
 * ステージ更新ルール:
 *   - 確認問題未達                         → review_needed（連続未達2回以上で weak）
 *   - 確認問題OK / 単語未達                → terms_stabilizing
 *   - 確認問題OK / 単語OK / 過去問レベル未達 → exam_check_pending
 *   - 確認問題OK / 単語OK / 過去問レベルOK  → exam_ready（本番対応OK）
 *
 * result_status:
 *   - 3セクション未完了 → incomplete
 *   - stage=weak        → weak
 *   - stage=exam_ready  → passed
 *   - それ以外          → review_needed
 */
export function decidePackStage(
  judgement: PackJudgement,
  prevConsecutiveFailedCount: number,
): StageDecision {
  // 途中離脱（未完了）。ステージは動かさない前提で incomplete を返す。
  if (!judgement.complete && !judgement.quizAttempted) {
    return {
      stage: "check_pending",
      resultStatus: "incomplete",
      nextAction: "確認パックを最後まで進めて、いまの到達度を確かめよう。",
      consecutiveFailedCount: prevConsecutiveFailedCount,
    };
  }

  let stage: TopicStage;
  let consecutiveFailedCount = prevConsecutiveFailedCount;
  let nextAction: string;

  if (!judgement.quizOk) {
    // 基礎理解が未達。連続未達で苦手へ。
    consecutiveFailedCount = prevConsecutiveFailedCount + 1;
    if (consecutiveFailedCount >= 2) {
      stage = "weak";
      nextAction = "つまずきが続いています。トピックの解説にもう一度戻ってから、確認問題を解き直そう。";
    } else {
      stage = "review_needed";
      nextAction = "確認問題の正答率が基準に届きませんでした。解説を見直して復習しよう。";
    }
  } else if (!judgement.termsOk) {
    consecutiveFailedCount = 0;
    stage = "terms_stabilizing";
    nextAction = "基礎はOK。関連用語がまだあいまいなので、単語帳で用語を固めよう。";
  } else if (!judgement.examOk) {
    consecutiveFailedCount = 0;
    stage = "exam_check_pending";
    nextAction = "基礎・用語はOK。あとは過去問レベル問題で本番対応力を確かめよう。";
  } else {
    consecutiveFailedCount = 0;
    stage = "exam_ready";
    nextAction = "本番対応OK！この調子で他のトピックへ進もう。直前期にもう一度解くと定着します。";
  }

  const resultStatus: CheckPackResultStatus = !judgement.complete
    ? "incomplete"
    : stage === "weak"
      ? "weak"
      : stage === "exam_ready"
        ? "passed"
        : "review_needed";

  return { stage, resultStatus, nextAction, consecutiveFailedCount };
}
