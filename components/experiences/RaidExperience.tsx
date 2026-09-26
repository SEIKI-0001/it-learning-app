"use client";

import { RaidCompareStage } from "./raid/RaidCompare";
import { ParityRaidStage, ParityStage, RaidBasicStage, RaidFormulaStage, RaidPractice } from "./raid/RaidStages";

// ============================================================================
// 「RAIDと実効容量」専用の体験。4台のディスクのマスを色分けし、容量の引き算を「見て」理解する。
//   ① RAID0/1 → ② パリティで戻せるわけ → ③ RAID5＝1台分 → ④ RAID6＝2台分 → ⑤ 4方式を並べて比較
//   → ⑥ 一般化 → ⑦ 確認4問
// ============================================================================

export default function RaidExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        RAIDは<b>複数のディスクを1つのように使う</b>仕組み。方式によって、<b>容量の一部を「故障に備える分」</b>に回します。何台分を回すのかを見ていきます。
      </div>

      <RaidBasicStage />
      <ParityStage />
      <ParityRaidStage mode="raid5" />
      <ParityRaidStage mode="raid6" />
      <RaidCompareStage step={5} />
      <RaidFormulaStage />
      <RaidPractice />
    </div>
  );
}
