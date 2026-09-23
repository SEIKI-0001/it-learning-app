"use client";

import type { ReactNode } from "react";

export const FOUR_WEIGHTS = [8, 4, 2, 1] as const;
export const EIGHT_WEIGHTS = [128, 64, 32, 16, 8, 4, 2, 1] as const;

export function valueOf(bits: boolean[], weights: readonly number[]) {
  return bits.reduce((total, isOn, index) => total + (isOn ? weights[index] : 0), 0);
}

/** n を weights の桁で表したランプの点き方 */
export function bitsOf(n: number, weights: readonly number[]) {
  let rest = n;
  return weights.map((w) => {
    if (rest >= w) {
      rest -= w;
      return true;
    }
    return false;
  });
}

export function LampButton({
  weight,
  isOn,
  onToggle,
  className = "",
  children,
}: {
  weight: number;
  isOn: boolean;
  onToggle: () => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${weight}のランプを${isOn ? "消す" : "つける"}`}
      className={`flex min-h-20 flex-col items-center justify-center rounded-xl border-2 px-1 transition active:scale-95 ${
        isOn ? "border-amber-400 bg-amber-100 text-amber-950 shadow-sm" : "border-slate-200 bg-slate-50 text-slate-500"
      } ${className}`}
    >
      <span className="font-mono text-sm font-bold">{weight}</span>
      <span aria-hidden className="mt-1 text-2xl leading-none">
        {isOn ? "💡" : "⚫"}
      </span>
      <span className="mt-1 text-[11px] font-bold">{isOn ? "ON" : "OFF"}</span>
      {children}
    </button>
  );
}

/** 表示専用のランプ列。weights=null のときは重みを出さない（まだ「なぜ8・4・2・1か」を見せる前） */
export function LampRow({
  bits,
  weights,
  highlight,
}: {
  bits: boolean[];
  weights: readonly (number | null)[];
  highlight?: (index: number) => boolean;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${bits.length}, minmax(0, 1fr))` }}>
      {bits.map((isOn, index) => (
        <div
          key={index}
          className={`flex min-h-16 flex-col items-center justify-center rounded-xl border-2 px-1 transition-colors ${
            isOn ? "border-amber-400 bg-amber-100 text-amber-950" : "border-slate-200 bg-slate-50 text-slate-400"
          } ${highlight?.(index) ? "ring-2 ring-brand-500 ring-offset-1" : ""}`}
        >
          <span className="font-mono text-sm font-bold">{weights[index] ?? " "}</span>
          <span aria-hidden className="mt-1 text-xl leading-none">
            {isOn ? "💡" : "⚫"}
          </span>
        </div>
      ))}
    </div>
  );
}
