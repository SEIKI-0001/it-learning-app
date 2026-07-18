"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type TouchEvent,
} from "react";

// テーマ専用「体験コンポーネント」で共通して使う小さなUI部品。

type Deck = { active: number; ids: string[]; register: (id: string) => void };
const DeckContext = createContext<Deck | null>(null);
const SWIPE_THRESHOLD = 56;

export function ExperienceSlideDeck({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const register = useCallback(
    (id: string) =>
      setIds((current) => (current.includes(id) ? current : [...current, id])),
    [],
  );
  const move = useCallback(
    (index: number) => setActive(Math.max(0, Math.min(index, ids.length - 1))),
    [ids.length],
  );
  const deck = useMemo(() => ({ active, ids, register }), [active, ids, register]);

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
    if (Math.abs(distance) >= SWIPE_THRESHOLD) {
      move(active + (distance < 0 ? 1 : -1));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(active - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(active + 1);
    }
  }

  return (
    <DeckContext.Provider value={deck}>
      <div
        data-testid="experience-slides-viewport"
        tabIndex={ids.length > 1 ? 0 : undefined}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="touch-pan-y rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <div className="space-y-5">{children}</div>
      </div>
      {ids.length > 1 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => move(active - 1)}
            disabled={active === 0}
            aria-label="前の解説へ"
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← 前へ
          </button>
          <div className="flex items-center gap-2" aria-label="解説の進み具合">
            <span aria-live="polite" className="text-xs font-extrabold text-gray-600">
              {active + 1} / {ids.length}
            </span>
            <div className="flex items-center gap-1" aria-label="解説を選ぶ">
              {ids.map((id, index) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => move(index)}
                  aria-label={`解説${index + 1}`}
                  aria-current={index === active ? "step" : undefined}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    index === active ? "bg-indigo-600" : "bg-gray-200 hover:bg-indigo-200"
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => move(active + 1)}
            disabled={active === ids.length - 1}
            aria-label="次の解説へ"
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            次へ →
          </button>
        </div>
      )}
    </DeckContext.Provider>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  const deck = useContext(DeckContext);
  const id = useId();
  useEffect(() => deck?.register(id), [deck, id]);
  const index = deck?.ids.indexOf(id) ?? -1;
  const visible = index < 0 || index === deck?.active;
  return (
    <section aria-hidden={!visible} inert={!visible} className={`rounded-2xl bg-white p-5 ring-1 ring-gray-200 ${visible ? "" : "pointer-events-none hidden"}`}>{children}</section>
  );
}

export function SectionTitle({
  step,
  emoji,
  children,
}: {
  step?: number;
  emoji?: string;
  children: ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-2.5 text-base font-extrabold text-gray-800">
      <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-indigo-100 font-mono text-sm text-indigo-700">
        {step ?? emoji}
      </span>
      {children}
    </h3>
  );
}

// 「次へ／戻る／最初から」のステップ操作バー。
export function StepNav({
  index,
  total,
  onPrev,
  onNext,
  onReset,
  doneLabel = "完成 🎉",
}: {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  doneLabel?: string;
}) {
  const atEnd = index >= total - 1;
  return (
    <div className="mt-3 flex items-center justify-between">
      <span className="text-xs text-gray-400">
        ステップ {Math.min(index, total - 1) + 1} / {total}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onReset}
          className="rounded-lg px-3 py-1.5 text-sm font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
          aria-label="最初から"
        >
          ↺
        </button>
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="rounded-lg px-3 py-1.5 text-sm font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95 disabled:opacity-40"
        >
          ← 戻る
        </button>
        <button
          onClick={onNext}
          disabled={atEnd}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-bold text-white active:scale-95 disabled:opacity-40"
        >
          {atEnd ? doneLabel : "次へ →"}
        </button>
      </div>
    </div>
  );
}
