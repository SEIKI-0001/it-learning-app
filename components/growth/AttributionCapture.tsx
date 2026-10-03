"use client";

import { useEffect } from "react";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_SECONDS,
  buildAttributionCookieValue,
} from "@/lib/growth/attributionCookie";

/**
 * 初回訪問時の流入元（utm_* / ref / 外部 referrer のホスト名）を Cookie に保存する。
 * 既に Cookie があれば何もしない（最初の接点を残す）。招待リンク（?ref=）だけは上書きする。
 * 画面には何も描画しない。
 */
export default function AttributionCapture() {
  useEffect(() => {
    try {
      // 最初の接点を残すため既存 Cookie は上書きしない。
      // ただし招待（?ref=）付きで来たときは、明示的な招待を優先して上書きする。
      const hasCookie = document.cookie
        .split(";")
        .some((c) => c.trim().startsWith(`${ATTRIBUTION_COOKIE}=`));
      const hasRef = new URLSearchParams(window.location.search).has("ref");
      if (hasCookie && !hasRef) return;
      const value = buildAttributionCookieValue({
        search: window.location.search,
        pathname: window.location.pathname,
        referrer: document.referrer,
        currentHost: window.location.hostname,
        now: Date.now(),
      });
      if (!value) return;
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${ATTRIBUTION_COOKIE}=${value}; Max-Age=${ATTRIBUTION_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
    } catch {
      // Cookie が使えない環境では記録しない。
    }
  }, []);
  return null;
}
