"use client";

import { useState } from "react";
import type { PhaseProgress } from "@/types/plan";
import { STUDY_PHASES } from "@/lib/studyPlanner";

// 合格までのロードマップを「ゲームのワールドマップ風」で見せるコンポーネント。
// - データは plan.phases（PhaseProgress[]）＋ STUDY_PHASES の静的メタを使う。
// - 8ノードを上下2段のつづら折り（4→4）に配置し、縦幅を抑える。
//   コンテナは aspect-[100/62] で viewBox(0 0 100 62) と比率を一致させ、
//   SVG 地形・道と HTML ピン（%配置）の座標系を確実に重ねる。
// - 地形（山・森・湖・等高線・コンパス）は絵文字でなく SVG 描画で地図らしく。
// - ピンをタップすると下から詳細シートが出る（文字はマップに詰め込まない方針）。

type NodeKind = "phase" | "goal";

type MapNode = {
  key: string;
  kind: NodeKind;
  emoji: string;
  title: string;
  summary: string;
  detail: string;
  checkpoints: string[];
  completionGoal: string;
  status: PhaseProgress["status"] | "goal";
  progress: number;
  hint: string;
  x: number; // viewBox単位 (0..100)
  y: number; // viewBox単位 (0..62)
};

const VB_W = 100;
const VB_H = 62;

// 7フェーズ＋ゴールの計8ノード。上段を左→右、下段を右→左に折り返す。
const POSITIONS: { x: number; y: number }[] = [
  { x: 13, y: 17 },
  { x: 37.7, y: 17 },
  { x: 62.3, y: 17 },
  { x: 87, y: 17 },
  { x: 87, y: 44 },
  { x: 62.3, y: 44 },
  { x: 37.7, y: 44 },
  { x: 13, y: 44 },
];

const STATUS_LABEL: Record<string, string> = {
  done: "クリア済み",
  current: "いまここ",
  upcoming: "これから",
  goal: "ゴール",
};

function buildNodes(phases: PhaseProgress[]): MapNode[] {
  const phaseNodes: MapNode[] = phases.map((p, i) => {
    const def = STUDY_PHASES.find((d) => d.id === p.id)!;
    const pos = POSITIONS[i] ?? { x: 50, y: 30 };
    return {
      key: p.id,
      kind: "phase",
      emoji: def.emoji,
      title: def.title,
      summary: def.summary,
      detail: def.detail,
      checkpoints: def.checkpoints,
      completionGoal: def.completionGoal,
      status: p.status,
      progress: p.progress,
      hint: p.hint,
      ...pos,
    };
  });

  const allDone = phases.every((p) => p.status === "done");
  const goalPos = POSITIONS[phaseNodes.length] ?? { x: 50, y: 44 };
  const goal: MapNode = {
    key: "goal",
    kind: "goal",
    emoji: "🎓",
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
    ...goalPos,
  };

  return [...phaseNodes, goal];
}

// 2点をつなぐ道のpath。同じ段は緩く弧を描き、段の折り返しは外側にふくらむ。
function segmentPath(a: MapNode, b: MapNode): string {
  if (Math.abs(a.y - b.y) < 1) {
    // 同じ段: 中央の帯に向かってわずかに弧を描く（上段は下へ、下段は上へ）
    const dip = a.y < VB_H / 2 ? 3 : -3;
    const dx = b.x - a.x;
    return `M ${a.x} ${a.y} C ${a.x + dx * 0.35} ${a.y + dip}, ${
      b.x - dx * 0.35
    } ${b.y + dip}, ${b.x} ${b.y}`;
  }
  // 折り返し: マップの端にふくらむUターン
  const bulge = a.x > VB_W / 2 ? 11 : -11;
  return `M ${a.x} ${a.y} C ${a.x + bulge} ${a.y + 5}, ${b.x + bulge} ${
    b.y - 5
  }, ${b.x} ${b.y}`;
}

// 針葉樹（幹＋二段の葉）。translate/scaleで使い回す。
function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-0.35" y="1.4" width="0.7" height="1.1" rx="0.2" fill="#92400e" />
      <path d="M0 -2.1 L1.5 0.5 L-1.5 0.5 Z" fill="#16a34a" />
      <path d="M0 -0.7 L1.9 1.6 L-1.9 1.6 Z" fill="#15803d" />
    </g>
  );
}

