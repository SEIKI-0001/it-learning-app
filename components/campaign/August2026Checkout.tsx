"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AUGUST_2026_CAMPAIGN } from "@/lib/campaign/august2026";
import { getUserId } from "@/lib/userSession";
import { useBillingStatus } from "@/lib/useBillingStatus";
import type { August2026CheckoutResult } from "@/lib/campaign/august2026";

type Props = {
  authenticated: boolean;
  bonusActive: boolean;
  checkoutEnabled: boolean;
  lineUrl: string;
  checkoutResult: August2026CheckoutResult | null;
  campaignPurchase: boolean;
};

export default function August2026Checkout(props: Props) {
  const { status, refresh } = useBillingStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPro = Boolean(status?.entitlements.isPro);

  useEffect(() => {
    if (props.checkoutResult !== "success") return;
    const timer = window.setTimeout(() => refresh(), 2500);
    return () => window.clearTimeout(timer);
    // refresh changes identity in the existing hook; run once for each return state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.checkoutResult]);

  async function startCheckout() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: getUserId(),
          plan: AUGUST_2026_CAMPAIGN.planKey,
          returnTo: AUGUST_2026_CAMPAIGN.path,
          campaign: props.bonusActive
            ? AUGUST_2026_CAMPAIGN.key
            : undefined,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok: boolean; url?: string; error?: string }
        | null;
      if (data?.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(
        data?.error ||
          "購入手続きを開始できませんでした。時間をおいて再度お試しください。",
      );
    } catch {
      setError(
        "購入手続きを開始できませんでした。時間をおいて再度お試しください。",
      );
    } finally {
      setBusy(false);
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(
    AUGUST_2026_CAMPAIGN.path,
  )}`;
  const bonusUnavailable = props.bonusActive && !props.lineUrl;
  const buttonLabel = props.bonusActive
    ? "3,480円で6か月始める"
    : "通常の6か月プランを購入する";

  return (
    <section
      id="purchase"
      className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200"
    >
      <p className="text-sm font-bold text-brand-700">3,480円（税込）</p>
      <p className="mt-1 text-sm text-slate-600">
        買い切り・6か月・自動更新なし
      </p>
      <p className="mt-3 text-xs leading-6 text-slate-600">
        購入日を含む7日以内、かつ20分相談の実施前は全額返金
      </p>
      {props.checkoutResult === "cancel" && (
        <p className="mt-4 rounded-xl bg-slate-100 p-3">
          購入手続きをキャンセルしました。課金とプラン変更は行われていません。
        </p>
      )}
      {props.checkoutResult === "success" && !isPro && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-amber-900">
          決済を確認中です。Stripeの決済完了後、通常は数分以内にProへ反映されます。
        </p>
      )}
      {props.checkoutResult === "success" && isPro && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-900">
          <p className="font-bold">Pro反映済み</p>
          {props.campaignPurchase && props.lineUrl ? (
            <a className="mt-2 inline-block underline" href={props.lineUrl}>
              LINEで相談特典を受け取る
            </a>
          ) : (
            <Link className="mt-2 inline-block underline" href="/more">
              プラン・購入履歴を確認する
            </Link>
          )}
        </div>
      )}
      {error && (
        <p className="mt-4 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}
      <div className="mt-5">
        {!props.authenticated ? (
          <Link href={loginHref}>ログインして3,480円で始める</Link>
        ) : bonusUnavailable ? (
          <button type="button" disabled>
            特典受付を準備中
          </button>
        ) : !props.checkoutEnabled ? (
          <button type="button" disabled>
            決済を準備中
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={startCheckout}>
            {busy ? "Stripeを開いています…" : buttonLabel}
          </button>
        )}
      </div>
      {!props.bonusActive && (
        <p className="mt-3 text-sm text-slate-600">
          相談特典の受付は終了しました。
        </p>
      )}
    </section>
  );
}
