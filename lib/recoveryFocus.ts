// 立て直し提案（第4弾）で採用した案を、Today のメニューへ効かせる（純関数）。
//
// 採用すると、提案の元にした統合進捗の弱点トピックを、採用から RECOVERY_FOCUS_DAYS 日の間
// 今日のキューの上位に出す（期限切れの復習の次）。試験日を遅らせる案は試験日の変更が前提で、
// メニューの中身は変えないので対象外。

import type { PlanAdjustmentProposal } from "@/types/planAdjustment";
import { OPTION_ID } from "@/types/planAdjustment";

export const RECOVERY_FOCUS_DAYS = 7;
/** 期限切れの復習（600）の次、総まとめ試験の誤答（500+）より先。 */
export const RECOVERY_FOCUS_PRIORITY = 550;
export const RECOVERY_FOCUS_REASON = "立て直しプランで選んだ弱点";

/** 採用済みで、採用から一定期間内の提案か。 */
export function isRecoveryFocusActive(
  proposal: Pick<PlanAdjustmentProposal, "status" | "selectedOptionId" | "acceptedAt"> | null,
  now: Date = new Date(),
): boolean {
  if (!proposal || proposal.status !== "accepted" || !proposal.acceptedAt) return false;
  if (proposal.selectedOptionId === OPTION_ID.postponeExam) return false;
  const acceptedAt = new Date(proposal.acceptedAt).getTime();
  if (Number.isNaN(acceptedAt)) return false;
  const elapsed = now.getTime() - acceptedAt;
  return elapsed >= 0 && elapsed < RECOVERY_FOCUS_DAYS * 86_400_000;
}
