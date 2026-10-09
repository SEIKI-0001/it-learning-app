import type { ReactNode } from "react";

// リスク対応の4種類を「出かける人と雨雲」の同じ絵で描き分ける（2D・静的）。
// どの絵も左に人、上に雲を置き、雲の大きさ（影響度）と人の備え方だけを変える。
// 色は対応の種類ごとの tone（currentColor）で塗る。

export type RiskResp = "avoid" | "mitigate" | "transfer" | "accept";

const INK = "#374151"; // gray-700
const MUTED = "#d1d5db"; // gray-300

function Frame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 140 84" className="mx-auto h-16 w-auto" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

function Ground() {
  return <path d="M8 76h124" stroke={MUTED} strokeWidth={1.8} strokeLinecap="round" />;
}

// 人（線画）。facing=-1 で左向きに歩く
function Person({ x, facing = 1, arm }: { x: number; facing?: 1 | -1; arm?: "up" }) {
  const f = facing;
  return (
    <g fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={x} cy={44} r={5} fill="#fff" />
      <path d={`M${x} 49v14`} />
      <path d={`M${x} 63l${-5 * f} 12M${x} 63l${5 * f} 12`} />
      {arm === "up" ? <path d={`M${x} 53l${7 * f} -7`} /> : <path d={`M${x} 53l${6 * f} 6`} />}
      <path d={`M${x} 53l${-6 * f} 6`} />
    </g>
  );
}

// 雲。big=true は雷雲（濃い色）
function Cloud({ x, y, s = 1, big }: { x: number; y: number; s?: number; big?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        d="M-18 8a8 8 0 0 1 2-15.6A11 11 0 0 1 4-13a9 9 0 0 1 14 7.4A7.5 7.5 0 0 1 18 8z"
        fill="currentColor"
        fillOpacity={big ? 0.32 : 0.14}
        stroke="currentColor"
        strokeWidth={1.6 / s}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Bolt({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x + 3} ${y}l-7 12h6l-5 12 11-15h-6l5-9z`}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinejoin="round"
    />
  );
}

function Drops({ pts }: { pts: [number, number][] }) {
  return (
    <g stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      {pts.map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y}l-2 5`} />
      ))}
    </g>
  );
}

// 回避：雷雲のある道には行かない（通行止めの前で引き返す）
function Avoid() {
  return (
    <Frame label="雷雲のある道は通行止めにして、人は引き返す">
      <Ground />
      <Cloud x={108} y={24} big />
      <Bolt x={104} y={32} />
      {/* 通行止めの柵 */}
      <g stroke={INK} strokeWidth={1.8} strokeLinecap="round">
        <path d="M70 58v18M92 58v18" />
      </g>
      <rect x={66} y={56} width={30} height={8} rx={2} fill="#fff" stroke="currentColor" strokeWidth={1.8} />
      <path d="M72 56l-4 8M80 56l-4 8M88 56l-4 8M96 57l-3 7" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <Person x={36} facing={-1} />
      {/* 引き返す矢印 */}
      <path d="M50 36h-14l4-4M36 36l4 4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

// 低減：雨はよく降るので、傘を差して被害を小さくする
function Mitigate() {
  return (
    <Frame label="雨がよく降るので、傘を差して濡れるのを減らす">
      <Ground />
      <Cloud x={62} y={21} />
      <Drops
        pts={[
          [34, 34],
          [28, 48],
          [40, 58],
          [92, 34],
          [98, 48],
          [86, 58],
        ]}
      />
      {/* 傘 */}
      <path d="M42 38a20 7 0 0 1 40 0z" fill="currentColor" fillOpacity={0.22} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M68 38v15" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
      <Person x={62} arm="up" />
    </Frame>
  );
}

// 移転：まれな落雷で家が壊れても、修理代は保険が払う
function Transfer() {
  return (
    <Frame label="落雷で家が壊れても、修理のお金は保険会社が払う">
      <Ground />
      <Cloud x={34} y={22} big />
      <Bolt x={30} y={28} />
      {/* 家（自分） */}
      <g fill="#fff" stroke={INK} strokeWidth={1.8} strokeLinejoin="round">
        <path d="M18 76V60l14-11 14 11v16z" />
      </g>
      <path d="M32 50l-3 7 4 2-3 6" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      {/* 保険会社 */}
      <g fill="#fff" stroke={INK} strokeWidth={1.8} strokeLinejoin="round">
        <rect x={96} y={42} width={34} height={34} rx={2} />
        <path d="M93 42l20-10 20 10z" />
      </g>
      <text x={113} y={63} textAnchor="middle" fontSize={11} fontWeight={700} fill="currentColor">
        保険
      </text>
      {/* お金が保険会社から家へ */}
      <path d="M92 60H54l5-5M54 60l5 5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={73} cy={50} r={7} fill="#fff" stroke="currentColor" strokeWidth={1.6} />
      <text x={73} y={53.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="currentColor">
        ¥
      </text>
    </Frame>
  );
}

// 受容：小雨がたまに降る程度なら、何もせずそのまま出かける
function Accept() {
  return (
    <Frame label="たまの小雨なら、傘を持たずにそのまま出かける">
      <Ground />
      <Cloud x={106} y={26} s={0.8} />
      <Drops
        pts={[
          [102, 34],
          [112, 40],
        ]}
      />
      <Person x={50} />
      {/* 進む向きの矢印 */}
      <path d="M62 56h18l-4-4M80 56l-4 4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

export function RiskResponseScene({ kind }: { kind: RiskResp }) {
  switch (kind) {
    case "avoid":
      return <Avoid />;
    case "mitigate":
      return <Mitigate />;
    case "transfer":
      return <Transfer />;
    case "accept":
      return <Accept />;
  }
}
