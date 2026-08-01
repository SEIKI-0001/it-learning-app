// ============================================================================
// 実測難易度・品質異常の閾値。
// ----------------------------------------------------------------------------
// 閾値はこの1ファイルに集約する。集計ロジック（metrics.ts）にも
// スクリプト（analyze-quality.mjs）にも数値を書かない。
//
// 「なぜこの問題が too_hard になったのか」を後から追えることが最優先なので、
// すべての数値に根拠をコメントで残す。根拠を書けない閾値は足さないこと。
// ============================================================================

/**
 * 標本の十分さ（ユニークユーザー数で判定）。
 *
 * 回答数ではなくユーザー数で見るのは、1人が同じ問題を何度も解いた結果で
 * 「十分な標本が集まった」と誤認しないため。
 */
export const SAMPLE_THRESHOLDS = {
  /** これ未満は insufficient（難易度も品質も断定しない）。 */
  provisional: 30,
  /** これ以上で reliable。 */
  reliable: 100,
} as const;

/**
 * 初回正答率 → 推奨難易度（1〜5）。上から順に「以上」で判定する。
 *
 * ITパスポートの合格ラインが総合6割であることを踏まえ、
 * 正答率6割前後を中央（3）に置いている。
 */
export const DIFFICULTY_BANDS: { minCorrectRate: number; difficulty: 1 | 2 | 3 | 4 | 5 }[] = [
  { minCorrectRate: 0.9, difficulty: 1 },
  { minCorrectRate: 0.75, difficulty: 2 },
  { minCorrectRate: 0.55, difficulty: 3 },
  { minCorrectRate: 0.35, difficulty: 4 },
  { minCorrectRate: 0, difficulty: 5 },
];

export const ANOMALY_THRESHOLDS = {
  /** ほぼ全員が正解する。出題する価値が薄い。 */
  tooEasyCorrectRate: 0.95,
  /** 4択の当てずっぽう（0.25）と変わらない。問題文か選択肢に問題がある可能性。 */
  tooHardCorrectRate: 0.25,
  /** 誰も選ばない誤答。選択肢として機能していない。 */
  nonFunctioningDistractorRate: 0.02,
  /** 特定の誤答が正答より多く選ばれている。問題文が誤読を誘っている可能性。 */
  dominantWrongChoiceRate: 0.35,
  /** 読むだけでも足りない速さ。問題文を読まずに答えている、または内容が自明。 */
  unusuallyFastMedianSeconds: 5,
  /** 極端に時間がかかる。問題文が長すぎるか、選択肢の区別が付かない。 */
  unusuallySlowMedianSeconds: 180,
  /** 未回答のまま飛ばされる割合。 */
  highUnansweredRate: 0.15,
  /**
   * 作問時の推定難易度（1〜3）と実測（1〜5を1〜3へ丸めた値）の差。
   * 2段階ずれていたら、作問時の見立てが外れていると言ってよい。
   */
  estimateMismatchDistance: 2,
} as const;

/**
 * 異常フラグを立てるのに必要な最小の初回回答数。
 *
 * sample_status とは別に持つ。sample_status はユーザー数、こちらは回答数で、
 * 選択肢別の割合（1件で 100% になってしまう）を守るためのもの。
 */
export const ANOMALY_MIN_FIRST_ATTEMPTS = 20;
