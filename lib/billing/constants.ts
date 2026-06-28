// 課金プランの共有定数（クライアント・サーバー両方から import 可・秘密情報なし）。
// プラン判定や利用回数制限の数値・採点プロバイダの対応をここで一元管理する。

import type { GradeProviderId } from "@/lib/ai/gradingCore";

/** ユーザーの契約プラン。Stripe 連携前は DB の user_profiles.plan で擬似的に切り替える。 */
export type Plan = "free" | "pro";

/** プランごとの 1 日あたりの AI 採点回数の上限。 */
export const DAILY_LIMITS: Record<Plan, number> = {
  free: 3,
  pro: 10,
};

/** プランごとに使う採点プロバイダ（free=Gemini / pro=Claude）。 */
export const PLAN_PROVIDER: Record<Plan, GradeProviderId> = {
  free: "gemini",
  pro: "claude",
};

/** 画面表示用のプロバイダ名（ユーザー向けラベル）。 */
export const PROVIDER_LABEL: Record<GradeProviderId, string> = {
  gemini: "Gemini（通常採点）",
  claude: "Claude Sonnet（Pro採点）",
};
