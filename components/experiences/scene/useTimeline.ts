"use client";

import { useEffect, useState } from "react";

/**
 * key が変わってからの経過で、marks（ms）をいくつ過ぎたかを返す。
 * 動く物の札を「動いている間だけ」出し、着いたら行き先の名札に切り替えるのに使う
 * （動く札と止まった名札が同時に出ると、置き場所が足りずに重なるため）。
 * skip（reduced-motion・戻る操作）のときは最初から全部過ぎた扱い。
 */
export function useTimeline(key: string | number, marks: number[], skip: boolean) {
  const [state, setState] = useState({ key, passed: 0 });
  const sig = marks.join(",");
  useEffect(() => {
    if (skip) return;
    const timers = sig
      .split(",")
      .filter(Boolean)
      .map((m, i) => window.setTimeout(() => setState({ key, passed: i + 1 }), Number(m)));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [key, sig, skip]);
  if (skip) return marks.length;
  return state.key === key ? state.passed : 0;
}
