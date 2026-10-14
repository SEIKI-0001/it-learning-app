"use client";

import { useEffect } from "react";
import { FUNNEL_EVENTS, splitReferrer, xPostEntryPlacement } from "@/lib/growth/funnel";
import { sendFunnelEvent } from "@/lib/growth/funnelClient";

/**
 * 公開ページの回遊を /api/funnel へ送る（lib/growth/funnel.ts）。画面には何も描画しない。
 * - 表示時に view を 1 件
 * - 自サイト内リンクのクリック（data-funnel があれば置き場所も）
 * - data-funnel-event を付けた要素（外部リンクやボタン）のクリックは、そのイベント名で送る
 * - data-funnel-open を付けた <details> を開いたとき answer_open
 * ページ本体はサーバーコンポーネントのまま保てるよう、document への委譲で拾う。
 */
/** 同じ表示で view を二重に送らない（開発時の StrictMode は effect を2回走らせる）。 */
let lastViewKey: string | null = null;

export default function FunnelTracker() {
  useEffect(() => {
    if (navigator.webdriver) return;

    const viewKey = `${location.pathname}@${performance.timeOrigin}`;
    if (lastViewKey !== viewKey) {
      lastViewKey = viewKey;
      sendFunnelEvent("view", {
        ...splitReferrer(document.referrer, location.hostname),
        placement: xPostEntryPlacement(location.search),
      });
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const marked = target?.closest?.("[data-funnel-event]");
      if (marked instanceof HTMLElement) {
        const event = FUNNEL_EVENTS.find((name) => name === marked.dataset.funnelEvent);
        if (event) {
          sendFunnelEvent(event, { placement: marked.dataset.funnel ?? null });
          return;
        }
      }
      const a = target?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      let url: URL;
      try {
        url = new URL(a.href);
      } catch {
        return;
      }
      if (url.origin !== location.origin) return;
      sendFunnelEvent("click", { targetPath: url.pathname, placement: a.dataset.funnel ?? null });
    };

    // toggle はバブリングしないので capture で拾う。
    const onToggle = (e: Event) => {
      const el = e.target;
      if (el instanceof HTMLDetailsElement && el.open && el.hasAttribute("data-funnel-open")) {
        sendFunnelEvent("answer_open", { placement: el.dataset.funnelOpen || null });
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
