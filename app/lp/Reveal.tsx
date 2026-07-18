'use client';

import { useEffect } from 'react';

// スクロールで .reveal 要素を控えめにフェード表示する。
// JS有効時のみ html に lp-anim を付けて隠すため、非JS環境や
// prefers-reduced-motion では常に表示されたまま（lp.css 側と対）。
export default function Reveal() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) return;

    document.documentElement.classList.add('lp-anim');
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.15 },
    );
    document.querySelectorAll('.lp .reveal').forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      document.documentElement.classList.remove('lp-anim');
    };
  }, []);

  return null;
}
