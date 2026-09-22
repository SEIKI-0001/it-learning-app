import { useEffect, useRef, useState } from "react";

// 売上線と総費用線のグラフ。主役は「2本が交わる点＝損益分岐点」。
//   交点より左＝費用が上（赤字ゾーン）、右＝売上が上（黒字ゾーン）。
//   販売数のカーソルに、2本の線の差（利益/損失）を太い縦棒で出す。
//   条件（固定費・売価・変動費）を変えると、線が動いて交点が左右にすべる。

export type Econ = { fixed: number; price: number; vc: number };

export const MAX_QTY = 100;
const Y_MAX = 70000;
const W = 320;
const H = 196;
const PAD = { l: 34, r: 10, t: 12, b: 24 };
const X = (q: number) => PAD.l + (q / MAX_QTY) * (W - PAD.l - PAD.r);
const Y = (v: number) => H - PAD.b - (Math.min(v, Y_MAX) / Y_MAX) * (H - PAD.t - PAD.b);

export const breakEvenOf = (e: Econ) => e.fixed / (e.price - e.vc);

/** 条件が変わったとき、線をなめらかに動かす（reduced-motion では即時） */
export function useTweenedEcon(target: Econ, reducedMotion: boolean) {
  const [shown, setShown] = useState(target);
  // いま画面に出ている値（アニメーション途中で条件が変わっても、そこから動き出す）
  const lastRef = useRef(target);

  useEffect(() => {
    if (reducedMotion) {
      lastRef.current = target;
      return;
    }
    const from = lastRef.current;
    const start = performance.now();
    const dur = 700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const k = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const next = {
        fixed: from.fixed + (target.fixed - from.fixed) * k,
        price: from.price + (target.price - from.price) * k,
        vc: from.vc + (target.vc - from.vc) * k,
      };
      lastRef.current = next;
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target.fixed, target.price, target.vc, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  return reducedMotion ? target : shown;
}

const yen = (n: number) => `${Math.round(n).toLocaleString()}円`;

export function BreakEvenChart({ econ, qty }: { econ: Econ; qty: number }) {
  const bep = breakEvenOf(econ);
  const sales = (q: number) => econ.price * q;
  const cost = (q: number) => econ.fixed + econ.vc * q;
  const bepIn = bep <= MAX_QTY;
  const bx = Math.min(bep, MAX_QTY);
  const profit = sales(qty) - cost(qty);

  // 赤字ゾーン（0〜交点：費用線と売上線のあいだ）、黒字ゾーン（交点〜右端）
  const loss = `${X(0)},${Y(cost(0))} ${X(bx)},${Y(cost(bx))} ${X(bx)},${Y(sales(bx))} ${X(0)},${Y(0)}`;
  const gain = bepIn
    ? `${X(bep)},${Y(sales(bep))} ${X(MAX_QTY)},${Y(sales(MAX_QTY))} ${X(MAX_QTY)},${Y(cost(MAX_QTY))}`
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`売上線と総費用線のグラフ。損益分岐点は${Math.round(bep)}個`} data-testid="be-chart">
      {/* 目盛り */}
      {[0, 20000, 40000, 60000].map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={Y(v)} y2={Y(v)} stroke="#eef2f7" />
          <text x={PAD.l - 4} y={Y(v) + 3} fontSize={9} textAnchor="end" fill="#6b7280">
            {v === 0 ? "0" : `${v / 10000}万`}
          </text>
        </g>
      ))}
      {[0, 25, 50, 75, 100].map((q) => (
        <text key={q} x={X(q)} y={H - PAD.b + 11} fontSize={9} textAnchor="middle" fill="#6b7280">
          {q}
        </text>
      ))}
      <text x={W - PAD.r} y={H - 3} fontSize={9} textAnchor="end" fill="#6b7280">
        販売数（個）
      </text>

      <polygon points={loss} fill="#ffe4e6" opacity={0.85} />
      {gain && <polygon points={gain} fill="#d1fae5" opacity={0.9} />}
      {bep > 14 && (
        <text x={X(bx / 2)} y={Y((cost(bx / 2) + sales(bx / 2)) / 2) + 3} fontSize={10} fontWeight={800} stroke="#fff" strokeWidth={3} paintOrder="stroke" fill="#be123c" textAnchor="middle">
          赤字
        </text>
      )}
      {bepIn && bep < 86 && (
        <text x={X((bep + MAX_QTY) / 2)} y={Y((cost((bep + MAX_QTY) / 2) + sales((bep + MAX_QTY) / 2)) / 2) + 3} fontSize={10} fontWeight={800} stroke="#fff" strokeWidth={3} paintOrder="stroke" fill="#047857" textAnchor="middle">
          黒字
        </text>
      )}

      {/* 固定費の床 */}
      <line x1={X(0)} x2={X(MAX_QTY)} y1={Y(econ.fixed)} y2={Y(econ.fixed)} stroke="#94a3b8" strokeDasharray="3 3" />
      <text x={X(MAX_QTY) - 2} y={Y(econ.fixed) - 3} fontSize={9} textAnchor="end" fill="#64748b">
        固定費 {yen(econ.fixed)}
      </text>

      {/* 総費用線・売上線 */}
      <line x1={X(0)} y1={Y(cost(0))} x2={X(MAX_QTY)} y2={Y(cost(MAX_QTY))} stroke="#e11d48" strokeWidth={2.5} data-testid="be-cost-line" />
      <line x1={X(0)} y1={Y(0)} x2={X(MAX_QTY)} y2={Y(sales(MAX_QTY))} stroke="#2563eb" strokeWidth={2.5} data-testid="be-sales-line" />
      <text x={X(MAX_QTY) - 2} y={Y(cost(MAX_QTY)) + 11} fontSize={10} fontWeight={800} stroke="#fff" strokeWidth={3} paintOrder="stroke" textAnchor="end" fill="#e11d48">
        総費用
      </text>
      <text x={X(MAX_QTY) - 4} y={Math.max(Y(sales(MAX_QTY)) - 4, PAD.t + 6)} fontSize={10} fontWeight={800} stroke="#fff" strokeWidth={3} paintOrder="stroke" textAnchor="end" fill="#2563eb">
        売上
      </text>

      {/* カーソル：2本の差＝利益/損失 */}
      <line x1={X(qty)} x2={X(qty)} y1={PAD.t} y2={H - PAD.b} stroke="#cbd5e1" />
      <line
        x1={X(qty)}
        x2={X(qty)}
        y1={Y(sales(qty))}
        y2={Y(cost(qty))}
        stroke={profit >= 0 ? "#10b981" : "#f43f5e"}
        strokeWidth={5}
        strokeLinecap="round"
        data-testid="be-gap"
      />
      <circle cx={X(qty)} cy={Y(sales(qty))} r={3.5} fill="#2563eb" />
      <circle cx={X(qty)} cy={Y(cost(qty))} r={3.5} fill="#e11d48" />

      {/* 交点＝損益分岐点 */}
      {bepIn && (
        <g data-testid="be-point" data-qty={Math.round(bep)}>
          <line x1={X(bep)} x2={X(bep)} y1={Y(sales(bep))} y2={H - PAD.b} stroke="#111827" strokeDasharray="2 2" />
          <circle cx={X(bep)} cy={Y(sales(bep))} r={5} fill="#fff" stroke="#111827" strokeWidth={2} />
          <text x={X(bep)} y={Y(sales(bep)) - 9} fontSize={10} fontWeight={800} stroke="#fff" strokeWidth={3} paintOrder="stroke" textAnchor={bep > 80 ? "end" : "middle"} fill="#111827">
            損益分岐点 {Math.round(bep)}個
          </text>
        </g>
      )}
    </svg>
  );
}
