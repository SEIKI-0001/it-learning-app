"use client";

import { CompressStage, FormatStage, LossStage, MediaPractice, RatioStage, TermsStage } from "./multimedia/CompressionStages";

// ============================================================================
// 「マルチメディアとデータ圧縮」専用の体験。
//   ① 圧縮とは → ② 可逆／非可逆 → ③ 形式の使い分け → ④ 圧縮率 → ⑤ 画像・色・VR/AR/MR の用語 → ⑥ 確認5問
// ============================================================================

export default function MultimediaExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🎞️ 画像・音声・動画はデータがとても大きい。だから<b>圧縮</b>して小さくします。<b>元に戻せるか</b>で2種類に分かれ、用途で使い分けます。
      </div>

      <CompressStage />
      <LossStage />
      <FormatStage />
      <RatioStage />
      <TermsStage />
      <MediaPractice />
    </div>
  );
}
