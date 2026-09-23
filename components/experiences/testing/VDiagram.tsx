import styles from "./testing.module.css";

// V字モデル。左の辺を下る＝作る工程、右の辺を上る＝確かめるテスト。
// どちらかを選ぶと、同じ高さの相手へ線が伸び、相手が光る（どの設計をどのテストで確かめるか）。

export type Pair = { id: number; left: string; right: string; note: string; bug: string };

const H = 190;
const LEVEL_Y = [22, 66, 110, 154];
const LEFT_X = [17, 23, 29, 35];
const RIGHT_X = [83, 77, 71, 65];

export function VDiagram({ pairs, sel, onSelect, reducedMotion }: { pairs: Pair[]; sel: number | null; onSelect: (i: number) => void; reducedMotion: boolean }) {
  const vPath = `M${LEFT_X[0]},${LEVEL_Y[0]} L${LEFT_X[3]},${LEVEL_Y[3]} L50,${H - 8} L${RIGHT_X[3]},${LEVEL_Y[3]} L${RIGHT_X[0]},${LEVEL_Y[0]}`;
  return (
    <div className="relative mt-4 w-full" style={{ height: H }} data-testid="v-diagram" data-sel={sel ?? "none"}>
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d={vPath} fill="none" stroke="#e5e7eb" strokeWidth={10} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {pairs.map((p, i) =>
          sel === i ? (
            <line
              key={`${i}-${sel}`}
              x1={LEFT_X[i]}
              y1={LEVEL_Y[i]}
              x2={RIGHT_X[i]}
              y2={LEVEL_Y[i]}
              stroke="#4f46e5"
              strokeWidth={2.5}
              vectorEffect="non-scaling-stroke"
              pathLength={100}
              className={reducedMotion ? undefined : styles.draw}
              data-testid="v-link"
            />
          ) : (
            <line key={i} x1={LEFT_X[i]} y1={LEVEL_Y[i]} x2={RIGHT_X[i]} y2={LEVEL_Y[i]} stroke="#e5e7eb" strokeWidth={1.2} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          ),
        )}
      </svg>
      <span className="absolute left-1 top-[42%] text-[10px] font-bold text-brand-500" style={{ writingMode: "vertical-rl" }}>
        作る ↓
      </span>
      <span className="absolute right-1 top-[42%] text-[10px] font-bold text-emerald-600" style={{ writingMode: "vertical-rl" }}>
        確かめる ↑
      </span>
      <span className="absolute left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400" style={{ top: H - 16 }}>
        コードができる
      </span>
      {pairs.map((p, i) => {
        const on = sel === i;
        return (
          <div key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-pressed={on}
              className={`absolute w-[86px] -translate-x-1/2 -translate-y-1/2 rounded-lg px-1 py-1.5 text-[11px] font-bold transition active:scale-95 ${
                on ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
              }`}
              style={{ left: `${LEFT_X[i]}%`, top: LEVEL_Y[i] }}
            >
              {p.left}
            </button>
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-pressed={on}
              className={`absolute w-[86px] -translate-x-1/2 -translate-y-1/2 rounded-lg px-1 py-1.5 text-[11px] font-bold transition active:scale-95 ${
                on ? `bg-emerald-600 text-white ${reducedMotion ? "" : styles.pop}` : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              }`}
              style={{ left: `${RIGHT_X[i]}%`, top: LEVEL_Y[i], animationDelay: on && !reducedMotion ? "450ms" : undefined }}
            >
              {p.right}
            </button>
          </div>
        );
      })}
    </div>
  );
}
