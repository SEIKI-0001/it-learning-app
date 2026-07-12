"use client";

// 課金ステータス（プラン・記録可否・購入プラン一覧）のクライアント側キャッシュ。
// SPA セッション内で /api/billing/status を一度だけ呼び、全画面で共有する
// （lib/userSession.ts の sessionRestorePromise と同じパターン）。

import { useEffect, useState } from "react";
import { getUserId } from "@/lib/userSession";
import type { BillingStatusPayload } from "@/types/billing";

let billingStatusPromise: Promise<BillingStatusPayload | null> | null = null;

async function fetchBillingStatus(): Promise<BillingStatusPayload | null> {
  try {
    const res = await fetch("/api/billing/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getUserId() }),
    });
    const data = (await res.json().catch(() => null)) as BillingStatusPayload | null;
    if (!data?.ok) return null;
    return data;
  } catch {
    return null;
  }
}

/** 課金ステータスをセッション中一度だけ取得する。 */
export function loadBillingStatusOnce(): Promise<BillingStatusPayload | null> {
  if (!billingStatusPromise) {
    billingStatusPromise = fetchBillingStatus();
  }
  return billingStatusPromise;
}

/** キャッシュを破棄する（購入完了直後など、最新状態を取り直したいとき）。 */
export function invalidateBillingStatus(): void {
  billingStatusPromise = null;
}

/**
 * 課金ステータスを返す hook。
 * status=null は「未取得 or 取得失敗」。取得失敗時に機能を誤ってロックしないよう、
 * 利用側は canRecordStudy の判定に entitlements が取れたときだけロックを出すこと。
 */
export function useBillingStatus(): {
  status: BillingStatusPayload | null;
  loading: boolean;
  refresh: () => void;
} {
  const [status, setStatus] = useState<BillingStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadBillingStatusOnce().then((s) => {
      if (!alive) return;
      setStatus(s);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const refresh = () => {
    invalidateBillingStatus();
    setLoading(true);
    loadBillingStatusOnce().then((s) => {
      setStatus(s);
      setLoading(false);
    });
  };

  return { status, loading, refresh };
}