export default function RoadmapMap({ phases }: { phases: PhaseProgress[] }) {
  const [selected, setSelected] = useState<MapNode | null>(null);
  const nodes = buildNodes(phases);
  const fullPath = nodes
    .slice(0, -1)
    .map((n, i) => segmentPath(n, nodes[i + 1]))
    .join(" ");

  return (
    <div>
      <div className="relative mx-auto aspect-[100/62] w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 shadow-inner ring-2 ring-amber-800/30 md:max-w-xl">
        {/* 宝の地図風の枠 */}
        <div className="pointer-events-none absolute inset-1.5 rounded-2xl border-2 border-dashed border-amber-800/25" />

        {/* 地形・道（SVG）。コンテナと同比率なのでピン(%)とズレない */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          aria-hidden
        >
          {/* --- 地形 --- */}
          <g opacity="0.6">
            {/* 山脈（上段の空きスペース） */}
            <path d="M17 9.5 L23 2.6 L29 9.5 Z" fill="#a8a29e" />
            <path d="M21.6 4.2 L23 2.6 L24.4 4.2 L23.6 5 L22.9 4.4 Z" fill="#fafaf9" />
            <path d="M26 9.5 L31 4.4 L36 9.5 Z" fill="#bbaf9f" />
            <path d="M29.9 5.5 L31 4.4 L32.1 5.5 L31.4 6.2 Z" fill="#fafaf9" />
            {/* 森（上段右） */}
            <Tree x={55} y={6.4} s={1.15} />
            <Tree x={59.5} y={7.4} s={0.9} />
            <Tree x={51.5} y={7.6} s={0.8} />
            {/* 湖（中央の帯・左） */}
            <ellipse cx="17" cy="32.5" rx="7.5" ry="3.1" fill="#7dd3fc" opacity="0.75" />
            <path
              d="M12 32.4 q 1.7 -0.9 3.4 0 t 3.4 0"
              fill="none"
              stroke="#0284c7"
              strokeWidth="0.35"
              opacity="0.55"
            />
            {/* 森（中央の帯・右寄り） */}
            <Tree x={51} y={31.8} s={1.05} />
            <Tree x={55.5} y={33} s={0.85} />
            {/* 丘（中央の帯・さらに右） */}
            <path d="M66 34.5 q 4 -4.6 8 0 Z" fill="#a3b18a" />
            <path d="M72 34.5 q 3.2 -3.4 6.4 0 Z" fill="#b5c09b" />
            {/* 下段の木 */}
            <Tree x={45} y={58.6} s={0.75} />
            <Tree x={71} y={58.2} s={0.85} />
          </g>

          {/* 等高線ふうの飾り */}
          <g fill="none" stroke="#92400e" strokeWidth="0.35" opacity="0.09">
            <path d="M 33 34 q 4 -1.6 8 0 t 8 0" />
            <path d="M 60 10.5 q 5 -2 10 0" />
            <path d="M 8 53 q 5 -2 10 0" />
            <path d="M 84 55 q 4.5 -1.8 9 0" />
          </g>

          {/* コンパス（折り返し道の内側。右上だと「いまここ」フラグと重なる） */}
          <g transform="translate(90.5 30.5)" opacity="0.65">
            <circle r="3.1" fill="#fffbeb" stroke="#b45309" strokeWidth="0.3" />
            <path d="M0 -2.4 L0.7 0 L0 2.4 L-0.7 0 Z" fill="#b45309" />
            <path d="M-2.4 0 L0 -0.7 L2.4 0 L0 0.7 Z" fill="#d6a15e" />
            <text
              y="-3.8"
              textAnchor="middle"
              fontSize="2.1"
              fontWeight="bold"
              fill="#92400e"
            >
              N
            </text>
          </g>

          {/* --- 道 --- */}
          {/* 道のふち取り→砂色の道床の2層で「街道」に見せる */}
          <path
            d={fullPath}
            fill="none"
            stroke="#b45309"
            strokeWidth="3.6"
            strokeLinecap="round"
            opacity="0.28"
          />
          <path
            d={fullPath}
            fill="none"
            stroke="#eecf9a"
            strokeWidth="2.7"
            strokeLinecap="round"
          />
          {/* 進捗の上書き: 通過済みは実線、これからは足あとの点線 */}
          {nodes.slice(0, -1).map((n, i) => {
            const traveled = n.status === "done";
            return (
              <path
                key={n.key}
                d={segmentPath(n, nodes[i + 1])}
                fill="none"
                stroke={traveled ? "#d97706" : "#92400e"}
                strokeWidth={traveled ? 1.2 : 0.9}
                strokeLinecap="round"
                strokeOpacity={traveled ? 0.95 : 0.45}
                strokeDasharray={traveled ? "0" : "0.1 2.3"}
              />
            );
          })}
        </svg>

        {/* チェックポイント（ピン） */}
        {nodes.map((n, i) => {
          const isCurrent = n.status === "current";
          const isDone = n.status === "done";
          const isGoal = n.kind === "goal";

          const circleCls = isGoal
            ? "bg-gradient-to-b from-amber-300 to-amber-500 ring-white"
            : isDone
              ? "bg-gradient-to-b from-emerald-400 to-emerald-600 ring-white"
              : isCurrent
                ? "bg-gradient-to-b from-indigo-500 to-indigo-700 ring-white"
                : "bg-white/90 ring-amber-800/20";

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
              aria-label={`${n.title}（${STATUS_LABEL[n.status]}）`}
            >
              {isCurrent && (
                <span className="absolute -top-5 animate-bounce whitespace-nowrap rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow motion-reduce:animate-none">
                  いまここ
                </span>
              )}
              <span className="relative">
                {isCurrent && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-60 motion-reduce:animate-none" />
                )}
                <span
                  className={`relative flex items-center justify-center rounded-full shadow-md ring-[3px] transition active:scale-95 ${circleCls} ${
                    isGoal ? "h-11 w-11 text-xl" : "h-10 w-10 text-lg"
                  } ${isCurrent ? "scale-110" : ""}`}
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
                className={`mt-1 max-w-[84px] rounded-full bg-white/80 px-1.5 py-0.5 text-center text-[10px] font-bold leading-tight backdrop-blur-[1px] ${
                  isCurrent
                    ? "text-indigo-700"
                    : isGoal
                      ? "text-amber-700"
                      : isDone
                        ? "text-emerald-700"
                        : "text-amber-900/70"
                }`}
              >
                {n.title}
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
        チェックポイントをタップすると詳細が見られます
      </p>

      {/* 詳細シート */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[86vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200" />
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                {selected.emoji}
              </span>
              <div>
                <p className="text-lg font-extrabold text-gray-800">
                  {selected.title}
                </p>
                <span
                  className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
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
