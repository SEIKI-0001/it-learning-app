import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * 要素が画面に見えているか。解説スライドの非表示パネル（h-0）では false になるので、
 * 「見えている間だけ自動再生する」判定に使う。IntersectionObserver が無い環境（テスト等）では常に true。
 */
export function useInView<T extends Element>(threshold = 0.35): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, inView];
}
