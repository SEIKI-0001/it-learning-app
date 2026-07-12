// 課金プランの共有定数（クライアント・サーバー両方から import 可・秘密情報なし）。
// プラン判定や利用回数制限の数値・採点プロバイダの対応をここで一元管理する。

import type { GradeProviderId } from "@/lib/ai/gradingCore";

/** ユーザーの契約プラン。pro = サブスク契約中 or 買い切り有効期限内。 */
export type Plan = "free" | "pro";

/** 無料ユーザーが学習記録を保存できる期間（登録日からの日数）。 */
export const FREE_RECORDING_DAYS = 7;

/** 購入可能なプランのキー。one_* = 買い切り / sub_monthly = 月額サブスク。 */
export type BillingPlanKey = "one_1m" | "one_3m" | "one_6m" | "sub_monthly";

export type BillingPlanDef = {
  key: BillingPlanKey;
  kind: "one_time" | "subscription";
  /** 買い切りの有効月数（サブスクは 1 ヶ月ごとの自動更新）。 */
  months: number;
  /** 表示用の合計金額（円）。サブスクは月額。 */
  totalJpy: number;
  /** 表示用の月あたり金額（円）。 */
  perMonthJpy: number;
  /** Stripe Price ID を保持する環境変数名（サーバー側でのみ参照）。 */
  priceEnv: string;
  label: string;
  /** カードに出す補足（お得訴求など）。 */
  note?: string;
};

/**
 * 購入可能なプラン一覧（表示順）。
 * サブスクの初月20%オフは Stripe クーポン（STRIPE_COUPON_FIRST_MONTH）で適用する。
 */
export const BILLING_PLANS: BillingPlanDef[] = [
  {
    key: "sub_monthly",
    kind: "subscription",
    months: 1,
    totalJpy: 980,
    perMonthJpy: 980,
    priceEnv: "STRIPE_PRICE_ID_PRO_SUB",
    label: "月額プラン",
    note: "初月20%オフ（¥784）・いつでも解約可",
  },
  {
    key: "one_1m",
    kind: "one_time",
    months: 1,
    totalJpy: 980,
    perMonthJpy: 980,
    priceEnv: "STRIPE_PRICE_ID_PRO_1M",
    label: "1ヶ月プラン（買い切り）",
  },
  {
    key: "one_3m",
    kind: "one_time",
    months: 3,
    totalJpy: 2340,
    perMonthJpy: 780,
    priceEnv: "STRIPE_PRICE_ID_PRO_3M",
    label: "3ヶ月プラン（買い切り）",
    note: "月あたり¥780",
  },
  {
    key: "one_6m",
    kind: "one_time",
    months: 6,
    totalJpy: 3480,
    perMonthJpy: 580,
    priceEnv: "STRIPE_PRICE_ID_PRO_6M",
    label: "6ヶ月プラン（買い切り）",
    note: "月あたり¥580・いちばんお得",
  },
];

export function getBillingPlan(key: string | null | undefined): BillingPlanDef | null {
  return BILLING_PLANS.find((p) => p.key === key) ?? null;
}

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
