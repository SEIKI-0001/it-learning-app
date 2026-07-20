"use client";

// 「その他」ページの課金・プラン管理セクション。
// - 現在のプラン（無料/Pro）と有効期限・無料記録期間の残り日数
// - 4プラン（買い切り3種＋月額サブスク）の購入/延長ボタン → Stripe Checkout
// - サブスク契約中はStripe Customer Portalで管理・解約
// - 購入履歴（billing_purchases）
// - checkout から戻ったとき（?checkout=success|cancel）の結果表示

import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { getUserId } from "@/lib/userSession";
import { useBillingStatus } from "@/lib/useBillingStatus";
import type { BillingPlanOffer } from "@/types/billing";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

function formatYen(v: number | null): string {
  if (v === null) return "";
  return `¥${v.toLocaleString("ja-JP")}`;
}

export default function BillingSection() {
  const { status, loading, refresh } = useBillingStatus();
  const [checkoutResult, setCheckoutResult] = useState<"success" | "cancel" | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mountedAt] = useState<number>(Date.now);

  // checkout から戻ってきたときの結果を URL から読む（表示後にURLを掃除する）。
  useEffect(() => {
    let resultTimer: number | undefined;
    let refreshTimer: number | undefined;
    const params = new URLSearchParams(window.location.search);
    const result = params.get("checkout");
    if (result === "success" || result === "cancel") {
      resultTimer = window.setTimeout(() => setCheckoutResult(result), 0);
      params.delete("checkout");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
      );
      if (result === "success") {
        // webhook の反映に少し時間がかかることがあるため、少し待ってから取り直す。
        refreshTimer = window.setTimeout(() => refresh(), 2500);
      }
    }
    return () => {
      if (resultTimer !== undefined) window.clearTimeout(resultTimer);
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
    };
    // refresh は毎レンダー再生成されるため依存に含めない（マウント時に一度だけ読む）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCheckout(plan: BillingPlanOffer) {
    if (busyPlan) return;
    setBusyPlan(plan.key);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getUserId(), plan: plan.key, returnTo: "/more" }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; url?: string; error?: string }
        | null;
      if (data?.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data?.error || "購入手続きを開始できませんでした。");
    } catch {
      setError("購入手続きを開始できませんでした。");
    } finally {
      setBusyPlan(null);
    }
  }

  async function openPortal() {
    if (portalBusy) return;
    setPortalBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getUserId() }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; url?: string; error?: string }
        | null;
      if (data?.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data?.error || "管理画面を開けませんでした。");
    } catch {
      setError("管理画面を開けませんでした。");
    } finally {
      setPortalBusy(false);
    }
  }

  const entitlements = status?.entitlements ?? null;
  const subscription = status?.subscription ?? null;
  const purchases = status?.purchases ?? [];
  const plans = status?.plans ?? [];
  const isPro = Boolean(entitlements?.isPro);
  const hasSubscription = Boolean(subscription);

  return (
    <section id="billing">
      <h2 className="mb-2 text-sm font-bold text-gray-700">プラン・お支払い</h2>
      <div className="overflow-hidden rounded-xl bg-white border border-gray-200">
        <div className="space-y-4 p-4">
          {checkoutResult === "success" && (
            <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
              ✅ ご購入ありがとうございます！反映まで数秒かかることがあります。
            </div>
          )}
          {checkoutResult === "cancel" && (
            <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
              購入手続きをキャンセルしました。
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          )}

          {/* 現在のプラン */}
          {loading ? (
            <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ) : (
            <div
              className={`rounded-xl px-4 py-3 ring-1 ${
                isPro ? "bg-brand-50 ring-brand-200" : "bg-gray-50 ring-gray-200"
              }`}
            >
              <p className="text-sm font-bold text-gray-800">
                {isPro ? "Proプラン" : "無料プラン"}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                {isPro && entitlements?.proSource === "subscription" && subscription ? (
                  subscription.cancelAtPeriodEnd ? (
                    <>
                      月額プラン（解約予定）：{formatDate(subscription.currentPeriodEnd)}
                      まで利用できます
                    </>
                  ) : (
                    <>
                      月額プラン：次回更新は {formatDate(subscription.currentPeriodEnd)} です
                    </>
                  )
                ) : isPro && entitlements?.proSource === "one_time" ? (
                  <>買い切りプラン：{formatDate(entitlements.proUntil)} まで有効です</>
                ) : isPro ? (
                  <>Proが有効です</>
                ) : entitlements?.canRecordStudy ? (
                  <>
                    学習記録の無料期間は残り{" "}
                    <span className="font-bold text-brand-600">
                      {entitlements.freeDaysLeft}日
                    </span>
                    （{formatDate(entitlements.freeRecordingUntil)}まで）です
                  </>
                ) : (
                  <>
                    無料の記録期間（7日間）が終了しました。学習は続けられますが、
                    結果は記録されません。
                  </>
                )}
              </p>
              {/* Proでも買い切り期限が近い/併存する場合の補足 */}
              {isPro &&
                entitlements?.proSource === "subscription" &&
                entitlements?.proUntil &&
                new Date(entitlements.proUntil).getTime() > mountedAt && (
                  <p className="mt-1 text-[11px] text-gray-500">
                    買い切り分は {formatDate(entitlements.proUntil)} まで有効です
                  </p>
                )}
            </div>
          )}

          {/* Pro特典の説明 */}
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600 ring-1 ring-gray-200">
            <p className="font-bold text-gray-700">Proでできること</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>学習記録が無期限（無料は登録から7日間のみ）</li>
              <li>AI採点がClaude Sonnetの高精度採点に（1日10回まで）</li>
            </ul>
          </div>

          {/* プラン一覧 */}
          <div className="space-y-2">
            {plans.map((plan) => {
              const managesSubscription = plan.kind === "subscription" && hasSubscription;
              return (
                <div
                  key={plan.key}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 ring-1 ring-gray-200"
                >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-bold text-gray-800">{plan.label}</p>
                    {plan.kind === "subscription" && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                        初月20%オフ
                      </span>
                    )}
                    {plan.key === "one_6m" && (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-600">
                        いちばんお得
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {plan.kind === "subscription" ? (
                      <>月額 {formatYen(plan.totalJpy)}（初月 {formatYen(Math.round(plan.totalJpy * 0.8))}）</>
                    ) : (
                      <>
                        {formatYen(plan.totalJpy)}
                        {plan.months > 1 && <>（月あたり {formatYen(plan.perMonthJpy)}）</>}
                      </>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => (managesSubscription ? openPortal() : startCheckout(plan))}
                  disabled={
                    managesSubscription
                      ? portalBusy
                      : !plan.enabled || busyPlan !== null
                  }
                  className={buttonClass(
                    plan.kind === "subscription" ? "primary" : "secondary",
                    "sm",
                    "shrink-0",
                  )}
                >
                  {managesSubscription
                    ? portalBusy
                      ? "開いています…"
                      : "管理する"
                    : busyPlan === plan.key
                    ? "準備中…"
                    : !plan.enabled
                      ? "準備中"
                      : isPro && plan.kind === "one_time"
                        ? "延長する"
                        : "購入する"}
                </button>
                </div>
              );
            })}
          </div>

          {/* 管理・解約 */}
          {!hasSubscription && (
            <p className="text-[11px] leading-relaxed text-gray-400">
              買い切りプランに自動更新はありません（解約手続きは不要です）。期限が切れると
              自動的に無料プランへ戻ります。
            </p>
          )}

          {/* 購入履歴 */}
          {purchases.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-700">購入履歴</p>
              <ul className="mt-1.5 divide-y divide-gray-100 rounded-xl ring-1 ring-gray-200">
                {purchases.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs text-gray-600">
                      {formatDate(p.createdAt)}・
                      {p.kind === "subscription"
                        ? "月額プラン"
                        : `${p.months ?? "-"}ヶ月プラン（買い切り）`}
                    </span>
                    <span className="text-xs font-bold text-gray-700">
                      {formatYen(p.amountTotal)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
