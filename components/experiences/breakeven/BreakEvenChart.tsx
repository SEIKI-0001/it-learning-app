import styles from "../calc/calc.module.css";

// 売上線と総費用線のグラフ。主役は「2本が交わる点＝損益分岐点」。
//   交点より左＝費用が上（赤字ゾーン）、右＝売上が上（黒字ゾーン）。
//   販売数のカーソルに、2本の線の差（利益/損失）を太い縦棒で出す。
//   draw=true のときは、2本の線を描き → 赤字/黒字ゾーンと交点を出す（親が key で描き直す）。

export type Econ = { fixed: number; price: number; vc: number };

export const MAX_QTY = 100;
const Y_MAX = 70000;
const W = 320;
const H = 196;
const PAD = { l: 34, r: 10, t: 12, b: 24 };
const X = (q: number) => PAD.l + (q / MAX_QTY) * (W - PAD.l - PAD.r);
const Y = (v: number) => H - PAD.b - (Math.min(v, Y_MAX) / Y_MAX) * (H - PAD.t - PAD.b);

export const breakEvenOf = (e: Econ) => e.fixed / (e.price - e.vc);

const yen = (n: number) => `${Math.round(n).toLocaleString()}円`;

export function BreakEvenChart({ econ, qty, draw = false }: { econ: Econ; qty: number; draw?: boolean }) {
  const bep = breakEvenOf(econ);
  const sales = (q: number) => econ.price * q;
  const cost = (q: number) => econ.fixed + econ.vc * q;
  const bepIn = bep <= MAX_QTY;
  const bx = Math.min(bep, MAX_QTY);
  const profit = sales(qty) - cost(qty);
  const late = draw ? styles.fadeLate : undefined;

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

      <g className={late}>
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
      </g>

      {/* 固定費の床 */}
      <line x1={X(0)} x2={X(MAX_QTY)} y1={Y(econ.fixed)} y2={Y(econ.fixed)} stroke="#94a3b8" strokeDasharray="3 3" />
      <text x={X(MAX_QTY) - 2} y={Y(econ.fixed) + 10} fontSize={9} textAnchor="end" fill="#64748b">
        固定費 {yen(econ.fixed)}
      </text>

      {/* 総費用線・売上線 */}
      <line x1={X(0)} y1={Y(cost(0))} x2={X(MAX_QTY)} y2={Y(cost(MAX_QTY))} stroke="#e11d48" strokeWidth={2.5} pathLength={1} className={draw ? styles.draw : undefined} data-testid="be-cost-line" />
      <line x1={X(0)} y1={Y(0)} x2={X(MAX_QTY)} y2={Y(sales(MAX_QTY))} stroke="#2563eb" strokeWidth={2.5} pathLength={1} className={draw ? styles.draw : undefined} data-testid="be-sales-line" />
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
        <g data-testid="be-point" data-qty={Math.round(bep)} className={late}>
          <line x1={X(bep)} x2={X(bep)} y1={Y(sales(bep))} y2={H - PAD.b} stroke="#111827" strokeDasharray="2 2" />
          {qty === Math.round(bep) && (
            <circle cx={X(bep)} cy={Y(sales(bep))} r={9} fill="none" stroke="#111827" strokeWidth={1.5} className={styles.ring} data-testid="be-point-ring" />
          )}
          <circle cx={X(bep)} cy={Y(sales(bep))} r={5} fill="#fff" stroke="#111827" strokeWidth={2} />
          {/* 交点の右下（2本の線より下）は空いているので、そこに2行で置く */}
          <text x={bep > 60 ? X(bep) - 8 : X(bep) + 8} y={Y(sales(bep)) + 16} fontSize={10} fontWeight={800} stroke="#fff" strokeWidth={3} paintOrder="stroke" textAnchor={bep > 60 ? "end" : "start"} fill="#111827">
            <tspan>損益分岐点 {Math.round(bep)}個</tspan>
            <tspan x={bep > 60 ? X(bep) - 8 : X(bep) + 8} dy={12} fontWeight={700}>
              売上 {yen(sales(bep))}
            </tspan>
          </text>
        </g>
      )}
    </svg>
  );
}
