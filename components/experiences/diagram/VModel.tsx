// 静的なV字モデル。左の辺を下る＝設計して作る、右の辺を上る＝テストで確かめる。
// 同じ高さの設計とテストを点線で結び、「この設計は、後のどのテストで確かめられるか」を示す。
//   highlight : 強調する段（0=要件定義 … 3=プログラミング）。左右どちらを強調するかは side で選ぶ

export const V_LEVELS: { design: string; designSub?: string; test: string; testSub?: string }[] = [
  { design: "要件定義", test: "受入テスト", testSub: "運用テスト" },
  { design: "外部設計", designSub: "基本設計", test: "システムテスト" },
  { design: "内部設計", designSub: "詳細設計", test: "結合テスト" },
  { design: "プログラミング", designSub: "実装", test: "単体テスト" },
];

const W = 360;
const BOX_W = 108;
const BOX_H = 44;
const TOP = 46;
const STEP = 56;
const LX = [62, 82, 102, 122];
const RX = LX.map((x) => W - x);
const y = (i: number) => TOP + i * STEP;

function Box({ cx, cy, main, sub, strong, soft }: { cx: number; cy: number; main: string; sub?: string; strong: boolean; soft: boolean }) {
  const fill = strong ? "#0868c9" : soft ? "#eff7ff" : "#ffffff";
  const stroke = strong ? "#0868c9" : soft ? "#0868c9" : "#9ca3af";
  const color = strong ? "#ffffff" : "#111827";
  return (
    <g>
      <rect x={cx - BOX_W / 2} y={cy - BOX_H / 2} width={BOX_W} height={BOX_H} rx={8} fill={fill} stroke={stroke} strokeWidth={strong || soft ? 1.8 : 1.2} />
      <text x={cx} y={sub ? cy - 1 : cy + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill={color}>
        {main}
      </text>
      {sub && (
        <text x={cx} y={cy + 15} textAnchor="middle" fontSize={11} fontWeight={500} fill={strong ? "#e5f0fb" : "#4b5563"}>
          （{sub}）
        </text>
      )}
    </g>
  );
}

export function VModel({
  highlight = [],
  side = "design",
  label,
}: {
  highlight?: number[];
  side?: "design" | "test" | "both";
  label: string;
}) {
  const bottomY = y(V_LEVELS.length - 1);
  return (
    <svg viewBox={`0 0 ${W} ${bottomY + BOX_H / 2 + 8}`} className="block h-auto w-full" role="img" aria-label={label} data-testid="v-model">
      {/* 左右の辺の見出し */}
      <text x={LX[0] - BOX_W / 2} y={14} fontSize={13} fontWeight={700} fill="#111827">
        設計して作る ↓
      </text>
      <text x={RX[0] + BOX_W / 2} y={14} textAnchor="end" fontSize={13} fontWeight={700} fill="#111827">
        テストで確かめる ↑
      </text>

      {/* V の骨格 */}
      <path
        d={`M${LX[0]},${y(0)} L${LX[3]},${bottomY} L${RX[3]},${bottomY} L${RX[0]},${y(0)}`}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={10}
        strokeLinejoin="round"
      />

      {/* 同じ高さの設計とテストを結ぶ */}
      {V_LEVELS.map((_, i) => {
        const on = highlight.includes(i);
        return (
          <line
            key={i}
            x1={LX[i] + BOX_W / 2}
            y1={y(i)}
            x2={RX[i] - BOX_W / 2}
            y2={y(i)}
            stroke={on ? "#0868c9" : "#9ca3af"}
            strokeWidth={on ? 2.2 : 1.2}
            strokeDasharray={on ? undefined : "4 4"}
          />
        );
      })}

      {V_LEVELS.map((l, i) => {
        const on = highlight.includes(i);
        return (
          <g key={l.design}>
            <Box cx={LX[i]} cy={y(i)} main={l.design} sub={l.designSub} strong={on && side !== "test"} soft={on && side === "test"} />
            <Box cx={RX[i]} cy={y(i)} main={l.test} sub={l.testSub} strong={on && side !== "design"} soft={on && side === "design"} />
          </g>
        );
      })}
    </svg>
  );
}
