"use client";

// クイックメニュー内の「もちっとと集中する」操作（開始 / 一時停止・再開 / 終了 / 休憩）。
// 操作は mochitFocusSessionStore へ渡すだけで、Activity（studying / resting）への反映は
// FloatingMochit がセッション状態から導く。

import Icon from "@/components/ui/Icon";
import {
  formatFocusRemaining,
  hasFocusBreakOffer,
  type FocusSessionState,
} from "./mochitFocusSession";
import {
  dismissMochitBreakOffer,
  endMochitFocus,
  pauseMochitFocus,
  resumeMochitFocus,
  startMochitBreak,
  startMochitFocus,
} from "./mochitFocusSessionStore";
import { useFocusRemainingMs } from "./useMochitFocusSession";

type Props = {
  session: FocusSessionState;
  displayName: string;
  /** 操作したらメニューを閉じる（モチットの姿勢の変化が見えるように） */
  onDone: () => void;
};

const minutesOf = (ms: number) => Math.round(ms / 60_000);

const secondaryClass =
  "inline-flex min-h-9 flex-1 items-center justify-center rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50 active:bg-gray-100";
const primaryClass =
  "inline-flex min-h-9 flex-1 items-center justify-center rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-black";

export default function FloatingMochitFocusControls({ session, displayName, onDone }: Props) {
  const remainingMs = useFocusRemainingMs(session);
  const run = (action: () => void) => () => {
    action();
    onDone();
  };
  const focusMinutes = minutesOf(session.config.focusMs);
  const breakMinutes = minutesOf(session.config.breakMs);

  if (session.phase === "idle" && !hasFocusBreakOffer(session)) {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={run(startMochitFocus)}
        className="mb-2 flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50 active:bg-gray-100"
      >
        <Icon name="clock" className="h-5 w-5 text-brand-600" aria-hidden />
        {displayName}と集中する
        <span className="ml-auto font-mono text-xs text-gray-500">{focusMinutes}分</span>
      </button>
    );
  }

  const status =
    session.phase === "idle"
      ? "集中おつかれさま"
      : session.phase === "focus"
        ? "集中中"
        : session.phase === "break"
          ? "休憩中"
          : "一時停止中";

  return (
    <div className="mb-2 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200" data-focus-controls={session.phase}>
      <p className="flex items-baseline justify-between text-xs font-semibold text-gray-700">
        <span>{status}</span>
        {session.phase !== "idle" ? (
          <span className="font-mono text-sm tabular-nums text-gray-900">{formatFocusRemaining(remainingMs)}</span>
        ) : null}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {session.phase === "idle" ? (
          <>
            <button type="button" role="menuitem" onClick={run(startMochitBreak)} className={`${primaryClass} basis-full`}>
              {breakMinutes}分休憩する
            </button>
            <button type="button" role="menuitem" onClick={run(startMochitFocus)} className={secondaryClass}>
              もう一度集中
            </button>
            <button type="button" role="menuitem" onClick={run(dismissMochitBreakOffer)} className={secondaryClass}>
              おわる
            </button>
          </>
        ) : session.phase === "break" ? (
          <>
            <button type="button" role="menuitem" onClick={run(startMochitFocus)} className={primaryClass}>
              集中を始める
            </button>
            <button type="button" role="menuitem" onClick={run(endMochitFocus)} className={secondaryClass}>
              休憩をおわる
            </button>
          </>
        ) : (
          <>
            {session.phase === "focus" ? (
              <button type="button" role="menuitem" onClick={run(pauseMochitFocus)} className={secondaryClass}>
                一時停止
              </button>
            ) : (
              <button type="button" role="menuitem" onClick={run(resumeMochitFocus)} className={primaryClass}>
                再開する
              </button>
            )}
            <button type="button" role="menuitem" onClick={run(endMochitFocus)} className={secondaryClass}>
              終了
            </button>
          </>
        )}
      </div>
    </div>
  );
}
