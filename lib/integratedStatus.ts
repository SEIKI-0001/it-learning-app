import type { TopicField } from "@/types/content";
import {
  UNDERSTOOD_STAGES,
  type TopicStage,
} from "@/types/studyProgress";
import {
  DIRECT_PERIOD_DAYS,
  READINESS_WEIGHTS_DIRECT,
  READINESS_WEIGHTS_NORMAL,
  RISK_THRESHOLDS,
  STATUS_THRESHOLDS,
  focusHintMessage,
  overallStatusLabel,
  type IntegratedLearningStatus,
  type MainRisk,
  type OverallStatus,
  type ReadinessWeights,
  type RecommendedFocus,
  type WeakTopic,
} from "@/types/integratedStatus";

// ============================================================================
// 統合進捗判定（純粋関数・集計ロジック）。
// ----------------------------------------------------------------------------
// 方針:
//   - DB にも React にも依存しない。API Route が生データを集めてここに渡す。
//   - 集計は既存の第1/2弾（checkPackJudge / topicStageAggregate）と同じく分離しておき、
//     LINE Bot・次フェーズの計画修正案からも再利用できるようにする。
//   - 自己申告（日次達成度）は inputProgressRate の推定にだけ使う。
//     基礎理解・用語定着・本番対応力は確認問題・単語帳・過去問レベル問題の「結果」で判定する。
// ============================================================================

/** 集計に必要なトピックの最小情報。 */
export type IntegratedTopicInfo = {
  id: string;
  field: TopicField;
  title: string;
};

/** 集計に必要な topic_progress の最小情報。 */
export type IntegratedTopicProgress = {
  topicId: string;
  stage: TopicStage;
};

/** 集計に必要な単語進捗の最小情報。 */
export type IntegratedWordProgress = {
  status: string; // new / learning / weak / mastered
  nextReviewAt: string | null; // ISO
};

/** 集計に必要な日次達成度報告の最小情報。 */
export type IntegratedDailyReport = {
  estimatedCompletionRate: number | null; // rest は null（推定に含めない）
};

/** 集計に必要な過去問レベル回答の最小情報。 */
export type IntegratedExamAttempt = {
  isCorrect: boolean;
};

export type IntegratedStatusInputs = {
  statusDate: string; // "YYYY-MM-DD"
  now: Date;
  daysUntilExam: number | null;
  topics: IntegratedTopicInfo[];
  topicProgress: IntegratedTopicProgress[];
  wordProgress: IntegratedWordProgress[];
  totalWordCount: number;
  recentReports: IntegratedDailyReport[];
  examLevelAttempts: IntegratedExamAttempt[];
};

const ALL_FIELDS: TopicField[] = ["technology", "management", "strategy"];

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * 分野バランススコア（0〜100）。
 * 各分野の「基礎理解OKトピック / その分野のトピック数」の比率を求め、
 * 最も進んでいる分野に対して最も遅れている分野がどれだけ追いついているかを見る。
 *   - 3分野が均等に進んでいれば 100。
 *   - どこか1分野に偏っている（他が0）ほど 0 に近づく。
 *   - まだ何も理解できていなければ 0。
 */
function computeFieldBalance(
  topics: IntegratedTopicInfo[],
  understoodTopicIds: Set<string>,
): number {
  const ratios: number[] = [];
  for (const field of ALL_FIELDS) {
    const inField = topics.filter((t) => t.field === field);
    if (inField.length === 0) continue;
    const understood = inField.filter((t) => understoodTopicIds.has(t.id)).length;
    ratios.push(understood / inField.length);
  }
  if (ratios.length === 0) return 0;
  const max = Math.max(...ratios);
  const min = Math.min(...ratios);
  if (max === 0) return 0;
  return Math.round((min / max) * 100);
}

/** 過去問レベル問題の正答率（回答が無ければ null）。 */
function computeExamLevelAccuracy(
  attempts: IntegratedExamAttempt[],
): number | null {
  if (attempts.length === 0) return null;
  const correct = attempts.filter((a) => a.isCorrect).length;
  return Math.round((correct / attempts.length) * 100);
}

