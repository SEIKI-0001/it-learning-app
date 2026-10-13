// 犬・猫の写真8枚を「鼻の長さ × 耳のとがり」の平面に置くための共通データと座標。
// 教師あり（SupervisedAnim）と教師なし（UnsupervisedAnim）で同じ8枚を使い、
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

export const W = 240;
export const H = 200;
const X0 = 26;
const Y0 = H - 24;
export const SIZE_X = W - X0 - 10;
export const SIZE_Y = Y0 - 14;
export const sx = (v: number) => X0 + v * SIZE_X;
export const sy = (v: number) => Y0 - v * SIZE_Y;
/** 点を置ける範囲（境界線の色面をここで切り抜く） */
export const PLOT_BOX = { x: X0, y: 8, w: W - 6 - X0, h: Y0 - 8 };

export const GROUP = {
  dog: { name: "グループA", color: "#d97706" },
  cat: { name: "グループB", color: "#7c3aed" },
} as const;

/** 軸と軸名。図の土台 */
export function PlotAxes() {
  return (
    <>
      <line x1={X0} y1={Y0} x2={W - 6} y2={Y0} stroke="#9ca3af" />
      <line x1={X0} y1={Y0} x2={X0} y2={8} stroke="#9ca3af" />
      <text x={W - 6} y={H - 8} textAnchor="end" fontSize={10} fill="#6b7280">鼻の長さ →</text>
      <text x={X0 + 4} y={14} fontSize={10} fill="#6b7280">↑ 耳のとがり</text>
    </>
  );
}
