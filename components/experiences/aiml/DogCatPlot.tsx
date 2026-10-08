// 犬・猫の写真8枚を「鼻の長さ × 耳のとがり」の平面に置いた静的な図。
// 教師あり（最初から犬・猫の正解付き＋境界線）と教師なし（正解なし→2つのまとまり）で同じ8枚を使い、
// 「正解が付いているか」だけが違うことを見せる。

export type Pet = { id: string; kind: "dog" | "cat"; nose: number; ear: number };

/** nose=鼻の長さ, ear=耳のとがり（0〜1）。犬は鼻が長く耳が垂れ気味、猫は鼻が短く耳がとがる */
export const PETS: Pet[] = [
  { id: "d1", kind: "dog", nose: 0.72, ear: 0.25 },
  { id: "d2", kind: "dog", nose: 0.86, ear: 0.42 },
  { id: "d3", kind: "dog", nose: 0.6, ear: 0.14 },
  { id: "d4", kind: "dog", nose: 0.82, ear: 0.1 },
  { id: "c1", kind: "cat", nose: 0.25, ear: 0.75 },
  { id: "c2", kind: "cat", nose: 0.14, ear: 0.58 },
  { id: "c3", kind: "cat", nose: 0.36, ear: 0.88 },
  { id: "c4", kind: "cat", nose: 0.3, ear: 0.55 },
];

/** 学習に使っていない新しい写真 */
export const NEW_PET = { nose: 0.7, ear: 0.38 };

/** 境界線（鼻の長さ＝耳のとがり の斜め線）より鼻が長い側を犬とみなす */
export function predictPet(p: { nose: number; ear: number }) {
  const d = (p.nose - p.ear) / Math.SQRT2;
  const dog = 1 / (1 + Math.exp(-8 * d));
  return dog >= 0.5 ? { kind: "dog" as const, pct: Math.round(dog * 100) } : { kind: "cat" as const, pct: Math.round((1 - dog) * 100) };
}

const W = 240;
const H = 200;
const X0 = 26;
const Y0 = H - 24;
const SIZE_X = W - X0 - 10;
const SIZE_Y = Y0 - 14;
const sx = (v: number) => X0 + v * SIZE_X;
const sy = (v: number) => Y0 - v * SIZE_Y;

const GROUP = {
  dog: { name: "グループA", color: "#d97706", cx: 0.75, cy: 0.23 },
  cat: { name: "グループB", color: "#7c3aed", cx: 0.26, cy: 0.69 },
} as const;

export function DogCatPlot({
  mode,
  boundary = false,
  showNew = false,
  testId,
}: {
  /** labeled=犬・猫の正解付き / raw=正解なしの点 / grouped=正解なしのまま2つにまとめた */
  mode: "labeled" | "raw" | "grouped";
  boundary?: boolean;
  showNew?: boolean;
  testId?: string;
}) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="鼻の長さと耳のとがりで犬と猫の写真を並べた図" data-testid={testId} data-mode={mode}>
      <line x1={X0} y1={Y0} x2={W - 6} y2={Y0} stroke="#9ca3af" />
      <line x1={X0} y1={Y0} x2={X0} y2={8} stroke="#9ca3af" />
      <text x={W - 6} y={H - 8} textAnchor="end" fontSize={10} fill="#6b7280">鼻の長さ →</text>
      <text x={X0 + 4} y={14} fontSize={10} fill="#6b7280">↑ 耳のとがり</text>

      {boundary && (
        <g data-testid={testId ? `${testId}-boundary` : undefined}>
          <line x1={sx(0.08)} y1={sy(0.08)} x2={sx(0.98)} y2={sy(0.98)} stroke="#111827" strokeWidth={1.5} strokeDasharray="5 3" />
          <text x={sx(0.62)} y={sy(0.93)} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#111827">猫の側</text>
          <text x={sx(0.98)} y={sy(0.62)} textAnchor="end" fontSize={10} fontWeight="bold" fill="#111827">犬の側</text>
        </g>
      )}

      {mode === "grouped" &&
        (["dog", "cat"] as const).map((k) => {
          const g = GROUP[k];
          return (
            <g key={k}>
              <ellipse cx={sx(g.cx)} cy={sy(g.cy)} rx={44} ry={36} fill={g.color} opacity={0.1} stroke={g.color} strokeDasharray="4 3" />
              <text x={sx(g.cx)} y={sy(g.cy) - 40} textAnchor="middle" fontSize={10} fontWeight="bold" fill={g.color}>
                {g.name}
              </text>
            </g>
          );
        })}

      {PETS.map((p) =>
        mode === "labeled" ? (
          <g key={p.id}>
            {p.kind === "dog" ? (
              <circle cx={sx(p.nose)} cy={sy(p.ear)} r={10} fill={GROUP.dog.color} opacity={0.18} stroke={GROUP.dog.color} />
            ) : (
              <polygon
                points={`${sx(p.nose)},${sy(p.ear) - 11} ${sx(p.nose) - 10},${sy(p.ear) + 8} ${sx(p.nose) + 10},${sy(p.ear) + 8}`}
                fill={GROUP.cat.color}
                opacity={0.18}
                stroke={GROUP.cat.color}
              />
            )}
            <text x={sx(p.nose)} y={sy(p.ear) + 4} textAnchor="middle" fontSize={10} fontWeight="bold" fill={GROUP[p.kind].color}>
              {p.kind === "dog" ? "犬" : "猫"}
            </text>
          </g>
        ) : (
          <circle key={p.id} cx={sx(p.nose)} cy={sy(p.ear)} r={6} fill={mode === "grouped" ? GROUP[p.kind].color : "#6b7280"} />
        ),
      )}

      {showNew && (
        <g data-testid={testId ? `${testId}-new` : undefined}>
          <circle cx={sx(NEW_PET.nose)} cy={sy(NEW_PET.ear)} r={10} fill="#fff" stroke="#1d4ed8" strokeWidth={2} />
          <text x={sx(NEW_PET.nose)} y={sy(NEW_PET.ear) + 4} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#1d4ed8">
            ？
          </text>
        </g>
      )}
    </svg>
  );
}
