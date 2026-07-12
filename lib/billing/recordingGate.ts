// 学習記録系 API のサーバー側ゲート（サーバー専用）。
// 無料ユーザーは登録から FREE_RECORDING_DAYS 日を過ぎると記録系の書き込みを拒否する。
// XP・ストリーク・端末間同期を担う /api/progress/save はゲートしない（機能差分は記録のみ）。

import { NextResponse } from "next/server";
import { getEntitlements } from "@/lib/billing/plan";

/** 学習記録を保存できるか。判定不能（匿名など）は true（書き込み側が no-op）。 */
export async function canRecordStudyForUser(userId: string | null): Promise<boolean> {
  const entitlements = await getEntitlements(userId);
  return entitlements.canRecordStudy;
}

/**
 * 記録不可のときに返す共通レスポンス。
 * クライアントは code === "recording_locked" で無料期間終了を判別できる。
 */
export function recordingLockedResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      code: "recording_locked",
      error:
        "無料の記録期間（7日間）が終了しました。学習記録を再開するにはProプランをご利用ください。",
    },
    { status: 403 },
  );
}
