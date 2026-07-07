"use client";

import { useEffect, useState } from "react";
import type { PhaseProgress, StudyPhaseId } from "@/types/plan";
import { STUDY_PHASES } from "@/lib/studyPlanner";

// 「霧が晴れる」演出の既視管理キー（表示専用のビューステート。AppState 外なので
// 端末間マージ不要。踏破済み＝雲が無い状態を一度見たフェーズの id を持つ）。
const SEEN_REVEALED_KEY = "fequest:seenRevealedPhases";

function readSeenRevealed(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_REVEALED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

// 合格までのロードマップを「ファンタジーRPGの冒険地図」で見せるコンポーネント。
// - データは buildCheckpointRoadmap（CP進行由来の PhaseProgress[]）＋ STUDY_PHASES の静的メタを使う。
// - expectedPhaseId を渡すと「📍 予定ではこのあたり」の控えめなマーカーを出す。
// - 海に囲まれた縦長の島（viewBox 0 0 100 130）を、南の「旅立ちの村」から
//   北の「合格の城」へ街道がつづら折りに登っていく構図。
//   コンテナは aspect-[100/130] で viewBox と比率を一致させ、
//   SVG 地形・道と HTML ピン（%配置）の座標系を確実に重ねる。
// - 各フェーズは「土地」（村・丘・森・平原・沼・峡谷・関所・城）として描き、
//   地形（山脈・森・湖と川・港と船・コンパス・波）はすべて SVG 描画。
// - 未踏（upcoming）の土地は雲＝霧で覆い、進むと晴れる。
//   街道は踏破済み＝実線、未踏＝足あとの点線。
// - ピンをタップすると下から詳細シートが出る（文字はマップに詰め込まない方針）。

type NodeKind = "phase" | "goal";

type MapNode = {
  key: string;
  kind: NodeKind;
  emoji: string;
  /** マップ上の地名（ファンタジー風） */
  place: string;
  /** フェーズの正式名（詳細シートで表示） */
  title: string;
  summary: string;
  detail: string;
  checkpoints: string[];
  completionGoal: string;
  status: PhaseProgress["status"] | "goal";
  progress: number;
  hint: string;
  /** ステージ番号（1始まり。ゴールは0で未使用） */
  stage: number;
  x: number; // viewBox単位 (0..100)
  y: number; // viewBox単位 (0..130)
};

const VB_W = 100;
const VB_H = 130;

// 7フェーズ＋ゴールの計8ノード。南の港町から北の城へ、街道がつづら折りに登る。
const POSITIONS: { x: number; y: number }[] = [
  { x: 24, y: 107 }, // phase0 旅立ちの村（南の港）
  { x: 62, y: 99 }, // phase1 見晴らしの丘
  { x: 28, y: 85 }, // phase2 賢者の森
  { x: 69, y: 72 }, // phase3 修練の平原
  { x: 29, y: 59 }, // phase4 霧の沼
  { x: 68, y: 45 }, // phase5 試練の峡谷
  { x: 35, y: 31 }, // phase6 最後の関所
  { x: 57, y: 22 }, // goal 合格の城（北の山頂・城門前）
];

// フェーズ→マップ上の地名。フェーズ定義（studyPlanner）は学習の言葉のまま、
// 地図の世界観だけここで持つ。
const PLACES: Record<StudyPhaseId, string> = {
  phase0: "旅立ちの村",
  phase1: "見晴らしの丘",
  phase2: "賢者の森",
  phase3: "修練の平原",
  phase4: "霧の沼",
  phase5: "試練の峡谷",
  phase6: "最後の関所",
};

const GOAL_PLACE = "合格の城";

const STATUS_LABEL: Record<string, string> = {
  done: "クリア済み",
  current: "いまここ",
  upcoming: "これから",
  goal: "ゴール",
};

// 島の海岸線。ここを基準に clipPath で地形を島内に収める。
const COAST =
  "M 30 8 C 45 3, 62 4, 74 9 C 84 13, 90 22, 89 31 C 88 38, 94 44, 93 52 " +
  "C 92 60, 86 64, 88 72 C 90 80, 95 86, 92 94 C 89 102, 83 104, 81 110 " +
  "C 79 116, 70 120, 60 118.5 C 51 117, 46 121, 37 119 C 29 117, 28 112, 21 109 " +
  "C 14 106, 9 100, 11 93 C 13 86, 6 79, 9 71 C 12 63, 7 56, 10 48 " +
  "C 13 40, 9 32, 15 24 C 20 17, 22 12, 30 8 Z";

function buildNodes(phases: PhaseProgress[]): MapNode[] {
  const phaseNodes: MapNode[] = phases.map((p, i) => {
    const def = STUDY_PHASES.find((d) => d.id === p.id)!;
    const pos = POSITIONS[i] ?? { x: 50, y: 65 };
    return {
      key: p.id,
      kind: "phase",
      emoji: def.emoji,
      place: PLACES[p.id] ?? def.title,
      title: def.title,
      summary: def.summary,
      detail: def.detail,
      checkpoints: def.checkpoints,
      completionGoal: def.completionGoal,
      status: p.status,
      progress: p.progress,
      hint: p.hint,
      stage: i + 1,
      ...pos,
    };
  });

  const allDone = phases.every((p) => p.status === "done");
  const goalPos = POSITIONS[phaseNodes.length] ?? { x: 57, y: 22 };
  const goal: MapNode = {
    key: "goal",
    kind: "goal",
    emoji: "🎓",
    place: GOAL_PLACE,
    title: "合格",
    summary: "ここまで来たら本番。積み上げてきた力を出し切りましょう。",
    detail:
      "ロードマップの最後は、学んだ知識を本番で落ち着いて使う段階です。知らない問題が出ても焦らず、取れる問題を確実に取り、迷う問題は後回しにして全体の時間を守ります。",
    checkpoints: [
      "最初から完璧に解こうとせず、解ける問題を先に進める",
      "迷った問題には印をつけ、最後に戻る",
      "直前に見直した頻出テーマと誤答パターンを思い出す",
    ],
    completionGoal:
      "これまで積み上げた学習を、試験時間内で落ち着いて発揮することがゴールです。",
    status: "goal",
    progress: allDone ? 100 : 0,
    hint: "",
    stage: 0,
    ...goalPos,
  };

  return [...phaseNodes, goal];
}

type Pt = { x: number; y: number };

// Catmull-Rom → 3次ベジェ変換で、全ノードを通るなめらかな一本道を作る。
// 全体パスと区間パスで同じ制御点を使うので、進捗の上書き描画がピッタリ重なる。
function bezierSegment(p0: Pt, p1: Pt, p2: Pt, p3: Pt): string {
  const c1x = p1.x + (p2.x - p0.x) / 6;
  const c1y = p1.y + (p2.y - p0.y) / 6;
  const c2x = p2.x - (p3.x - p1.x) / 6;
  const c2y = p2.y - (p3.y - p1.y) / 6;
  return `C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
}

function fullPath(pts: Pt[]): string {
  const segs = pts
    .slice(0, -1)
    .map((_, i) =>
      bezierSegment(pts[i - 1] ?? pts[i], pts[i], pts[i + 1], pts[i + 2] ?? pts[i + 1]),
    );
  return `M ${pts[0].x} ${pts[0].y} ${segs.join(" ")}`;
}

// ノード間に「交互に逆側へ膨らむ」中間ウェイポイントを挟み、
// 直線の連続でなく山道らしく蛇行する点列にする。
// 点列は [node0, mid, node1, mid, node2, ...] の並びになるので、
// ノード区間 i は点インデックス 2i〜2i+2（ベジェ2本）に対応する。
function roadPoints(nodes: Pt[]): Pt[] {
  const pts: Pt[] = [];
  nodes.forEach((n, i) => {
    if (i > 0) {
      const a = nodes[i - 1];
      const dx = n.x - a.x;
      const dy = n.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const amp = (i % 2 === 0 ? 1 : -1) * Math.min(3.5, len * 0.12);
      pts.push({
        x: (a.x + n.x) / 2 + (-dy / len) * amp,
        y: (a.y + n.y) / 2 + (dx / len) * amp,
      });
    }
    pts.push(n);
  });
  return pts;
}

// ノード区間 i（ノードi→ノードi+1）の道パス。fullPath と同じ制御点を使うので
// 進捗の上書き描画がピッタリ重なる。
function nodeSegmentPath(pts: Pt[], i: number): string {
  const j = i * 2;
  const seg1 = bezierSegment(pts[j - 1] ?? pts[j], pts[j], pts[j + 1], pts[j + 2]);
  const seg2 = bezierSegment(pts[j], pts[j + 1], pts[j + 2], pts[j + 3] ?? pts[j + 2]);
  return `M ${pts[j].x} ${pts[j].y} ${seg1} ${seg2}`;
}

// ---- 地形パーツ ----

// 針葉樹（幹＋二段の葉）
function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0.3" cy="2.4" rx="1.6" ry="0.5" fill="#166534" opacity="0.18" />
      <rect x="-0.35" y="1.4" width="0.7" height="1.1" rx="0.2" fill="#92400e" />
      <path d="M0 -2.1 L1.5 0.5 L-1.5 0.5 Z" fill="#16a34a" />
      <path d="M0 -0.7 L1.9 1.6 L-1.9 1.6 Z" fill="#15803d" />
    </g>
  );
}

// 雪をかぶった山
function Mountain({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-5 4 L0 -4 L5 4 Z" fill="#78716c" />
      <path d="M-5 4 L0 -4 L1.2 2 L-1 4 Z" fill="#a8a29e" />
      <path d="M-1.5 -1.6 L0 -4 L1.5 -1.6 L0.8 -0.9 L0 -1.7 L-0.8 -0.9 Z" fill="#fafaf9" />
    </g>
  );
}

// 民家（壁＋三角屋根）
function House({ x, y, s = 1, roof = "#dc2626" }: { x: number; y: number; s?: number; roof?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-1.3" y="-0.4" width="2.6" height="1.8" fill="#fef3c7" stroke="#92400e" strokeWidth="0.18" />
      <path d="M-1.7 -0.4 L0 -1.9 L1.7 -0.4 Z" fill={roof} />
      <rect x="-0.35" y="0.5" width="0.7" height="0.9" fill="#92400e" />
    </g>
  );
}

// 未踏の土地を隠す雲（霧）
function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#f8fafc">
      <ellipse cx="-4.5" cy="0.5" rx="4.5" ry="2.4" opacity="0.65" />
      <ellipse cx="0.5" cy="-1" rx="5.5" ry="3" opacity="0.7" />
      <ellipse cx="5" cy="0.8" rx="4.2" ry="2.2" opacity="0.65" />
      <ellipse cx="0" cy="1.4" rx="7.5" ry="2" opacity="0.5" />
    </g>
  );
}

// 波（海の飾り）
function Wave({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M ${x} ${y} q 1.5 -0.8 3 0 t 3 0`}
      fill="none"
      stroke="#e0f2fe"
      strokeWidth="0.4"
      strokeLinecap="round"
      opacity="0.7"
    />
  );
}

