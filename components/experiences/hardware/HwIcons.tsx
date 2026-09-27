import type { ReactNode } from "react";

// ハードウェア系の解説で使う、線画の小さなイラスト（装飾ではなく「見た目で種類が分かる」ための絵）。
// ルール：線は濃いグレー1色、面は白と薄いグレー。黄（#f59e0b）は「その絵で注目してほしい部品」1か所だけ。
// どれも viewBox 64×48。大きさは使う側が className（h-12 など）で決める。

const INK = "#1f2937";
const FACE = "#ffffff";
const SHADE = "#e5e7eb";
const ACCENT = "#f59e0b";

type IconProps = { className?: string; title?: string };

function Svg({ className = "h-12 w-16", title, children }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 64 48" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <g fill="none" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
    </svg>
  );
}

// ---------- コンピュータの種類 ----------

export function LaptopIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x={14} y={10} width={36} height={24} rx={2} fill={FACE} />
      <rect x={17} y={13} width={30} height={18} fill={SHADE} stroke="none" />
      <path d="M8 38 L14 34 H50 L56 38 Z" fill={FACE} />
    </Svg>
  );
}

/** ラック型サーバ＋ネットワーク越しに使う複数の利用者 */
export function ServerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x={24} y={6} width={16} height={36} rx={1.5} fill={FACE} />
      {[10, 18, 26, 34].map((y) => (
        <g key={y}>
          <line x1={26} y1={y + 3} x2={34} y2={y + 3} />
          <circle cx={37} cy={y + 3} r={0.9} fill={ACCENT} stroke="none" />
        </g>
      ))}
      {[10, 24, 38].map((y) => (
        <g key={y}>
          <line x1={24} y1={24} x2={12} y2={y} strokeDasharray="2 2" strokeWidth={1} />
          <line x1={40} y1={24} x2={52} y2={y} strokeDasharray="2 2" strokeWidth={1} />
          <rect x={4} y={y - 3} width={8} height={6} rx={1} fill={FACE} strokeWidth={1.2} />
          <rect x={52} y={y - 3} width={8} height={6} rx={1} fill={FACE} strokeWidth={1.2} />
        </g>
      ))}
    </Svg>
  );
}

/** 汎用機：大きな筐体が並び、二重化（予備）を持つ */
export function MainframeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <line x1={4} y1={42} x2={60} y2={42} />
      {[6, 24, 42].map((x) => (
        <g key={x}>
          <rect x={x} y={8} width={16} height={34} rx={1} fill={FACE} />
          <rect x={x + 3} y={12} width={10} height={6} fill={SHADE} stroke="none" />
          <line x1={x + 3} y1={24} x2={x + 13} y2={24} />
          <line x1={x + 3} y1={29} x2={x + 13} y2={29} />
          <line x1={x + 3} y1={34} x2={x + 13} y2={34} />
        </g>
      ))}
      <path d="M24 5 Q32 1 40 5" stroke={ACCENT} />
      <path d="M38 3.4 L40 5 L37.6 5.8" stroke={ACCENT} />
    </Svg>
  );
}

/** スーパーコンピュータ：多数の計算ノードを並べてつなぐ */
export function SupercomputerIcon(p: IconProps) {
  const cols = [6, 16, 26, 36, 46];
  return (
    <Svg {...p}>
      {cols.map((x) =>
        [8, 20, 32].map((y) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={8} height={8} rx={1} fill={x === 26 && y === 20 ? ACCENT : FACE} strokeWidth={1.2} />
        )),
      )}
      {cols.slice(0, -1).map((x) => (
        <g key={x} strokeWidth={0.9}>
          <line x1={x + 8} y1={12} x2={x + 10} y2={12} />
          <line x1={x + 8} y1={24} x2={x + 10} y2={24} />
          <line x1={x + 8} y1={36} x2={x + 10} y2={36} />
        </g>
      ))}
    </Svg>
  );
}

