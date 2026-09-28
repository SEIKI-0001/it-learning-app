"use client";

// 初回操作ガイド。/today の実画面の上で、大事な場所を順に照らして説明する（コーチマーク）。
// ?guide=1 のときだけ出す。台本は lib/firstRunGuide.ts。

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Mochit from "@/components/mochit/Mochit";
import {
  FIRST_RUN_GUIDE_PARAM,
  FIRST_RUN_GUIDE_STEPS,
  type FirstRunGuideStep,
} from "@/lib/firstRunGuide";

type Box = { top: number; left: number; width: number; height: number };

const EDGE = 16; // 画面端からの余白
const GAP = 12; // 照らす枠とカードの間
const PAD = 8; // 照らす枠の、要素からのはみ出し
const CARD_MAX_WIDTH = 340;

function findTarget(step: FirstRunGuideStep): HTMLElement | null {
  if (!step.target) return null;
  const el = document.querySelector<HTMLElement>(step.target);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 ? el : null;
}

function isFixed(el: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const position = getComputedStyle(node).position;
    if (position === "fixed" || position === "sticky") return true;
  }
  return false;
}

/** 照らす枠とカードの位置。下→上→右→左の順に収まる場所を探す。 */
function layout(target: DOMRect, cardHeight: number): { spot: Box; card: { top: number; left: number; width: number } } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_MAX_WIDTH, vw - EDGE * 2);
  let top = Math.max(target.top - PAD, 4);
  let bottom = Math.min(target.bottom + PAD, vh - 4);
  const left = Math.max(target.left - PAD, 4);
  const right = Math.min(target.right + PAD, vw - 4);
  const clampX = (x: number) => Math.min(Math.max(x, EDGE), vw - width - EDGE);
  const clampY = (y: number) => Math.min(Math.max(y, EDGE), vh - cardHeight - EDGE);
  const centerX = (left + right) / 2;
  const spot = () => ({ top, left, width: right - left, height: Math.max(bottom - top, 0) });

  if (bottom + GAP + cardHeight <= vh - EDGE) {
    return { spot: spot(), card: { top: bottom + GAP, left: clampX(centerX - width / 2), width } };
  }
  if (top - GAP - cardHeight >= EDGE) {
    return { spot: spot(), card: { top: top - GAP - cardHeight, left: clampX(centerX - width / 2), width } };
  }
  const centerY = (top + bottom) / 2;
  if (right + GAP + width <= vw - EDGE) {
    return { spot: spot(), card: { top: clampY(centerY - cardHeight / 2), left: right + GAP, width } };
  }
  if (left - GAP - width >= EDGE) {
    return { spot: spot(), card: { top: clampY(centerY - cardHeight / 2), left: left - GAP - width, width } };
  }
  // 縦に長い要素（スマホの「今日の順番」など）は、見えている上側だけを照らしてカードを下に置く。
  top = Math.max(top, EDGE);
  bottom = Math.max(top + 48, vh - EDGE - cardHeight - GAP);
  return { spot: spot(), card: { top: bottom + GAP, left: clampX(centerX - width / 2), width } };
}

