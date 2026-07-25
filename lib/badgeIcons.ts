// バッジ・チェックポイントの表示アイコン。
// lib/badges.ts / lib/checkpoints.ts の emoji フィールドはデータとして残しつつ、
// 画面では絵文字を使わず線画アイコンに統一する(lib/themeIcons.ts と同じ方針)。

import type { IconName } from "@/components/ui/Icon";

const BADGE_ICONS: Record<string, IconName> = {
  // CP1 全体像把握
  "b-cp1-touch-tech": "cpu",
  "b-cp1-touch-mgmt": "list",
  "b-cp1-touch-strat": "chart",
  "b-cp1-final": "map",
  // CP2 基礎理解
  "b-cp2-basics-tech": "tool",
  "b-cp2-basics-mgmt": "layers",
  "b-cp2-basics-strat": "building",
  "b-cp2-topics-15": "book-open",
  "b-cp2-topics-25": "library",
  "b-cp2-final": "circle-check",
  // CP3 確認問題定着
  "b-cp3-quiz-tech": "pen",
  "b-cp3-quiz-mgmt": "pen",
  "b-cp3-quiz-strat": "pen",
  "b-cp3-quiz-20": "target",
  "b-cp3-perfect-5": "star",
  "b-cp3-final": "circle-check",
  // CP4 弱点克服
  "b-cp4-review-light": "rotate",
  "b-cp4-weak-reduce": "life-buoy",
  "b-cp4-mastered-30": "shield",
  "b-cp4-revenge-zero": "star",
  "b-cp4-final": "check-double",
  // CP5 過去問準備
  "b-cp5-mastered-45": "settings",
  "b-cp5-fields-solid": "palette",
  "b-cp5-kakomon-ready": "puzzle",
  "b-cp5-word-50": "layers",
  "b-cp5-final": "target",
  // CP6 直前総仕上げ
  "b-cp6-mastered-60": "building",
  "b-cp6-review-clean": "rotate",
  "b-cp6-high-readiness": "flame",
  "b-cp6-word-100": "book-open",
  "b-cp6-perfect-20": "star",
  "b-cp6-final": "check-double",
  // 全踏破
  "b-all-clear": "award",
};

/** バッジIDに対応する線画アイコン。未定義のバッジは汎用の award を返す。 */
export function badgeIcon(badgeId: string): IconName {
  return BADGE_ICONS[badgeId] ?? "award";
}

const CHECKPOINT_ICONS: Record<string, IconName> = {
  cp0: "compass",
  cp1: "map",
  cp2: "book-open",
  cp3: "pen",
  cp4: "rotate",
  cp5: "target",
  cp6: "award",
};

/** チェックポイントIDに対応する線画アイコン。 */
export function checkpointIcon(checkpointId: string): IconName {
  return CHECKPOINT_ICONS[checkpointId] ?? "circle-dot";
}