/**
 * 今週の推奨配分を決める（合計100）。
 *   - 直前期        : 復習＋過去問レベル寄り
 *   - 基礎不足       : 確認問題・復習寄り
 *   - 単語不足       : 単語復習寄り
 *   - 本番対応不足    : 過去問レベル寄り
 *   - それ以外       : バランス
 */
function decideRecommendedFocus(args: {
  directPeriod: boolean;
  basicUnderstandingRate: number;
  flashcardMasteryRate: number;
  examReadyRate: number;
}): RecommendedFocus {
  if (args.directPeriod) {
    return { textbook: 10, review: 40, examPractice: 50 };
  }
  if (args.basicUnderstandingRate < RISK_THRESHOLDS.examReadyShortageMinBasic) {
    return { textbook: 30, review: 50, examPractice: 20 };
  }
  if (args.flashcardMasteryRate < 50) {
    return { textbook: 15, review: 60, examPractice: 25 };
  }
  if (args.examReadyRate < RISK_THRESHOLDS.examReadyShortageRate) {
    return { textbook: 10, review: 35, examPractice: 55 };
  }
  return { textbook: 25, review: 40, examPractice: 35 };
}

/**
 * 総合ステータスを決める（重い順に評価し、最初に該当したものを返す）。
 * readiness のバンドに加え、リスク（過去問レベル低迷・weak 多数・復習滞留）でも段階を落とす。
 */
function decideOverallStatus(args: {
  readinessScore: number;
  daysUntilExam: number | null;
  examReadyRate: number;
  examLevelLow: boolean;
  weakTopicCount: number;
  reviewNeededTopicCount: number;
}): OverallStatus {
  const t = STATUS_THRESHOLDS;

  // 直前期（7日以内）に本番対応OKが極端に少ない → 相談が必要。
  if (
    args.daysUntilExam != null &&
    args.daysUntilExam <= t.consultationExamDays &&
    args.examReadyRate < t.consultationExamReadyRate
  ) {
    return "consultation_needed";
  }

  // 立て直しが必要：readiness 極端に低い、または過去問レベル低迷。
  if (args.readinessScore < t.delayed || args.examLevelLow) {
    return "recovery_needed";
  }

  // 遅れ：readiness 中低位、または weak が一定数以上。
  if (
    args.readinessScore < t.slightlyDelayed ||
    args.weakTopicCount >= t.weakDelayedCount
  ) {
    return "delayed";
  }

  // 少し遅れ：readiness やや低位、または軽微な復習滞留。
  if (
    args.readinessScore < t.onTrack ||
    args.reviewNeededTopicCount >= t.reviewMinorCount
  ) {
    return "slightly_delayed";
  }

  return "on_track";
}

