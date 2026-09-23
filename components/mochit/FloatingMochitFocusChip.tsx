"use client";

// Floating Mochit の足元に出す小さな集中タイマー表示（FOCUS 18:42）。
// 毎秒の再描画はこの部品だけで起き、モチット本体（SVG・Micro Idle）は再描画しない。
// タップするとクイックメニュー（一時停止・終了など）を開く。

import { formatFocusRemaining, hasFocusBreakOffer, type FocusSessionState } from "./mochitFocusSession";
import { useFocusRemainingMs } from "./useMochitFocusSession";

type Props = {
  session: FocusSessionState;
  /** モチットの下に置けない（画面下端）ときは上に出す */
  placement: "below" | "above";
  onOpenMenu: () => void;
};

const LABELS = {
  focus: { tag: "FOCUS", name: "集中", dot: "bg-brand-500" },
  paused: { tag: "PAUSE", name: "一時停止中", dot: "bg-gray-400" },
  break: { tag: "BREAK", name: "休憩", dot: "bg-emerald-500" },
  done: { tag: "DONE", name: "集中おわり", dot: "bg-emerald-500" },
} as const;

export default function FloatingMochitFocusChip({ session, placement, onOpenMenu }: Props) {
  const remainingMs = useFocusRemainingMs(session);
  const offer = hasFocusBreakOffer(session);
  if (session.phase === "idle" && !offer) return null;

  const kind = session.phase === "idle" ? "done" : session.phase;
  const label = LABELS[kind];
  const time = kind === "done" ? null : formatFocusRemaining(remainingMs);
  const [minutes, seconds] = (time ?? "00:00").split(":").map(Number);
  const ariaLabel =
    kind === "done"
      ? "集中が終わりました。休憩するかをメニューで選べます"
      : `${label.name} 残り${minutes}分${seconds}秒。メニューを開く`;

  return (
    <button
      type="button"
      onClick={onOpenMenu}
      aria-label={ariaLabel}
      data-focus-chip={kind}
      className={`absolute left-1/2 z-10 inline-flex h-6 -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/95 px-2.5 font-mono text-[11px] font-semibold leading-none tracking-wide text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-white ${
        placement === "below" ? "top-[92px]" : "-top-5"
      }`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${label.dot}`} />
      <span aria-hidden>{label.tag}</span>
      {time ? (
        <span role="timer" aria-hidden className="tabular-nums">
          {time}
        </span>
      ) : null}
    </button>
  );
}
