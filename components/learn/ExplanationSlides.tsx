"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type TouchEvent,
} from "react";

export type ExplanationSlide = {
  id: string;
  label: string;
  content: ReactNode;
};

const SWIPE_THRESHOLD = 56;

export default function ExplanationSlides({
  slides,
  title = "📖 解説",
}: {
  slides: ExplanationSlide[];
  title?: string | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (slides.length === 0) return null;

  const lastIndex = slides.length - 1;
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < lastIndex;

  function moveTo(index: number) {
    setActiveIndex(Math.min(Math.max(index, 0), lastIndex));
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current =
      event.touches[0]?.clientX ?? event.changedTouches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (startX === null || endX === undefined) return;

    const distance = endX - startX;
    if (Math.abs(distance) < SWIPE_THRESHOLD) return;
    moveTo(activeIndex + (distance < 0 ? 1 : -1));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveTo(activeIndex - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveTo(activeIndex + 1);
    }
  }

  return (
    <section aria-label="解説" className="space-y-3">
      {title && (
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          {title}
        </h2>
      )}

      <div
        data-testid="explanation-slides-viewport"
        tabIndex={slides.length > 1 ? 0 : undefined}
        onKeyDown={handleKeyDown}
        className="touch-pan-y overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid">
          {slides.map((slide, index) => {
            const isActive = index === activeIndex;
            return (
              <article
                key={slide.id}
                role="group"
                aria-label={slide.label}
                aria-hidden={!isActive}
                inert={!isActive}
                className={`col-start-1 row-start-1 w-full transition duration-300 motion-reduce:transition-none ${
                  isActive
                    ? "relative z-10 translate-x-0 opacity-100"
                    : index < activeIndex
                      ? "pointer-events-none -translate-x-full opacity-0"
                      : "pointer-events-none translate-x-full opacity-0"
                }`}
              >
                {slide.content}
              </article>
            );
          })}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => moveTo(activeIndex - 1)}
            disabled={!canGoPrevious}
            aria-label="前の解説へ"
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:border-brand-200 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← 前へ
          </button>

          <div className="flex items-center gap-2" aria-label="解説の進み具合">
            <span aria-live="polite" className="text-xs font-bold text-gray-600">
              {activeIndex + 1} / {slides.length}
            </span>
            <div className="flex items-center gap-1" aria-label="解説を選ぶ">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => moveTo(index)}
                  aria-label={`解説${index + 1}`}
                  aria-current={index === activeIndex ? "step" : undefined}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    index === activeIndex ? "bg-brand-600" : "bg-gray-200 hover:bg-brand-200"
                  }`}
                >
                  <span className="sr-only">{slide.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => moveTo(activeIndex + 1)}
            disabled={!canGoNext}
            aria-label="次の解説へ"
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:border-brand-200 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            次へ →
          </button>
        </div>
      )}
    </section>
  );
}