/** 主なリスクを重い順に抽出する。 */
function collectMainRisks(args: {
  examLevelLow: boolean;
  examLevelAccuracy: number | null;
  weakTopicCount: number;
  examReadyRate: number;
  basicUnderstandingRate: number;
  directPeriod: boolean;
  termsBacklogCount: number;
  dailyLow: boolean;
  inputProgressRate: number;
  fieldBalanceScore: number;
  basicUnderstoodTopicCount: number;
}): MainRisk[] {
  const risks: MainRisk[] = [];

  if (args.examLevelLow) {
    risks.push({
      type: "exam_level_low",
      label: "過去問レベル問題の正答率が伸びていません",
      detail: `直近の正答率は約${args.examLevelAccuracy}%。本番形式の問題に慣れる時間をとりましょう。`,
    });
  }

  if (args.weakTopicCount > 0) {
    risks.push({
      type: "weak_topics_remaining",
      label: "苦手トピックが残っています",
      detail: "つまずいたトピックは解説に戻ってから解き直すと定着します。",
      count: args.weakTopicCount,
    });
  }

  if (
    args.examReadyRate < RISK_THRESHOLDS.examReadyShortageRate &&
    (args.directPeriod ||
      args.basicUnderstandingRate >= RISK_THRESHOLDS.examReadyShortageMinBasic)
  ) {
    risks.push({
      type: "exam_ready_shortage",
      label: "本番対応OKのトピックが不足しています",
      detail: "基礎はできてきています。過去問レベル問題で仕上げていきましょう。",
    });
  }

  if (args.termsBacklogCount >= RISK_THRESHOLDS.termsBacklogCount) {
    risks.push({
      type: "terms_review_backlog",
      label: "単語の復習がたまっています",
      detail: "復習の期限が来た用語を先に片付けると効率的です。",
      count: args.termsBacklogCount,
    });
  }

  if (args.dailyLow) {
    risks.push({
      type: "daily_progress_low",
      label: "ここ数日の学習が滞りぎみです",
      detail: "1日1テーマだけでも触れると、リズムが戻りやすくなります。",
    });
  }

  if (
    args.fieldBalanceScore < RISK_THRESHOLDS.fieldImbalance &&
    args.basicUnderstoodTopicCount > 0
  ) {
    risks.push({
      type: "field_imbalance",
      label: "分野に偏りがあります",
      detail: "手薄な分野を少しずつ足すと、合格ラインを越えやすくなります。",
    });
  }

  return risks;
}

/** 総合ステータス＋推奨配分から初心者向けのメッセージを組み立てる。 */
function buildMessage(
  status: OverallStatus,
  focus: RecommendedFocus,
): string {
  const hint = focusHintMessage(focus);
  const head = overallStatusLabel(status);
  switch (status) {
    case "on_track":
      return `${head}。${hint}この調子で進めましょう。`;
    case "slightly_delayed":
      return `${head}。${hint}少しペースを上げれば十分に取り戻せます。`;
    case "delayed":
      return `${head}。まずは${hint}できるところから立て直していきましょう。`;
    case "recovery_needed":
      return `${head}。無理せず、${hint}苦手を1つずつ潰すのが近道です。`;
    case "consultation_needed":
      return `${head}。試験が近い一方で本番対応が不足しています。${hint}優先度の高い分野にしぼりましょう。`;
  }
}

/**
 * 統合進捗判定を計算する。
 *
 * readiness_score は各指標（0〜100）の加重平均:
 *   score = Σ( weight_i / 100 × rate_i )
 *   - 通常期の重み: input 10 / basic 30 / terms 25 / exam 25 / balance 10
 *   - 直前期の重み: input  5 / basic 20 / terms 25 / exam 40 / balance 10
 *   - 直前期の条件: 試験14日以内、または exam_ready が1件以上ある。
 */
