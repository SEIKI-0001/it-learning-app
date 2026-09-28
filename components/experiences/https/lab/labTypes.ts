import type { FlowStep } from "../../HttpsExperience";
import type { HttpsMode } from "../HttpsScene";

// 図解ラボ（/dev/scene-lab）で、各表示パターンに同じ内容を渡すための props。
// 中身（ステップ・文言・暗号文）は HttpsExperience と共通で、描き方だけを差し替える。

export type LabSceneProps = {
  mode: HttpsMode;
  index: number;
  step: FlowStep;
  /** 入力した送信内容（空なら「（空）」） */
  plain: string;
  /** 見た目用の暗号文（scramble 済み） */
  cipher: string;
  /** 前へ進んだ直後か（戻るときは移動アニメを省く） */
  forward: boolean;
  reducedMotion: boolean;
};

/** current=現行の2.5D、a=3Dジオラマ、b=画面で追う、c=ハガキと封筒 */
export const LAB_VARIANTS = ["current", "a", "b", "c"] as const;
export type LabVariant = (typeof LAB_VARIANTS)[number];
