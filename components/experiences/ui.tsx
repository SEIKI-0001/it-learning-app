import type { ReactNode } from "react";

// テーマ専用「体験コンポーネント」で共通して使う小さなUI部品。

export function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-gray-200">{children}</section>
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
