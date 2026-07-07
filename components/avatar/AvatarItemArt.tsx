// 装備・背景・エフェクトのSVGアート（オリジナル素材）。
//
// AvatarPresetArt.tsx と同じ座標系（viewBox 0 0 120 120・共通ジオメトリ）で描く。
//   - 頭まわり: 中心(60,44) 半径21 / 目の高さ y≈47
//   - 胸元バッジ: (51,73) 付近
//   - 手持ちアイテム: 右手側 x=81〜106, y=66〜98 付近
//   - 背景: x=3 y=3 w=114 h=114 rx=14 の角丸パネル
// back はキャラクターの後ろ、front は前に重ねる（AvatarRenderer が合成）。

import type { ReactElement } from "react";
import { INK } from "@/components/avatar/AvatarPresetArt";

export type AvatarItemArt = {
  back?: ReactElement;
  front?: ReactElement;
};

export const ITEM_ART: Record<string, AvatarItemArt> = {
  // ---- head -----------------------------------------------------------------
  "headset-beginner": {
    front: (
      <g stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M40 41 A20 20 0 0 1 80 41" fill="none" strokeWidth={3.5} />
        <rect x={34.5} y={38} width={9} height={14} rx={4} fill="#6366f1" />
        <rect x={76.5} y={38} width={9} height={14} rx={4} fill="#6366f1" />
        <path d="M81 52 Q83 60 73 61" fill="none" strokeWidth={2.5} />
        <circle cx={71.5} cy={61} r={2} fill={INK} stroke="none" />
      </g>
    ),
  },

  // ---- face -----------------------------------------------------------------
  "glasses-focus": {
    front: (
      <g stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x={46} y={41} width={12} height={10} rx={3.5} fill="rgba(99,102,241,0.14)" />
        <rect x={62} y={41} width={12} height={10} rx={3.5} fill="rgba(99,102,241,0.14)" />
        <path d="M58 45.5 H62 M46 45.5 H40.5 M74 45.5 H79.5" fill="none" />
      </g>
    ),
  },
  "goggles-network": {
    front: (
      <g stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x={42} y={39} width={36} height={13} rx={6.5} fill="#0ea5e9" />
        <circle cx={52} cy={45.5} r={4} fill="#bae6fd" />
        <circle cx={68} cy={45.5} r={4} fill="#bae6fd" />
        <path d="M56 45.5 H64" stroke="#e0f2fe" strokeWidth={2} fill="none" />
        <circle cx={60} cy={45.5} r={1.3} fill="#e0f2fe" stroke="none" />
      </g>
    ),
  },

  // ---- body -----------------------------------------------------------------
  "jacket-apprentice": {
    front: (
      <g stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M41 98 V80 Q41 64 60 64 L53 98 Z" fill="#818cf8" />
        <path d="M79 98 V80 Q79 64 60 64 L67 98 Z" fill="#818cf8" />
        <path d="M45 85 h4.5 M70.5 85 h4.5" fill="none" strokeWidth={2} />
      </g>
    ),
  },
  "jacket-business": {
    front: (
      <g stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M41 98 V80 Q41 64 60 64 L53 98 Z" fill="#3b4668" />
        <path d="M79 98 V80 Q79 64 60 64 L67 98 Z" fill="#3b4668" />
        <path d="M60 64.5 L54.5 67 L58.5 71.5 Z" fill="#fff" strokeWidth={2} />
        <path d="M60 64.5 L65.5 67 L61.5 71.5 Z" fill="#fff" strokeWidth={2} />
        <path d="M60 71 L57 75 L60 87 L63 75 Z" fill="#f43f5e" strokeWidth={2} />
      </g>
    ),
  },
  "cape-challenger": {
    back: (
      <path
        d="M43 67 Q28 86 35 103 Q48 96 60 96 Q72 96 85 103 Q92 86 77 67 Q60 74 43 67 Z"
        fill="#f43f5e"
        stroke={INK}
        strokeWidth={3}
        strokeLinejoin="round"
      />
    ),
    front: (
      <g stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 66.5 Q60 71.5 70 66.5" fill="none" />
        <circle cx={50} cy={66.5} r={2.3} fill="#fbbf24" />
        <circle cx={70} cy={66.5} r={2.3} fill="#fbbf24" />
      </g>
    ),
  },

  // ---- hand -----------------------------------------------------------------
  "note-basic": {
    front: (
      <g stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x={84} y={72} width={19} height={23} rx={3} fill="#fff" />
        <path d="M84 72 h5.5 v23 h-5.5 Z" fill="#6366f1" strokeWidth={2} />
        <path d="M93 79 h6 M93 84.5 h6 M93 90 h6" stroke="#94a3b8" strokeWidth={2} fill="none" />
      </g>
    ),
  },
  "note-plan": {
    front: (
      <g stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x={84} y={72} width={19} height={23} rx={3} fill="#fff" />
        <path d="M84 72 h5.5 v23 h-5.5 Z" fill="#f59e0b" strokeWidth={2} />
        <circle cx={96} cy={80} r={3.2} fill="#fde68a" strokeWidth={2} />
        <path d="M96 83.2 v2.3 M92 88.5 h8 M92 92 h8" stroke="#94a3b8" strokeWidth={2} fill="none" />
      </g>
    ),
  },
  "notebook-project": {
    front: (
      <g stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x={84} y={71} width={19} height={24} rx={3} fill="#14b8a6" />
        <rect x={88.5} y={76} width={10} height={8} rx={1.5} fill="#fff" strokeWidth={2} />
        <path d="M88.5 79.5 h10 M93.5 76 v8" stroke={INK} strokeWidth={1.5} fill="none" />
        <path d="M84 88.5 h19" stroke="#0f766e" strokeWidth={3} fill="none" />
      </g>
    ),
  },
  "board-task": {
    front: (
      <g stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x={83} y={71} width={20} height={26} rx={3} fill="#f1f5f9" />
        <rect x={89} y={67.5} width={8} height={6} rx={2} fill="#94a3b8" />
        <rect x={86.5} y={77} width={4.5} height={4.5} rx={1} fill="#fff" strokeWidth={1.8} />
        <path d="M87.5 79 l1.4 1.4 l2 -2.6" stroke="#10b981" strokeWidth={1.8} fill="none" />
        <rect x={86.5} y={84} width={4.5} height={4.5} rx={1} fill="#fff" strokeWidth={1.8} />
        <path d="M87.5 86 l1.4 1.4 l2 -2.6" stroke="#10b981" strokeWidth={1.8} fill="none" />
        <rect x={86.5} y={91} width={4.5} height={4.5} rx={1} fill="#fff" strokeWidth={1.8} />
        <path d="M93.5 79.2 h6.5 M93.5 86.2 h6.5 M93.5 93.2 h6.5" stroke="#94a3b8" strokeWidth={2} fill="none" />
      </g>
    ),
  },
  "shield-security": {
    front: (
      <g stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M93 66 L105 70.5 V81 Q105 92 93 98 Q81 92 81 81 V70.5 Z"
          fill="#7dd3fc"
        />
        <path d="M87.5 81.5 l4 4.5 l7.5 -9" stroke="#fff" strokeWidth={3.5} fill="none" />
      </g>
    ),
  },
  "key-cipher": {
    front: (
      <g stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x={88.8} y={78} width={4.4} height={17} rx={2} fill="#fbbf24" />
        <path d="M93.2 87.5 h4 M93.2 92 h3" fill="none" />
        <circle cx={91} cy={73} r={6} fill="#fbbf24" />
        <circle cx={91} cy={73} r={2.4} fill="#fffbeb" strokeWidth={2} />
      </g>
    ),
  },
  "gloves-engineer": {
    front: (
      <g stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={84.5} cy={83} r={4} fill="#94a3b8" />
        <rect x={85} y={73} width={15} height={14} rx={6.5} fill="#94a3b8" />
        <path d="M89 78 h7" stroke="#e2e8f0" strokeWidth={2} fill="none" />
        <rect x={86.5} y={87} width={12} height={6} rx={2} fill="#475569" />
      </g>
    ),
  },

  // ---- badge（胸元） ----------------------------------------------------------
  "badge-decision": {
    front: (
      <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
        <circle cx={51} cy={73} r={5.8} fill="#fbbf24" />
        <path d="M51 68.8 L52.8 73 L51 77.2 L49.2 73 Z" fill={INK} stroke="none" />
      </g>
    ),
  },
  "badge-coordination": {
    front: (
      <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
        <circle cx={51} cy={73} r={5.8} fill="#34d399" />
        <path
          d="M47.8 71.3 H54.2 M52.6 69.7 L54.2 71.3 L52.6 72.9"
          stroke="#fff"
          strokeWidth={1.7}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M54.2 75 H47.8 M49.4 73.4 L47.8 75 L49.4 76.6"
          stroke="#fff"
          strokeWidth={1.7}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    ),
  },

  // ---- background -------------------------------------------------------------
  "bg-study-room": {
    back: (
      <g>
        <rect x={3} y={3} width={114} height={114} rx={14} fill="#fdf3e3" />
        <path d="M8 98 H112" stroke="#e7d3b0" strokeWidth={3} strokeLinecap="round" />
        <rect x={11} y={13} width={28} height={22} rx={3} fill="#dbeafe" stroke="#b8c9e8" strokeWidth={2.5} />
        <path d="M25 13 V35 M11 24 H39" stroke="#b8c9e8" strokeWidth={2} />
        <circle cx={102} cy={20} r={6.5} fill="#fff" stroke="#d9c39a" strokeWidth={2.5} />
        <path d="M102 20 V16.5 M102 20 H105" stroke="#d9c39a" strokeWidth={2} strokeLinecap="round" />
        <g stroke={INK} strokeWidth={2} strokeLinejoin="round">
          <rect x={12} y={92} width={16} height={5} rx={1.5} fill="#818cf8" />
          <rect x={13.5} y={87} width={13} height={5} rx={1.5} fill="#fbbf24" />
          <rect x={15} y={82} width={11} height={5} rx={1.5} fill="#2dd4bf" />
        </g>
      </g>
    ),
  },
  "bg-checkpoint": {
    back: (
      <g>
        <rect x={3} y={3} width={114} height={114} rx={14} fill="#312e81" />
        <path d="M6 98 L26 70 L46 98 Z" fill="#3f3ca6" />
        <path d="M72 98 L94 64 L114 96 V98 Z" fill="#3f3ca6" />
        <path d="M8 98 H112" stroke="#4c4ab8" strokeWidth={3} strokeLinecap="round" />
        <path
          d="M18 110 Q35 94 60 102 Q88 110 100 88"
          stroke="#818cf8"
          strokeWidth={3.5}
          strokeDasharray="0.1 8"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M100 88 V70" stroke="#c7d2fe" strokeWidth={3} strokeLinecap="round" />
        <path d="M100 70 L112 74 L100 78 Z" fill="#f43f5e" />
        <g fill="#c7d2fe">
          <circle cx={16} cy={16} r={1.4} />
          <circle cx={34} cy={10} r={1.4} />
          <circle cx={88} cy={12} r={1.4} />
          <circle cx={106} cy={26} r={1.4} />
          <circle cx={12} cy={40} r={1.4} />
        </g>
      </g>
    ),
  },
  "bg-goal": {
    back: (
      <g>
        <rect x={3} y={3} width={114} height={114} rx={14} fill="#fff7e6" />
        <circle cx={60} cy={38} r={26} fill="#fde68a" opacity={0.9} />
        <g stroke="#f59e0b" strokeWidth={3} strokeLinecap="round">
          <path d="M60 6 v7 M31 12 l5 5 M89 12 l-5 5 M22 38 h8 M98 38 h-8 M36 64 l4 -4 M84 64 l-4 -4" />
        </g>
        <path d="M8 100 H112" stroke="#fcd34d" strokeWidth={3} strokeLinecap="round" />
        <circle cx={14} cy={88} r={2} fill="#f43f5e" />
        <circle cx={104} cy={80} r={2} fill="#818cf8" />
        <circle cx={18} cy={66} r={2} fill="#2dd4bf" />
        <circle cx={102} cy={100} r={2} fill="#fbbf24" />
      </g>
    ),
  },

  // ---- effect -------------------------------------------------------------------
  "aura-focus": {
    back: (
      <g fill="none">
        <ellipse cx={60} cy={68} rx={29} ry={37} fill="rgba(45,212,191,0.12)" />
        <ellipse
          cx={60}
          cy={68}
          rx={36}
          ry={44}
          stroke="#2dd4bf"
          strokeWidth={2.5}
          strokeDasharray="7 7"
          strokeLinecap="round"
          opacity={0.9}
        />
      </g>
    ),
  },
  "effect-breakthrough": {
    front: (
      <g fill="none" strokeLinecap="round">
        <g stroke="#f59e0b" strokeWidth={3}>
          <path d="M14 26 l7 7 M106 26 l-7 7 M10 68 h9 M110 68 h-9 M18 104 l7 -7 M102 104 l-7 -7" />
        </g>
        <g stroke="#fbbf24" strokeWidth={2.5}>
          <path d="M30 12 v8 M26 16 h8" />
          <path d="M92 10 v8 M88 14 h8" />
          <path d="M104 46 v7 M100.5 49.5 h7" />
          <path d="M16 48 v7 M12.5 51.5 h7" />
        </g>
      </g>
    ),
  },
};