/** 組込み：家電（炊飯器）の中にマイコン */
export function EmbeddedIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 18 Q12 10 32 10 Q52 10 52 18 V38 Q52 42 48 42 H16 Q12 42 12 38 Z" fill={FACE} />
      <line x1={12} y1={18} x2={52} y2={18} />
      <rect x={25} y={24} width={14} height={11} rx={1} fill={ACCENT} stroke={INK} />
      {[27, 31, 35].map((x) => (
        <g key={x} strokeWidth={1}>
          <line x1={x + 0.5} y1={22} x2={x + 0.5} y2={24} />
          <line x1={x + 0.5} y1={35} x2={x + 0.5} y2={37} />
        </g>
      ))}
    </Svg>
  );
}

// ---------- 入出力装置 ----------

export function KeyboardIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x={6} y={14} width={52} height={22} rx={2} fill={FACE} />
      {[19, 25].map((y) =>
        [10, 17, 24, 31, 38, 45].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width={5} height={4} rx={0.6} strokeWidth={1} />),
      )}
      <rect x={18} y={31} width={28} height={3} rx={0.6} strokeWidth={1} />
    </Svg>
  );
}

export function MouseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x={22} y={8} width={20} height={32} rx={10} fill={FACE} />
      <line x1={32} y1={8} x2={32} y2={20} />
      <line x1={22} y1={20} x2={42} y2={20} />
    </Svg>
  );
}

export function MicIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x={26} y={6} width={12} height={22} rx={6} fill={FACE} />
      <path d="M21 22 Q21 34 32 34 Q43 34 43 22" />
      <line x1={32} y1={34} x2={32} y2={41} />
      <line x1={25} y1={41} x2={39} y2={41} />
    </Svg>
  );
}

export function ScannerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 26 L14 18 H50 L56 26 Z" fill={SHADE} />
      <rect x={8} y={26} width={48} height={12} rx={1.5} fill={FACE} />
      <line x1={14} y1={32} x2={50} y2={32} stroke={ACCENT} strokeWidth={2} />
      <path d="M24 18 V8 H40 V18" fill={FACE} />
    </Svg>
  );
}

export function CameraIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x={10} y={14} width={44} height={26} rx={3} fill={FACE} />
      <path d="M22 14 L25 9 H39 L42 14" />
      <circle cx={32} cy={27} r={7} fill={SHADE} />
    </Svg>
  );
}

export function DisplayIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x={8} y={6} width={48} height={30} rx={2} fill={FACE} />
      <rect x={11} y={9} width={42} height={24} fill={SHADE} stroke="none" />
      <line x1={32} y1={36} x2={32} y2={42} />
      <line x1={22} y1={42} x2={42} y2={42} />
    </Svg>
  );
}

export function PrinterIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x={20} y={6} width={24} height={10} fill={FACE} />
      <rect x={8} y={16} width={48} height={16} rx={2} fill={SHADE} />
      <rect x={18} y={28} width={28} height={14} fill={FACE} />
      <line x1={22} y1={33} x2={42} y2={33} strokeWidth={1} />
      <line x1={22} y1={37} x2={36} y2={37} strokeWidth={1} />
    </Svg>
  );
}

export function SpeakerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 18 H22 L32 10 V38 L22 30 H14 Z" fill={FACE} />
      <path d="M38 18 Q42 24 38 30" />
      <path d="M43 14 Q50 24 43 34" />
    </Svg>
  );
}

export function TouchPanelIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x={20} y={4} width={24} height={40} rx={3} fill={FACE} />
      <rect x={23} y={8} width={18} height={30} fill={SHADE} stroke="none" />
      <circle cx={32} cy={24} r={4} stroke={ACCENT} strokeWidth={2} />
    </Svg>
  );
}

export function SsdIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x={10} y={12} width={44} height={24} rx={2} fill={FACE} />
      <rect x={16} y={17} width={10} height={8} fill={SHADE} />
      <rect x={30} y={17} width={10} height={8} fill={SHADE} />
      <line x1={14} y1={31} x2={50} y2={31} strokeWidth={1} />
    </Svg>
  );
}

/** 人（入力する・結果を受け取る側） */
export function PersonIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx={32} cy={14} r={7} fill={FACE} />
      <path d="M18 42 Q18 26 32 26 Q46 26 46 42 Z" fill={FACE} />
    </Svg>
  );
}
