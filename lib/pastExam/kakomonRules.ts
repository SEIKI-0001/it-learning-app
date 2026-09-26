// 公式過去問の進行に関わる閾値（Single Source of Truth）。
//
// 同じ値を次の3か所が参照する。ここ以外に数値を書かないこと。
//   - lib/studyPlanner の buildKakomonStages()（分野別 → 混合への切り替え）
//   - lib/badges の CP5 必須バッジ「3分野実戦」（b-cp5-kakomon-ready）
//   - lib/checkpointDetail の CP 詳細表示（バッジ条件文・残り表示）
// 実績の集計は lib/pastExam/officialHistory の summarizeOfficialHistory() を使う。

/** 分野別演習を「ひと通り終えた」とみなす、1分野あたりの公式過去問の回答数（重複なし）。 */
export const KAKOMON_FIELD_DRILL_TARGET = 15;
