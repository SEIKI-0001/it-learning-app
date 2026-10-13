"use client";

import { GROUP, H, PETS, PlotAxes, W, sx, sy } from "./DogCatPlot";
import { StoryCaption, useStoryboard } from "./storyboard";

// 教師なし学習（クラスタリング）のアニメ。教師ありと同じ8枚を、正解なしで渡す。
// 3段だけ：① データだけ渡す ② AIが近いもの同士をまとめる ③ 名前は人が付ける。
// ② は「どう分けるか」が分かるように、先に近さ（距離）を測るコマを1つ挟む。

const MEASURE = 1;
const GROUPED = 2;
const NAMED = 3;
const DURATIONS = [1800, 2800, 2800, 0];

const CAPTIONS: { step: number; text: string }[] = [
  { step: 0, text: "同じ8枚を、正解なしで渡す" },
  { step: 1, text: "点と点の近さ（距離）を測る" },
  { step: 1, text: "近いもの同士を1つのグループに" },
  { step: 2, text: "名前を付けるのは人" },
];

/** 距離の見本：同じまとまりの近い2点と、まとまりをまたぐ遠い2点 */
const pet = (id: string) => PETS.find((p) => p.id === id)!;
const MEASURES = [
  { a: pet("d1"), b: pet("d2"), label: "近い", color: "#059669", dx: 6, dy: 14 },
  { a: pet("d1"), b: pet("c4"), label: "遠い", color: "#e11d48", dx: 8, dy: -6 },
];

const KINDS = ["dog", "cat"] as const;

/** まとまりの真ん中。楕円と名前をここに置く */
const CENTERS = KINDS.map((k) => {
  const m = PETS.filter((p) => p.kind === k);
  return { nose: m.reduce((s, p) => s + p.nose, 0) / m.length, ear: m.reduce((s, p) => s + p.ear, 0) / m.length };
});

export function UnsupervisedAnim() {
  const { ref, frame, done, replay } = useStoryboard(DURATIONS);
  const grouped = frame >= GROUPED;
  const cap = CAPTIONS[frame];

  return (
    <div ref={ref} className="mx-auto mt-3 max-w-sm" data-testid="ml-unsupervised" data-frame={frame}>
      <StoryCaption step={cap.step} total={3} text={cap.text} done={done} replay={replay} testId="ml-unsupervised-caption" />
      <div className="mt-1.5 rounded-xl p-2 ring-1 ring-gray-200">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="正解のない8枚の写真を、近いもの同士の2グループにまとめる様子">
          <PlotAxes />

          {KINDS.map((k, g) => {
            const c = CENTERS[g];
            const color = GROUP[k].color;
            return (
              <g key={k} data-testid={grouped ? "ml-unsupervised-group" : undefined} style={{ opacity: grouped ? 1 : 0, transition: "opacity 700ms" }}>
                <ellipse cx={sx(c.nose)} cy={sy(c.ear)} rx={44} ry={36} fill={color} fillOpacity={0.1} stroke={color} strokeDasharray="4 3" />
                {/* グループB（猫）は上に縦軸名があるので、名前を楕円の下に置く */}
                <text x={sx(c.nose)} y={g === 0 ? sy(c.ear) - 40 : sy(c.ear) + 48} textAnchor="middle" fontSize={10} fontWeight="bold" fill={color}>
                  {GROUP[k].name}
                  {frame >= NAMED && <tspan fill="#111827">{k === "dog" ? "＝犬" : "＝猫"}</tspan>}
                </text>
              </g>
            );
          })}

          {MEASURES.map((m) => (
            <g key={m.label} data-testid={frame === MEASURE ? "ml-unsupervised-measure" : undefined} style={{ opacity: frame === MEASURE ? 1 : 0, transition: "opacity 500ms" }}>
              <line x1={sx(m.a.nose)} y1={sy(m.a.ear)} x2={sx(m.b.nose)} y2={sy(m.b.ear)} stroke={m.color} strokeWidth={2} strokeDasharray="3 3" />
              <text
                x={(sx(m.a.nose) + sx(m.b.nose)) / 2 + m.dx}
                y={(sy(m.a.ear) + sy(m.b.ear)) / 2 + m.dy}
                fontSize={11}
                fontWeight="bold"
                fill={m.color}
              >
                {m.label}
              </text>
            </g>
          ))}

          {PETS.map((p) => (
            <circle
              key={p.id}
              cx={sx(p.nose)}
              cy={sy(p.ear)}
              r={6}
              style={{ fill: grouped ? GROUP[p.kind].color : "#9ca3af", transition: "fill 700ms" }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
