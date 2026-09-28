import type { HttpsSceneInput } from "../httpsFlow";

// 図解ラボ（/dev/scene-lab）で、各表示パターンに同じ内容を渡すための props。
// 中身（ステップ・文言・暗号文）は HttpsExperience と共通で、描き方だけを差し替える。

export type LabSceneProps = HttpsSceneInput;

/**
 * current=現行の2.5D、a=3Dジオラマ、b=画面で追う、c=ハガキと封筒、
 * d=2.5Dのアップグレード（カフェ）、e=3Dカフェ、f=3Dカフェ＋画面の拡大
 */
export const LAB_VARIANTS = ["current", "a", "b", "c", "d", "e", "f"] as const;
export type LabVariant = (typeof LAB_VARIANTS)[number];