export function computeIntegratedStatus(
  inputs: IntegratedStatusInputs,
): IntegratedLearningStatus {
  const understood = new Set<TopicStage>(UNDERSTOOD_STAGES);
  const titleById = new Map(inputs.topics.map((t) => [t.id, t.title]));

  // --- トピックステージの集計 ---
  const understoodTopicIds = new Set<string>();
  let basicUnderstoodTopicCount = 0;
  let examReadyTopicCount = 0;
  let reviewNeededTopicCount = 0;
  let weakTopicCount = 0;
  const weakEntries: WeakTopic[] = [];
  const reviewEntries: WeakTopic[] = [];

  for (const tp of inputs.topicProgress) {
    if (understood.has(tp.stage)) {
      basicUnderstoodTopicCount += 1;
      understoodTopicIds.add(tp.topicId);
    }
    if (tp.stage === "exam_ready") examReadyTopicCount += 1;
    else if (tp.stage === "review_needed") {
      reviewNeededTopicCount += 1;
      reviewEntries.push({
        topicId: tp.topicId,
        title: titleById.get(tp.topicId) ?? tp.topicId,
        stage: tp.stage,
      });
    } else if (tp.stage === "weak") {
      weakTopicCount += 1;
      weakEntries.push({
        topicId: tp.topicId,
        title: titleById.get(tp.topicId) ?? tp.topicId,
        stage: tp.stage,
      });
    }
  }

  const totalTopics = inputs.topics.length;

  // --- 各指標（0〜100） ---
  const basicUnderstandingRate = pct(basicUnderstoodTopicCount, totalTopics);
  const examReadyRate = pct(examReadyTopicCount, totalTopics);

  const masteredWords = inputs.wordProgress.filter(
    (w) => w.status === "mastered",
  ).length;
  const flashcardMasteryRate = pct(masteredWords, inputs.totalWordCount);

  const reportRates = inputs.recentReports
    .map((r) => r.estimatedCompletionRate)
    .filter((r): r is number => typeof r === "number");
  const inputProgressRate = Math.round(average(reportRates));

  const fieldBalanceScore = computeFieldBalance(
    inputs.topics,
    understoodTopicIds,
  );

  // --- 直前期判定と readiness ---
  const directPeriod =
    (inputs.daysUntilExam != null &&
      inputs.daysUntilExam <= DIRECT_PERIOD_DAYS) ||
    examReadyTopicCount >= 1;

  const weights: ReadinessWeights = directPeriod
    ? READINESS_WEIGHTS_DIRECT
    : READINESS_WEIGHTS_NORMAL;

  const readinessScore = Math.round(
    (weights.input * inputProgressRate +
      weights.basic * basicUnderstandingRate +
      weights.terms * flashcardMasteryRate +
      weights.exam * examReadyRate +
      weights.balance * fieldBalanceScore) /
      100,
  );

  // --- リスク素材 ---
  const examLevelAccuracy = computeExamLevelAccuracy(inputs.examLevelAttempts);
  const examLevelLow =
    inputs.examLevelAttempts.length >= STATUS_THRESHOLDS.examLevelMinAttempts &&
    examLevelAccuracy != null &&
    examLevelAccuracy < STATUS_THRESHOLDS.examLevelLowAccuracy;

  const nowMs = inputs.now.getTime();
  const termsBacklogCount = inputs.wordProgress.filter((w) => {
    if (w.status === "mastered" || !w.nextReviewAt) return false;
    const due = new Date(w.nextReviewAt).getTime();
    return Number.isFinite(due) && due <= nowMs;
  }).length;

  const dailyLow =
    reportRates.length > 0 && inputProgressRate < RISK_THRESHOLDS.dailyLowRate;

  // --- 総合ステータス・推奨配分・リスク・メッセージ ---
  const overallStatus = decideOverallStatus({
    readinessScore,
    daysUntilExam: inputs.daysUntilExam,
    examReadyRate,
    examLevelLow,
    weakTopicCount,
    reviewNeededTopicCount,
  });

  const recommendedFocus = decideRecommendedFocus({
    directPeriod,
    basicUnderstandingRate,
    flashcardMasteryRate,
    examReadyRate,
  });

  const mainRisks = collectMainRisks({
    examLevelLow,
    examLevelAccuracy,
    weakTopicCount,
    examReadyRate,
    basicUnderstandingRate,
    directPeriod,
    termsBacklogCount,
    dailyLow,
    inputProgressRate,
    fieldBalanceScore,
    basicUnderstoodTopicCount,
  });

  const weakTopics = [...weakEntries, ...reviewEntries].slice(0, 6);
  const generatedMessage = buildMessage(overallStatus, recommendedFocus);

  return {
    statusDate: inputs.statusDate,
    overallStatus,
    readinessScore,
    inputProgressRate,
    basicUnderstandingRate,
    flashcardMasteryRate,
    examReadyRate,
    fieldBalanceScore,
    weakTopicCount,
    examReadyTopicCount,
    basicUnderstoodTopicCount,
    reviewNeededTopicCount,
    weakTopics,
    mainRisks,
    recommendedFocus,
    generatedMessage,
  };
}
