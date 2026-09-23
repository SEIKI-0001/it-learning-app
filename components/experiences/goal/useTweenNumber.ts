import { useEffect, useRef, useState } from "react";

/** 数字を target まで滑らかに数え上げる。reduced-motion では即座に target を返す。 */
export function useTweenNumber(target: number, reducedMotion: boolean, duration = 650) {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    if (reducedMotion) return;
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = origin + (target - origin) * eased;
      from.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reducedMotion, duration]);

  return reducedMotion ? target : value;
}
