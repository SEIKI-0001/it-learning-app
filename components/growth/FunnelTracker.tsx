"use client";

import { useEffect } from "react";
import { FUNNEL_VISITOR_KEY, splitReferrer, xPostEntryPlacement, type FunnelEvent } from "@/lib/growth/funnel";

/**
 * 公開ページの回遊を /api/funnel へ送る（lib/growth/funnel.ts）。画面には何も描画しない。
 * - 表示時に view を 1 件
 * - 自サイト内リンクのクリック（data-funnel があれば置き場所も）
 * - data-funnel-open を付けた <details> を開いたとき answer_open
 * ページ本体はサーバーコンポーネントのまま保てるよう、document への委譲で拾う。
 */
/** 同じ表示で view を二重に送らない（開発時の StrictMode は effect を2回走らせる）。 */
let lastViewKey: string | null = null;

export default function FunnelTracker() {
  useEffect(() => {
    if (navigator.webdriver) return;
    const visitorId = getVisitorId();

    const send = (event: FunnelEvent, extra: Record<string, string | null> = {}) => {
      const body = JSON.stringify({ event, path: location.pathname, visitorId, ...extra });
      try {
        if (navigator.sendBeacon?.("/api/funnel", new Blob([body], { type: "text/plain" }))) return;
      } catch {
        // sendBeacon が使えなければ fetch に回す。
      }
      void fetch("/api/funnel", { method: "POST", body, keepalive: true }).catch(() => {});
    };

    const viewKey = `${location.pathname}@${performance.timeOrigin}`;
    if (lastViewKey !== viewKey) {
      lastViewKey = viewKey;
      send("view", { ...splitReferrer(document.referrer, location.hostname), placement: xPostEntryPlacement(location.search) });
    }

    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      let url: URL;
      try {
        url = new URL(a.href);
      } catch {
        return;
      }
      if (url.origin !== location.origin) return;
      send("click", { targetPath: url.pathname, placement: a.dataset.funnel ?? null });
    };

    // toggle はバブリングしないので capture で拾う。
    const onToggle = (e: Event) => {
      const el = e.target;
      if (el instanceof HTMLDetailsElement && el.open && el.hasAttribute("data-funnel-open")) {
        send("answer_open", { placement: el.dataset.funnelOpen || null });
      }
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("toggle", onToggle, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("toggle", onToggle, true);
    };
  }, []);
  return null;
}

/** 端末ごとの乱数 ID（ユニーク人数を数えるため）。保存できない環境では null。 */
function getVisitorId(): string | null {
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