export default function FirstRunGuide() {
  const router = useRouter();
  const pathname = usePathname();
  // /today は保存状態を読むまで LoadingScreen なので、このガイドは常にクライアントで初回描画される。
  // （useSearchParams はページ全体に Suspense 境界を要求するため使わない）
  const [open, setOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get(FIRST_RUN_GUIDE_PARAM) === "1",
  );
  const [index, setIndex] = useState(0);
  // 計測した照らす位置。どのステップのものかを持ち、前のステップの位置でちらつかせない。
  const [measured, setMeasured] = useState<{ stepId: string; rect: DOMRect } | null>(null);
  const [cardHeight, setCardHeight] = useState(180);
  const primaryRef = useRef<HTMLButtonElement>(null);
  // 要素が無いステップを飛ばす向き（「戻る」で飛ばすと先へ戻されないように）。
  const directionRef = useRef<1 | -1>(1);

  const close = useCallback(() => {
    setOpen(false);
    const params = new URLSearchParams(window.location.search);
    params.delete(FIRST_RUN_GUIDE_PARAM);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router]);

  const step = FIRST_RUN_GUIDE_STEPS[index];
  const isLast = index === FIRST_RUN_GUIDE_STEPS.length - 1;

  // 照らす要素へスクロールし、以後はスクロール・リサイズに追従する。
  // 要素が無い（モチット非表示など）ステップは飛ばす。
  useEffect(() => {
    if (!open || !step?.target) return;
    let frame = 0;
    let el: HTMLElement | null = null;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (el) setMeasured({ stepId: step.id, rect: el.getBoundingClientRect() });
      });
    };
    frame = requestAnimationFrame(() => {
      el = findTarget(step);
      if (!el) {
        if (directionRef.current === 1 && isLast) close();
        else setIndex((i) => Math.max(i + directionRef.current, 0));
        return;
      }
      if (!isFixed(el)) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const y = el.getBoundingClientRect().top + window.scrollY - 88;
        window.scrollTo({ top: Math.max(y, 0), behavior: reduce ? "auto" : "smooth" });
      }
      measure();
    });
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [close, isLast, open, step]);

  // カードの高さで置き場所が変わるので、実寸を追う。
  const observerRef = useRef<ResizeObserver | null>(null);
  const cardRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    const observer = new ResizeObserver(() => setCardHeight(node.offsetHeight));
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  useEffect(() => {
    if (open) primaryRef.current?.focus({ preventScroll: true });
  }, [index, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open]);

  if (!open || !step) return null;

  const next = () => {
    directionRef.current = 1;
    if (isLast) close();
    else setIndex((i) => i + 1);
  };
  const back = () => {
    directionRef.current = -1;
    setIndex((i) => Math.max(i - 1, 0));
  };
  const targetRect = measured?.stepId === step.id ? measured.rect : null;
  const placed = step.target && targetRect ? layout(targetRect, cardHeight) : null;
  // 照らす要素の計測前は何も出さない（前のステップの位置でちらつかせない）。
  if (step.target && !placed) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="first-run-guide-title">
      {/* 背面の操作を止める幕。照らす穴は box-shadow で抜く */}
      <div className="absolute inset-0" aria-hidden />
      {placed ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-xl ring-2 ring-white/90 transition-all duration-300 motion-reduce:transition-none"
          style={{ ...placed.spot, boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.62)" }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0" style={{ background: "rgba(15, 23, 42, 0.62)" }} />
      )}

      <div
        ref={cardRef}
        className={`fixed rounded-2xl bg-white p-4 text-gray-900 shadow-2xl transition-all duration-300 motion-reduce:transition-none ${
          placed ? "" : "left-1/2 top-1/2 w-[min(340px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 text-center"
        }`}
        style={placed ? placed.card : undefined}
      >
        {!placed && (
          <div className="mb-2 flex justify-center" aria-hidden>
            <Mochit size="medium" animation="idle" className="justify-center" />
          </div>
        )}
        <p className="text-[11px] font-semibold text-brand-600">
          使い方ガイド <span className="font-mono">{index + 1}</span> / {FIRST_RUN_GUIDE_STEPS.length}
        </p>
        <h2 id="first-run-guide-title" className="mt-1 text-base font-bold leading-snug">
          {step.title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{step.body}</p>

        <div className={`mt-4 flex items-center gap-2 ${placed ? "" : "justify-center"}`}>
          {!isLast && (
            <button
              type="button"
              onClick={close}
              className="mr-auto rounded-lg px-2 py-2 text-xs font-medium text-gray-500 underline underline-offset-4 hover:text-gray-700"
            >
              スキップ
            </button>
          )}
          {index > 0 && (
            <button
              type="button"
              onClick={back}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              戻る
            </button>
          )}
          <button
            ref={primaryRef}
            type="button"
            onClick={next}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {index === 0 ? "はじめる" : isLast ? "学習を始める" : "次へ"}
          </button>
        </div>
      </div>
    </div>
  );
}
