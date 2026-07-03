"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const STORAGE_KEY = "it-learning-app:scroll-positions";
const MAX_POSITIONS = 80;
const RESTORE_DELAY_MS = 120;
const NAVIGATION_BLOCK_MS = 1000;
const SCROLL_SAVE_INTERVAL_MS = 200;

type ScrollPosition = {
  x: number;
  y: number;
};

type ScrollPositionMap = Record<string, ScrollPosition>;

function getRouteKey(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}

function readPositions(): ScrollPositionMap {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as ScrollPositionMap;
  } catch {
    return {};
  }
}

function writePositions(positions: ScrollPositionMap) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Ignore storage failures, for example private browsing quota limits.
  }
}

function savePosition(routeKey: string) {
  const positions = readPositions();

  delete positions[routeKey];
  positions[routeKey] = {
    x: window.scrollX,
    y: window.scrollY,
  };

  const entries = Object.entries(positions);
  writePositions(Object.fromEntries(entries.slice(-MAX_POSITIONS)));
}

function readPosition(routeKey: string) {
  const position = readPositions()[routeKey];
  if (!position) return null;

  return {
    x: Number.isFinite(position.x) ? position.x : 0,
    y: Number.isFinite(position.y) ? position.y : 0,
  };
}

export default function ScrollRestoration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const routeKey = useMemo(() => getRouteKey(pathname, search), [pathname, search]);
  const routeKeyRef = useRef(routeKey);
  const blockedSaveKeyRef = useRef<string | null>(null);
  const restoringKeyRef = useRef<string | null>(null);
  const blockTimerRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!("scrollRestoration" in window.history)) return;

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    routeKeyRef.current = routeKey;
    blockedSaveKeyRef.current = null;
    restoringKeyRef.current = null;

    const position = readPosition(routeKey);
    if (!position) return;

    restoringKeyRef.current = routeKey;

    const restore = () => {
      window.scrollTo(position.x, position.y);
    };

    const frameId = window.requestAnimationFrame(restore);
    const delayId = window.setTimeout(() => {
      restore();
      if (restoringKeyRef.current === routeKey) {
        restoringKeyRef.current = null;
      }
    }, RESTORE_DELAY_MS);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(delayId);
      if (restoringKeyRef.current === routeKey) {
        restoringKeyRef.current = null;
      }
    };
  }, [routeKey]);

  useLayoutEffect(() => {
    let frameId: number | null = null;
    let lastScrollSaveAt = 0;

    const shouldSkipSave = () => {
      const currentKey = routeKeyRef.current;
      return (
        blockedSaveKeyRef.current === currentKey ||
        restoringKeyRef.current === currentKey
      );
    };

    const saveNow = () => {
      if (shouldSkipSave()) return;
      savePosition(routeKeyRef.current);
    };

    const saveOnScroll = () => {
      if (frameId !== null) return;

      const now = window.performance.now();
      if (now - lastScrollSaveAt < SCROLL_SAVE_INTERVAL_MS) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        lastScrollSaveAt = window.performance.now();
        saveNow();
      });
    };

    const blockCurrentRouteSave = () => {
      const currentKey = routeKeyRef.current;
      blockedSaveKeyRef.current = currentKey;

      if (blockTimerRef.current !== null) {
        window.clearTimeout(blockTimerRef.current);
      }

      blockTimerRef.current = window.setTimeout(() => {
        if (blockedSaveKeyRef.current === currentKey) {
          blockedSaveKeyRef.current = null;
        }
      }, NAVIGATION_BLOCK_MS);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const nextUrl = new URL(anchor.href);
      if (nextUrl.origin !== window.location.origin) return;

      const nextKey = getRouteKey(nextUrl.pathname, nextUrl.search.slice(1));
      savePosition(routeKeyRef.current);

      if (nextKey !== routeKeyRef.current) {
        blockCurrentRouteSave();
      }
    };

    const handlePopState = () => {
      savePosition(routeKeyRef.current);
      blockCurrentRouteSave();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveNow();
      }
    };

    window.addEventListener("scroll", saveOnScroll, { passive: true });
    window.addEventListener("pagehide", saveNow);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("click", handleClick, true);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      if (blockTimerRef.current !== null) {
        window.clearTimeout(blockTimerRef.current);
      }

      window.removeEventListener("scroll", saveOnScroll);
      window.removeEventListener("pagehide", saveNow);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
