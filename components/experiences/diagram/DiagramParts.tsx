"use client";

import type { ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// 図解中心の解説（組織形態・PMBOK・RACI など）で共通の小さな部品。
//   Lead      : 冒頭の導入（1〜2文）
//   Box       : 図の中の箱。tone で役割を色分けする（多色は使わず brand の濃淡＋意味色だけ）
//   Arrow     : 箱と箱の間の矢印。label で「何が流れるか」を書く
//   Seg       : 2〜4択の切り替え
//   PointsPanel : 最後の「試験ではここを見分ける」。覚える要点と、よくある取り違え

export function Lead({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
      {children}
    </div>
  );
}

export type Tone = "brand" | "soft" | "plain" | "ok" | "ng" | "warn" | "muted";

const BOX_TONE: Record<Tone, string> = {
  brand: "bg-brand-600 text-white ring-brand-600",
  soft: "bg-brand-50 text-brand-900 ring-brand-200",
  plain: "bg-white text-gray-800 ring-gray-300",
  ok: "bg-emerald-50 text-emerald-900 ring-emerald-300",
  ng: "bg-rose-50 text-rose-800 ring-rose-300",
  warn: "bg-amber-50 text-amber-900 ring-amber-300",
  muted: "bg-gray-50 text-gray-500 ring-gray-200",
};

export function Box({
  children,
  sub,
  tone = "plain",
  className = "",
  testId,
}: {
  children: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  className?: string;
  testId?: string;
}) {
  return (
    <div className={`rounded-lg px-2 py-1.5 text-center ring-1 ${BOX_TONE[tone]} ${className}`} data-testid={testId}>
      <div className="text-[13px] font-bold leading-snug">{children}</div>
      {sub && <div className={`mt-0.5 text-[11px] leading-snug ${tone === "brand" ? "text-white/85" : "opacity-80"}`}>{sub}</div>}
    </div>
  );
}

/** 縦（down）または横（right）の矢印。label は矢印の横／上に置く。 */
export function Arrow({
  dir = "down",
  label,
  tone = "gray",
}: {
  dir?: "down" | "right" | "up" | "both";
  label?: ReactNode;
  tone?: "gray" | "brand" | "emerald";
}) {
  const color = tone === "brand" ? "text-brand-500" : tone === "emerald" ? "text-emerald-500" : "text-gray-400";
  const glyph = dir === "down" ? "↓" : dir === "up" ? "↑" : dir === "both" ? "⇅" : "→";
  if (dir === "right") {
    return (
      <div className="flex flex-col items-center justify-center px-0.5" aria-hidden>
        {label && <span className="text-[10px] font-bold leading-none text-gray-500">{label}</span>}
        <span className={`text-base font-bold leading-none ${color}`}>{glyph}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-1.5 py-0.5" aria-hidden>
      <span className={`text-base font-bold leading-none ${color}`}>{glyph}</span>
      {label && <span className="text-[11px] font-bold text-gray-500">{label}</span>}
    </div>
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  testId,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  testId?: string;
}) {
  const cols = options.length === 4 ? "grid-cols-4" : options.length === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className={`grid ${cols} gap-1 rounded-xl bg-gray-100 p-1`} data-testid={testId} data-value={value}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-lg px-1 py-1.5 text-xs font-bold leading-tight transition active:scale-95 ${
            value === o.value ? "bg-brand-600 text-white" : "text-gray-600"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 小さな見出し（図の中の区切り） */
export function Caption({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`text-[11px] font-bold text-gray-500 ${className}`}>{children}</div>;
}

export function PointsPanel({
  step,
  points,
  traps,
}: {
  step: number;
  /** 覚える要点（1行ずつ） */
  points: ReactNode[];
  /** よくある取り違え：[誤解, 正しくは] */
  traps: [ReactNode, ReactNode][];
}) {
  return (
    <Panel>
      <SectionTitle step={step}>試験ではここを見分ける</SectionTitle>
      <ul className="mt-3 space-y-1.5" data-testid="points">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-gray-700">
            <span aria-hidden className="text-brand-500">
              ✓
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      {traps.length > 0 && (
        <div className="mt-4 space-y-2">
          <Caption>よくある取り違え</Caption>
          {traps.map(([wrong, right], i) => (
            <div key={i} className="rounded-xl bg-gray-50 px-3 py-2 text-[13px] leading-relaxed ring-1 ring-gray-200">
              <p className="text-rose-700">
                <span aria-hidden>✕ </span>
                <span className="sr-only">誤り：</span>
                {wrong}
              </p>
              <p className="mt-0.5 font-bold text-emerald-800">
                <span aria-hidden>○ </span>
                <span className="sr-only">正しくは：</span>
                {right}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