export default function RoadmapMap({
  phases,
  expectedPhaseId = null,
}: {
  phases: PhaseProgress[];
  /** 時間軸から見た「予定ではこのあたり」のフェーズ。現在地と同じなら表示しない。 */
  expectedPhaseId?: StudyPhaseId | null;
}) {
  const [selected, setSelected] = useState<MapNode | null>(null);
  // 前回見たときから新たに「霧が晴れた」（upcoming でなくなった）フェーズ。
  // 該当ノードには消えていく雲、その区間の街道には伸びる線のアニメを1回だけ流す。
  const [clearingKeys, setClearingKeys] = useState<string[]>([]);
  const nodes = buildNodes(phases);
  const road = roadPoints(nodes);
  const roadFull = fullPath(road);

  const revealedIds = phases
    .filter((p) => p.status !== "upcoming")
    .map((p) => p.id as string);
  const revealedSig = revealedIds.join(",");
  useEffect(() => {
    const seen = readSeenRevealed();
    const revealed = revealedSig ? revealedSig.split(",") : [];
    const newly = revealed.filter((k) => !seen.includes(k));
    try {
      localStorage.setItem(SEEN_REVEALED_KEY, JSON.stringify(revealed));
    } catch {
      // localStorage が使えなくても演出をスキップするだけ
    }
    // 初回訪問（seen が空）は「晴れる瞬間」ではないので演出しない。
    // localStorage（外部システム）との照合結果を1回だけ反映する意図的な setState。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (seen.length > 0 && newly.length > 0) setClearingKeys(newly);
  }, [revealedSig]);

  return (
    <div>
      <div className="relative mx-auto aspect-[100/130] w-full max-w-md overflow-hidden rounded-3xl shadow-inner ring-2 ring-amber-900/40 md:max-w-lg">
        {/* 地形・道（SVG）。コンテナと同比率なのでピン(%)とズレない */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          aria-hidden
        >
          <defs>
            <linearGradient id="rm-sea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7dd3fc" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="rm-land" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d1fae5" />
              <stop offset="0.25" stopColor="#bef264" />
              <stop offset="1" stopColor="#86efac" />
            </linearGradient>
            <clipPath id="rm-island">
              <path d={COAST} />
            </clipPath>
          </defs>

          {/* --- 海 --- */}
          <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#rm-sea)" />
          <Wave x={3} y={30} />
          <Wave x={4} y={62} />
          <Wave x={5} y={90} />
          <Wave x={14} y={126} />
          <Wave x={42} y={125.5} />
          <Wave x={72} y={124} />
          <Wave x={93} y={112} />
          <Wave x={96} y={70} />
          <Wave x={92} y={8} />
          {/* カモメ */}
          <g fill="none" stroke="#f8fafc" strokeWidth="0.35" strokeLinecap="round" opacity="0.9">
            <path d="M 79 5 q 1 -1 2 0 q 1 -1 2 0" />
            <path d="M 85 8.5 q 0.8 -0.8 1.6 0 q 0.8 -0.8 1.6 0" />
          </g>

          {/* 航路（南の海から旅立ちの村の港へ） */}
          <path
            d="M 93 126 C 65 121, 38 129, 19 114"
            fill="none"
            stroke="#f0f9ff"
            strokeWidth="0.5"
            strokeDasharray="1.4 1.6"
            strokeLinecap="round"
            opacity="0.8"
          />
          {/* 帆船 */}
          <g transform="translate(12 121.5)">
            <path d="M-2.6 0.6 Q0 2 2.6 0.6 L2.2 -0.2 L-2.2 -0.2 Z" fill="#92400e" />
            <rect x="-0.15" y="-3.4" width="0.3" height="3.2" fill="#78350f" />
            <path d="M0.15 -3.2 Q2.4 -2 0.15 -0.5 Z" fill="#fef9c3" />
            <path d="M-0.15 -3 Q-1.8 -2 -0.15 -0.7 Z" fill="#fde68a" />
            <path d="M0 -3.4 L1.1 -3.1 L0 -2.8 Z" fill="#dc2626" />
          </g>

          {/* --- 島 --- */}
          {/* 島影（深み） */}
          <path d={COAST} transform="translate(1 1.6)" fill="#0369a1" opacity="0.25" />
          {/* 砂浜のふち → 陸地 */}
          <path d={COAST} fill="#fde68a" stroke="#fef3c7" strokeWidth="1.6" />
          <path d={COAST} transform="translate(0 -0.4) scale(1)" fill="url(#rm-land)" strokeWidth="0" opacity="0.98" />
          <path d={COAST} fill="none" stroke="#b45309" strokeWidth="0.35" opacity="0.35" />

          {/* --- 島の中の地形（海岸線でクリップ） --- */}
          <g clipPath="url(#rm-island)">
            {/* 北部の岩地（山岳地帯の土台） */}
            <path d="M 8 30 Q 30 18 55 24 Q 80 30 95 22 L 95 4 L 8 4 Z" fill="#d6d3d1" opacity="0.5" />

            {/* 賢者の森の下草 */}
            <ellipse cx="28" cy="87" rx="17" ry="8.5" fill="#22c55e" opacity="0.28" />
            {/* 霧の沼の湿地 */}
            <ellipse cx="29" cy="60" rx="13" ry="7" fill="#2dd4bf" opacity="0.3" />
            <ellipse cx="25" cy="62" rx="3.4" ry="1.4" fill="#0d9488" opacity="0.55" />
            <ellipse cx="34" cy="58" rx="2.6" ry="1.1" fill="#0d9488" opacity="0.5" />
            {/* 試練の峡谷の荒野 */}
            <ellipse cx="72" cy="45" rx="14" ry="7.5" fill="#fde68a" opacity="0.9" />
            <ellipse cx="72" cy="45" rx="14" ry="7.5" fill="#f59e0b" opacity="0.15" />
            {/* 見晴らしの丘 */}
            <path d="M 52 103 q 5.5 -5.5 11 0 Z" fill="#a3e635" opacity="0.8" />
            <path d="M 60 102 q 4.5 -4.5 9 0 Z" fill="#84cc16" opacity="0.6" />

            {/* 川と湖（西の山から海へ） */}
            <path
              d="M 16 36 C 13 41, 17 45, 14.5 49"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
            <ellipse cx="14" cy="52" rx="5" ry="2.6" fill="#38bdf8" />
            <ellipse cx="14" cy="51.6" rx="3.4" ry="1.5" fill="#7dd3fc" opacity="0.8" />
            <path
              d="M 13 54 C 11 60, 13 65, 9 71"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.2"
              strokeLinecap="round"
            />

            {/* 北の山脈（城の左右） */}
            <Mountain x={40} y={21} s={1.1} />
            <Mountain x={46} y={17} s={0.85} />
            <Mountain x={70} y={19} s={1.15} />
            <Mountain x={77} y={23} s={0.9} />
            <Mountain x={84} y={28} s={0.7} />
            <Mountain x={25} y={27} s={0.8} />
            {/* 峡谷の岩山 */}
            <Mountain x={81} y={40} s={0.65} />
            <path d="M 62 41 h 2.2 l 0.5 3.4 h -3.2 Z" fill="#d97706" opacity="0.8" />
            <path d="M 77 49 h 1.8 l 0.4 2.8 h -2.6 Z" fill="#b45309" opacity="0.7" />

            {/* 賢者の森の木々 */}
            <Tree x={17} y={82} s={1} />
            <Tree x={23} y={90} s={1.2} />
            <Tree x={33} y={80} s={0.9} />
            <Tree x={39} y={88} s={1.05} />
            <Tree x={30} y={93} s={0.85} />
            <Tree x={15} y={91} s={0.8} />
            <Tree x={40} y={95} s={0.7} />
            <Tree x={21} y={77} s={0.75} />
            {/* 点在する木 */}
            <Tree x={52} y={88} s={0.7} />
            <Tree x={75} y={91} s={0.8} />
            <Tree x={81} y={80} s={0.7} />
            <Tree x={49} y={66} s={0.7} />
            <Tree x={18} y={68} s={0.65} />
            <Tree x={55} y={33} s={0.65} />
            <Tree x={73} y={62} s={0.7} />

            {/* 沼の葦 */}
            <g stroke="#0f766e" strokeWidth="0.3" strokeLinecap="round" opacity="0.7">
              <path d="M 22 58 v -1.8 M 22.8 58 v -1.3 M 23.6 58 v -1.7" />
              <path d="M 36 61 v -1.6 M 36.8 61 v -1.2 M 37.6 61 v -1.8" />
            </g>

            {/* 修練の平原（野営地：テント・旗・的） */}
            <g transform="translate(75 69)">
              <path d="M-2 1.6 L0 -1.6 L2 1.6 Z" fill="#fb7185" />
              <path d="M-0.5 1.6 L0 -1.6 L0.5 1.6 Z" fill="#fecdd3" />
            </g>
            <g transform="translate(79.5 73)">
              <path d="M-1.7 1.4 L0 -1.3 L1.7 1.4 Z" fill="#60a5fa" />
              <path d="M-0.4 1.4 L0 -1.3 L0.4 1.4 Z" fill="#bfdbfe" />
            </g>
            <g transform="translate(63 77.5)">
              <rect x="-0.12" y="-3" width="0.24" height="3" fill="#78350f" />
              <path d="M0.1 -3 L2 -2.4 L0.1 -1.8 Z" fill="#ef4444" />
            </g>

            {/* 旅立ちの村（民家） */}
            <House x={19} y={104.5} s={1} />
            <House x={26.5} y={103} s={0.9} roof="#d97706" />
            <House x={29} y={109} s={0.85} roof="#dc2626" />
            {/* 桟橋 */}
            <path d="M 21 110 L 16.5 115" stroke="#a16207" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M 21 110 L 16.5 115" stroke="#facc15" strokeWidth="0.5" strokeLinecap="round" opacity="0.6" />

            {/* 最後の関所（門） */}
            <g transform="translate(35 27.5)">
              <rect x="-3.2" y="-1.2" width="1.1" height="3.4" fill="#78350f" />
              <rect x="2.1" y="-1.2" width="1.1" height="3.4" fill="#78350f" />
              <rect x="-3.8" y="-2.2" width="7.6" height="1.2" rx="0.3" fill="#92400e" />
              <path d="M-3.4 -2.2 L-3.4 -3 L-2.2 -2.6 Z" fill="#dc2626" />
              <path d="M3.4 -2.2 L3.4 -3 L2.2 -2.6 Z" fill="#dc2626" />
            </g>

            {/* 合格の城（山頂の城）。ゴールピンは城門前（y=22）に置き、城本体を隠さない */}
            <g transform="translate(57 11) scale(0.9)">
              {/* 城山 */}
              <path d="M-9 9 L0 -3 L9 9 Z" fill="#a8a29e" opacity="0.9" />
              <path d="M-9 9 L0 -3 L2 4 L-2.5 9 Z" fill="#bfb7ae" opacity="0.9" />
              {/* 城壁と塔 */}
              <rect x="-4.2" y="-1.2" width="8.4" height="4.6" fill="#f5f5f4" stroke="#78716c" strokeWidth="0.25" />
              <rect x="-5.6" y="-3.2" width="2.6" height="6.6" fill="#fafaf9" stroke="#78716c" strokeWidth="0.25" />
              <rect x="3" y="-3.2" width="2.6" height="6.6" fill="#fafaf9" stroke="#78716c" strokeWidth="0.25" />
              <path d="M-5.9 -3.2 L-4.3 -5.6 L-2.7 -3.2 Z" fill="#6366f1" />
              <path d="M2.7 -3.2 L4.3 -5.6 L5.9 -3.2 Z" fill="#6366f1" />
              {/* 中央塔 */}
              <rect x="-1.4" y="-4.4" width="2.8" height="3.4" fill="#fafaf9" stroke="#78716c" strokeWidth="0.25" />
              <path d="M-1.8 -4.4 L0 -7 L1.8 -4.4 Z" fill="#4f46e5" />
              {/* 旗 */}
              <rect x="-0.08" y="-9.2" width="0.16" height="2.2" fill="#78350f" />
              <path d="M0.08 -9.2 L1.7 -8.7 L0.08 -8.2 Z" fill="#f59e0b" />
              {/* 城門 */}
              <path d="M-0.9 3.4 h 1.8 v -1.6 a 0.9 0.9 0 0 0 -1.8 0 Z" fill="#78350f" />
              {/* 狭間（城壁上部） */}
              <g fill="#f5f5f4" stroke="#78716c" strokeWidth="0.2">
                <rect x="-4.2" y="-1.9" width="1.1" height="0.7" />
                <rect x="-2.2" y="-1.9" width="1.1" height="0.7" />
                <rect x="-0.2" y="-1.9" width="1.1" height="0.7" />
                <rect x="1.8" y="-1.9" width="1.1" height="0.7" />
              </g>
            </g>

            {/* 未踏の土地は雲（霧）で覆う。進むと晴れる。
                現在地の次の土地だけ雲を薄くして「先が少し見える」ようにする（目標勾配） */}
            {(() => {
              const upcoming = nodes.filter(
                (n) => n.kind === "phase" && n.status === "upcoming",
              );
              const firstUpcomingKey = upcoming[0]?.key;
              return upcoming.map((n) => (
                <g
                  key={`cloud-${n.key}`}
                  opacity={n.key === firstUpcomingKey ? 0.55 : 1}
                >
                  <Cloud x={n.x} y={n.y - 1} s={1.15} />
                </g>
              ));
            })()}
            {/* 新たに踏み込んだ土地の雲は、ふわっと晴れる演出を1回だけ再生 */}
            {nodes
              .filter((n) => n.kind === "phase" && clearingKeys.includes(n.key))
              .map((n) => (
                <g key={`clearing-${n.key}`} className="fog-clearing">
                  <Cloud x={n.x} y={n.y - 1} s={1.15} />
                </g>
              ))}
          </g>

          {/* --- 街道 --- */}
          {/* ふち取り→土の道床の2層で「街道」に見せる */}
          <path
            d={roadFull}
            fill="none"
            stroke="#92400e"
            strokeWidth="3.4"
            strokeLinecap="round"
            opacity="0.35"
          />
          <path
            d={roadFull}
            fill="none"
            stroke="#fcd34d"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* 進捗の上書き: 踏破済みは実線、これからは足あとの点線。
              新たに踏破した区間は「道が伸びる」線描画アニメを1回だけ流す */}
          {nodes.slice(0, -1).map((n, i) => {
            const traveled = n.status === "done";
            const drawing =
              traveled && clearingKeys.includes(nodes[i + 1]?.key ?? "");
            return (
              <path
                key={n.key}
                d={nodeSegmentPath(road, i)}
                fill="none"
                stroke={traveled ? "#d97706" : "#78350f"}
                strokeWidth={traveled ? 1.3 : 0.9}
                strokeLinecap="round"
                strokeOpacity={traveled ? 0.95 : 0.5}
                {...(drawing
                  ? { pathLength: 1, className: "path-draw" }
                  : { strokeDasharray: traveled ? "0" : "0.1 2.2" })}
              />
            );
          })}

          {/* コンパス（南東の海上） */}
          <g transform="translate(90 121)" opacity="0.95">
            <circle r="4.6" fill="#fffbeb" stroke="#b45309" strokeWidth="0.4" />
            <circle r="3.6" fill="none" stroke="#d6a15e" strokeWidth="0.25" />
            <path d="M0 -3.4 L1 0 L0 3.4 L-1 0 Z" fill="#b45309" />
            <path d="M-3.4 0 L0 -1 L3.4 0 L0 1 Z" fill="#e7bd8a" />
            <circle r="0.6" fill="#fffbeb" stroke="#b45309" strokeWidth="0.25" />
            <text
              y="-5.4"
              textAnchor="middle"
              fontSize="2.6"
              fontWeight="bold"
              fill="#fffbeb"
            >
              N
            </text>
          </g>

          {/* 地図タイトルの巻物リボン（北西の海上） */}
          <g transform="translate(17.5 7)">
            <path
              d="M-13.5 -2.6 h 27 l -1.6 2.6 l 1.6 2.6 h -27 l 1.6 -2.6 Z"
              fill="#fffbeb"
              stroke="#b45309"
              strokeWidth="0.4"
            />
            <text
              y="1.1"
              textAnchor="middle"
              fontSize="3"
              fontWeight="bold"
              fill="#92400e"
            >
              合格への冒険地図
            </text>
          </g>

          {/* 額縁（古地図の内枠） */}
          <rect
            x="1.6"
            y="1.6"
            width={VB_W - 3.2}
            height={VB_H - 3.2}
            rx="4"
            fill="none"
            stroke="#fffbeb"
            strokeWidth="0.5"
            opacity="0.65"
          />
          <rect
            x="2.8"
            y="2.8"
            width={VB_W - 5.6}
            height={VB_H - 5.6}
            rx="3.2"
            fill="none"
            stroke="#92400e"
            strokeWidth="0.3"
            opacity="0.3"
          />
        </svg>

        {/* チェックポイント（ピン） */}
        {nodes.map((n, i) => {
          const isCurrent = n.status === "current";
          const isDone = n.status === "done";
          const isGoal = n.kind === "goal";
          // 全フェーズに足を踏み入れたら（未踏ゼロ）、ゴールの城が光って呼ぶ
          const goalNear =
            isGoal && phases.every((p) => p.status !== "upcoming");

          const circleCls = isGoal
            ? "bg-gradient-to-b from-amber-300 to-amber-500 ring-white"
            : isDone
              ? "bg-gradient-to-b from-emerald-400 to-emerald-600 ring-white"
              : isCurrent
                ? "bg-gradient-to-b from-indigo-500 to-indigo-700 ring-white"
                : "bg-stone-100/90 ring-stone-500/30";

          return (
            <button
              key={n.key}
              type="button"
              onClick={() => setSelected(n)}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{
                top: `${(n.y / VB_H) * 100}%`,
                left: `${(n.x / VB_W) * 100}%`,
              }}
              aria-label={`${n.place}・${n.title}（${STATUS_LABEL[n.status]}）`}
            >
              {isCurrent && (
                <span className="absolute -top-5 animate-bounce whitespace-nowrap rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow motion-reduce:animate-none">
                  いまここ
                </span>
              )}
              {/* 期待位置マーカー（「いまここ」より控えめ・非アニメーション） */}
              {!isCurrent && n.key === expectedPhaseId && (
                <span className="absolute -top-5 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 shadow ring-1 ring-amber-300">
                  📍 予定ではこのあたり
                </span>
              )}
              <span className="relative">
                {isCurrent && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-60 motion-reduce:animate-none" />
                )}
                <span
                  className={`relative flex items-center justify-center rounded-full shadow-md ring-[3px] transition active:scale-95 ${circleCls} ${
                    isGoal ? "h-11 w-11 text-xl" : "h-10 w-10 text-lg"
                  } ${isCurrent ? "scale-110" : ""}${goalNear ? " animate-glow-ring" : ""}`}
                >
                  <span
                    className={n.status === "upcoming" ? "opacity-55 grayscale" : ""}
                    aria-hidden
                  >
                    {n.emoji}
                  </span>
                  {/* ステージ番号（ゴール以外） */}
                  {!isGoal && (
                    <span
                      className={`absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold ring-1 ring-white ${
                        isDone
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                            ? "bg-indigo-600 text-white"
                            : "bg-amber-900/70 text-amber-50"
                      }`}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                  )}
                  {/* クリア済みバッジ */}
                  {isDone && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] text-emerald-600 shadow ring-1 ring-emerald-200"
                      aria-hidden
                    >
                      ✓
                    </span>
                  )}
                </span>
              </span>
              <span
                className={`mt-1 max-w-[92px] rounded-full px-2 py-0.5 text-center text-[10px] font-bold leading-tight shadow-sm ring-1 backdrop-blur-[1px] ${
                  isCurrent
                    ? "bg-indigo-50/95 text-indigo-700 ring-indigo-200"
                    : isGoal
                      ? "bg-amber-50/95 text-amber-700 ring-amber-300"
                      : isDone
                        ? "bg-emerald-50/95 text-emerald-700 ring-emerald-200"
                        : "bg-white/85 text-stone-500 ring-stone-300/60"
                }`}
              >
                {n.place}
              </span>
              {/* いま挑戦中のフェーズは達成度ミニバーを常時表示 */}
              {isCurrent && (
                <span className="mt-0.5 h-1 w-12 overflow-hidden rounded-full bg-white/80 shadow-inner">
                  <span
                    className="block h-full rounded-full bg-indigo-500"
                    style={{ width: `${n.progress}%` }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-center text-xs text-gray-400">
        地図の場所をタップすると詳細が見られます
      </p>

      {/* 詳細シート */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[86vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-xl md:max-h-[80vh] md:rounded-3xl md:pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200 md:hidden" />
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                {selected.emoji}
              </span>
              <div>
                <p className="text-lg font-extrabold text-gray-800">
                  {selected.place}
                </p>
                <p className="text-xs font-semibold text-gray-400">
                  {selected.kind === "goal"
                    ? "最終目的地"
                    : `ステージ${selected.stage}`}
                  ・{selected.title}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                    selected.status === "done"
                      ? "bg-emerald-100 text-emerald-700"
                      : selected.status === "current"
                        ? "bg-indigo-100 text-indigo-700"
                        : selected.status === "goal"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {STATUS_LABEL[selected.status]}
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              {selected.summary}
            </p>

            <div className="mt-4 rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-bold text-gray-400">
                この段階でやること
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">
                {selected.detail}
              </p>
            </div>

            {selected.checkpoints.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-gray-400">
                  意識するポイント
                </p>
                <ul className="mt-2 space-y-2">
                  {selected.checkpoints.map((checkpoint) => (
                    <li
                      key={checkpoint}
                      className="flex gap-2 text-sm leading-relaxed text-gray-700"
                    >
                      <span
                        aria-hidden
                        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600"
                      >
                        ✓
                      </span>
                      <span>{checkpoint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.completionGoal && (
              <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold leading-relaxed text-emerald-700">
                次へ進む目安：{selected.completionGoal}
              </p>
            )}

            {(selected.status === "done" || selected.status === "current") && (
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs font-semibold text-gray-500">
                  <span>達成度</span>
                  <span>{selected.progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full ${
                      selected.status === "done"
                        ? "bg-emerald-400"
                        : "bg-indigo-500"
                    }`}
                    style={{ width: `${selected.progress}%` }}
                  />
                </div>
              </div>
            )}

            {selected.status === "current" && selected.hint && (
              <p className="mt-4 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700">
                👉 {selected.hint}
              </p>
            )}

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-6 w-full rounded-2xl bg-gray-800 py-3 text-sm font-bold text-white active:scale-[0.99]"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
