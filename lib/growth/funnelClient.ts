"use client";

import { FUNNEL_VISITOR_KEY, type FirstRunStep, type FunnelEvent } from "@/lib/growth/funnel";
import { claimFirstRunStep } from "@/lib/growth/firstRunFunnel";

/**
 * 回遊イベントを /api/funnel へ 1 件送る（ブラウザ専用）。失敗しても何もしない。
 * 自動操作のブラウザ（navigator.webdriver）からは送らない。
 */
export function sendFunnelEvent(
  event: FunnelEvent,
  extra: Record<string, string | null> = {},
): void {
  if (typeof window === "undefined" || navigator.webdriver) return;
  const body = JSON.stringify({ event, path: location.pathname, visitorId: getVisitorId(), ...extra });
  try {
    if (navigator.sendBeacon?.("/api/funnel", new Blob([body], { type: "text/plain" }))) return;
  } catch {
    // sendBeacon が使えなければ fetch に回す。
  }
  // 計測で画面を止めない。fetch が使えない・Promise を返さない環境でも例外を外へ出さない。
  try {
    void Promise.resolve(fetch("/api/funnel", { method: "POST", body, keepalive: true })).catch(() => {});
  } catch {
    // 送れなければ諦める。
  }
}

/** 端末ごとの乱数 ID（ユニーク人数を数えるため）。保存できない環境では null。 */
export function getVisitorId(): string | null {
  try {
    let id = localStorage.getItem(FUNNEL_VISITOR_KEY);
    if (!id || !/^[a-z0-9]{8,32}$/.test(id)) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      localStorage.setItem(FUNNEL_VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function firstRunStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * 登録後の段階に着いたことを記録し、この端末で初めてなら送る（lib/growth/firstRunFunnel.ts）。
 * onboarding_view が計測の始まりで、それより前の段階は送らない。
 */
export function reachFirstRunStep(step: FirstRunStep): void {
  const store = firstRunStorage();
  if (store && claimFirstRunStep(store, step)) sendFunnelEvent(step);
}
