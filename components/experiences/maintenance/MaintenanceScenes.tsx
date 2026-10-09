import type { ReactNode } from "react";

// 4つの保守を「同じアプリ画面」の絵で描き分ける（2D・静的）。
// どの絵も中央に同じアプリのウィンドウ、足元に動作環境（OS・制度）の台を置き、
// 何が起きているか（壊れた／ひびが入りかけ／台が変わった／もっと速く）だけを変える。
// 色は保守の種類ごとの tone（currentColor）で塗る。

export type MaintKind = "corrective" | "preventive" | "adaptive" | "perfective";

const INK = "#374151"; // gray-700
const MUTED = "#d1d5db"; // gray-300

function Frame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 140 84" className="h-auto w-full" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

// アプリのウィンドウ（タイトルバー＋本文の行）
function AppWindow({ x = 40, y = 8, lines = true }: { x?: number; y?: number; lines?: boolean }) {
  return (
    <g fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x={x} y={y} width={60} height={44} rx={5} fill="#fff" />
      <path d={`M${x} ${y + 10}h60`} />
      <circle cx={x + 6} cy={y + 5} r={1.1} fill={INK} stroke="none" />
      <circle cx={x + 10.5} cy={y + 5} r={1.1} fill={INK} stroke="none" />
      {lines && (
        <g stroke={MUTED}>
          <path d={`M${x + 8} ${y + 20}h30`} />
          <path d={`M${x + 8} ${y + 28}h40`} />
          <path d={`M${x + 8} ${y + 36}h22`} />
        </g>
      )}
    </g>
  );
}

// 足元の台＝動作環境（OS・法律・制度）
function Ground({ text = "OS・制度", tone }: { text?: string; tone?: boolean }) {
  return (
    <g>
      <rect
        x={30}
        y={60}
        width={80}
        height={16}
        rx={4}
        fill={tone ? "currentColor" : "#f3f4f6"}
        fillOpacity={tone ? 0.14 : 1}
        stroke={tone ? "currentColor" : MUTED}
        strokeWidth={1.6}
      />
      <text x={70} y={71.5} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={tone ? "currentColor" : "#6b7280"}>
        {text}
      </text>
    </g>
  );
}

// レンチ（Icon の tool と同じ線画を拡大）
function Wrench({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke="currentColor" strokeWidth={1.8 / s} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2z" />
    </g>
  );
}

function Corrective() {
  return (
    <Frame label="アプリが壊れて止まっている。レンチで直す">
      <Ground />
      <AppWindow lines={false} />
      {/* 壊れた画面：割れ目とエラー表示 */}
      <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M58 18l6 9-5 6 7 8-3 9" />
        <path d="M76 24l8 8M84 24l-8 8" strokeWidth={2.4} />
      </g>
      <text x={80} y={45} textAnchor="middle" fontSize={7.5} fontWeight={700} fill="currentColor">
        停止
      </text>
      {/* 稲妻＝障害発生 */}
      <path d="M26 6 18 20h7l-2 11 9-15h-7z" fill="currentColor" fillOpacity={0.18} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
      <Wrench x={104} y={22} s={1.25} />
    </Frame>
  );
}

function Preventive() {
  return (
    <Frame label="アプリはまだ動いているが小さなひびがある。壊れる前に直す">
      <Ground />
      <AppWindow />
      {/* まだ動いているが、小さなひび＝潜在不良 */}
      <circle cx={84} cy={40} r={8.5} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="2.5 2.5" />
      <path d="M81 36.5l3 3-2 2.5 3 2.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      {/* 砂時計＝まだ時間がある（壊れる前） */}
      <g transform="translate(13 14) scale(0.95)" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2.5h12M6 21.5h12" />
        <path d="M7 2.5c0 4.5 5 6 5 9.5s-5 5-5 9.5M17 2.5c0 4.5-5 6-5 9.5s5 5 5 9.5" />
      </g>
      <Wrench x={104} y={22} s={1.25} />
    </Frame>
  );
}

function Adaptive() {
  return (
    <Frame label="足元のOSや制度が新しくなったので、アプリをそれに合わせる">
      {/* 古い台（点線）→ 新しい台 */}
      <rect x={8} y={60} width={22} height={16} rx={4} fill="none" stroke={MUTED} strokeWidth={1.4} strokeDasharray="3 2.5" />
      <text x={19} y={71} textAnchor="middle" fontSize={7} fill="#9ca3af">
        旧
      </text>
      <path d="M31 68h3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <Ground text="新OS・法改正" tone />
      <AppWindow />
      {/* アプリの足を新しい台の形に合わせる */}
      <path d="M62 52v4h16v-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* 循環矢印＝合わせ直す */}
      <g fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M110 22a10 10 0 0 1 14 9" />
        <path d="M124 31l2.5-4M124 31l-4-2" />
        <path d="M124 40a10 10 0 0 1-14-6" />
        <path d="M110 34l-2.5 4M110 34l4 1.5" />
      </g>
    </Frame>
  );
}

function Perfective() {
  return (
    <Frame label="アプリは正常に動いているが、もっと速く・使いやすくする">
      <Ground />
      <AppWindow lines={false} />
      {/* 正常に動いている（チェック） */}
      <path d="M48 30l4 4 7-8" fill="none" stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* 速度メーター：針が上がる */}
      <g fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <path d="M68 44a12 12 0 0 1 24 0" />
        <path d="M80 44l7-9" strokeWidth={2.2} />
      </g>
      <circle cx={80} cy={44} r={1.8} fill="currentColor" />
      {/* 上向き矢印＝もっと良く */}
      <g fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M108 44 120 26" />
        <path d="M112 26h8v8" />
      </g>
      {/* 速さの線 */}
      <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" opacity={0.6}>
        <path d="M18 20h14M14 28h18M20 36h12" />
      </g>
    </Frame>
  );
}

export function MaintenanceScene({ kind }: { kind: MaintKind }) {
  switch (kind) {
    case "corrective":
      return <Corrective />;
    case "preventive":
      return <Preventive />;
    case "adaptive":
      return <Adaptive />;
    case "perfective":
      return <Perfective />;
  }
}
