// 課金・エンタイトルメントの共有型定義。
// サーバー（lib/billing/plan.ts）とクライアント（lib/useBillingStatus.ts /
// components/billing/*）で共通利用する。

import type { BillingPlanKey } from "@/lib/billing/constants";

/** Pro判定と学習記録の可否（サーバーで算出しUIへ配る）。 */
export type BillingEntitlements = {
  isPro: boolean;
  /** pro の根拠。subscription = plan列（サブスク/手動付与）、one_time = pro_until。 */
  proSource: "subscription" | "one_time" | "none";
  /** 買い切りProの有効期限（ISO）。買い切り購入なしは null。 */
  proUntil: string | null;
  /** 登録日時（line_users.created_at、ISO）。匿名は null。 */
  registeredAt: string | null;
  /** 無料記録期間の終了日時（ISO）。Pro・匿名は null。 */
  freeRecordingUntil: string | null;
  /** 学習記録を保存できるか（Pro or 登録7日以内）。 */
  canRecordStudy: boolean;
  /** 無料記録期間の残り日数（切り上げ）。Pro・匿名は null。 */
  freeDaysLeft: number | null;
};

/** 購入可能なプラン1件（表示用・enabled はサーバーの env 設定状況）。 */
export type BillingPlanOffer = {
  key: BillingPlanKey;
  kind: "one_time" | "subscription";
  months: number;
  totalJpy: number;
  perMonthJpy: number;
  label: string;
  note?: string;
  enabled: boolean;
};

/** サブスク契約の表示用サマリ。契約なしは null。 */
export type BillingSubscriptionInfo = {
  status: string;
  /** 次回更新日（ISO）。 */
  currentPeriodEnd: string | null;
  /** 期間末で解約予約済みか。 */
  cancelAtPeriodEnd: boolean;
} | null;

/** 購入履歴1件（billing_purchases の表示用）。 */
export type BillingPurchaseRecord = {
  id: string;
  kind: "one_time" | "subscription";
  planKey: string;
  months: number | null;
  amountTotal: number | null;
  currency: string | null;
  createdAt: string;
};

/** /api/billing/status の拡張レスポンス。 */
export type BillingStatusPayload = {
  ok: true;
  plan: "free" | "pro";
  providerLabel: string;
  usage: { used: number; limit: number; remaining: number };
  tracked: boolean;
  checkoutEnabled: boolean;
  entitlements: BillingEntitlements;
  plans: BillingPlanOffer[];
  subscription: BillingSubscriptionInfo;
  purchases: BillingPurchaseRecord[];
};
