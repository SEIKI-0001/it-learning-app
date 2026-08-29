// ゲームフルデザイン（docs/requirements/gameful-design-v2.md）の導出型。
//
// ここに置く型はすべて「保存しない導出データ」（要件書 §12）。
//   - TodayPrimaryAction … 既存の推奨キュー・CP ゲートから毎回組み立てる
//   - ActionImpact       … 学習前に「何が進むか」を説明する。予測スコアは持たない
// 学習評価（合格準備度・習熟度・初見判定）はこれらの型から一切変更しない。

/** `/today` の「今日の最優先」1件の種別。 */
export type TodayPrimaryKind = "final_exam" | "review" | "weak" | "new_topic";

/** 種別の表示ラベル（画面で「今やること」の性質を1語で示す）。 */
export const TODAY_PRIMARY_KIND_LABELS: Record<TodayPrimaryKind, string> = {
  final_exam: "突破試験",
  review: "復習",
  weak: "弱点",
  new_topic: "新規学習",
};

/**
 * `/today` のファーストビューに1件だけ出す最優先の学習。
 * 候補そのものは既存の推奨ロジックが決めたものだけを使い、ここでは
 * 「どれを Primary として強調するか」だけを決める（学習判定を変えない）。
 */
export type TodayPrimaryAction = {
  kind: TodayPrimaryKind;
  /** 突破試験のときは null。 */
  topicId: string | null;
  title: string;
  /** 所要時間。突破試験は根拠がないため null。 */
  estimatedMinutes: number | null;
  /** 突破試験の出題数。トピック学習では null。 */
  questionCount: number | null;
  /** 推奨理由。既存キュー・復習キューの文言をそのまま使う。 */
  reasonLabel: string;
  href: string;
  activity: "learn" | "review";
};

/** 学習を完了すると更新される対象の種類。 */
export type ActionImpactKind =
  | "review_queue"
  | "weak_remeasure"
  | "required_badge"
  | "checkpoint"
  | "evidence";

/**
 * 「この学習をすると何が進むか」の1件。
 * 表示できるのは確定している更新対象だけで、合格準備度の上昇予測は持たない
 * （要件書 GF-P0-002「合格準備度の具体的な上昇値は事前予測しない」）。
 */
export type ActionImpact = {
  kind: ActionImpactKind;
  label: string;
};

/** Primary CTA の直前に出せる効果の最大件数（要件書 GF-P0-002）。 */
export const ACTION_IMPACT_LIMIT = 3;
