"use client";

import { GROUP, H, NEW_PET, PETS, PLOT_BOX, SIZE_X, SIZE_Y, W, PlotAxes, sx, sy } from "./DogCatPlot";
import { StoryCaption, useStoryboard } from "./storyboard";

// 教師あり学習のアニメ。スライド冒頭の「流れ」と同じ4段：① 正解を付ける ② 予想してくらべる ③ 直す ④ 新しい写真に答える。
// 1コマで変えるのは1つだけ（ラベル → あてずっぽうの線 → まちがいに印 → 線を直す → 新しい写真）。
// 学習前の人には「線が何のためか」が分からないので、線の両側を犬色・猫色に塗り、
// 「色ちがいの側に入った写真＝まちがい」が見て分かるようにしている。

const LABEL = 1;
const LINE_TRY = 2;
const WRONG = 3;
const LINE_FIT = 4;
const NEW_DROP = 5;
const RESULT = 6;
const DURATIONS = [1600, 2800, 2800, 2800, 3000, 1500, 0];

/** 線は「法線の向き a（度）」で表す。中心 (0.5, 0.5) を通り、法線側を犬とみなす。
 *  仮の線 30° は2枚を間違え、−45° は predictPet と同じ線（鼻の長さ＝耳のとがり）で0枚 */
export const LINE_TRY_ANGLE = 30;
export const LINE_FIT_ANGLE = -45;
const CENTER = { nose: 0.5, ear: 0.5 };

/** 角度 a の線で分けたとき、正解と違う側に落ちる写真 */
export function misjudged(a: number) {
  const r = (a * Math.PI) / 180;
  return PETS.filter((p) => ((p.nose - CENTER.nose) * Math.cos(r) + (p.ear - CENTER.ear) * Math.sin(r) > 0) !== (p.kind === "dog"));
}

/** 画面上での線の傾き（縦横の縮尺が違うので、データ上の角度から換算する） */
function screenAngle(a: number) {
  const r = (a * Math.PI) / 180;
  return (Math.atan2(-Math.cos(r) * SIZE_Y, -Math.sin(r) * SIZE_X) * 180) / Math.PI;
}

const TRY_WRONG = misjudged(LINE_TRY_ANGLE);

/** step はスライド冒頭の「流れ」の番号（0始まり）：① 正解を用意 ② 予想してくらべる ③ 直す ④ 新しいデータに答える */
const CAPTIONS: { step: number; text: string }[] = [
  { step: 0, text: "犬と猫の写真が8枚" },
  { step: 0, text: "人が「犬」「猫」の正解を付ける" },
  { step: 1, text: "予想：あてずっぽうで線を引く" },
  { step: 1, text: `くらべる：${TRY_WRONG.length}枚がまちがい` },
  { step: 2, text: "直す：まちがい0まで線を動かす" },
  { step: 3, text: "正解のない新しい写真は…？" },
  { step: 3, text: "犬の側にある →「犬」" },
];

export function SupervisedAnim() {
  const { ref, frame, done, replay } = useStoryboard(DURATIONS);
  const cap = CAPTIONS[frame];
  const angle = frame >= LINE_FIT ? LINE_FIT_ANGLE : LINE_TRY_ANGLE;
  const wrongIds = frame === WRONG ? new Set(TRY_WRONG.map((p) => p.id)) : new Set<string>();
  const cx = sx(CENTER.nose);
  const cy = sy(CENTER.ear);

  return (
    <div ref={ref} className="mx-auto mt-3 max-w-sm" data-testid="ml-supervised" data-frame={frame}>
      <StoryCaption step={cap.step} total={4} text={cap.text} done={done} replay={replay} testId="ml-supervised-caption" />
      <div className="mt-1.5 rounded-xl p-2 ring-1 ring-gray-200">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="正解付きの犬と猫の写真から、分ける線を学んで新しい写真を当てる様子">
          <PlotAxes />

          <defs>
            <clipPath id="ml-sup-clip">
              <rect x={PLOT_BOX.x} y={PLOT_BOX.y} width={PLOT_BOX.w} height={PLOT_BOX.h} />
            </clipPath>
          </defs>
          <g clipPath="url(#ml-sup-clip)">
            <g
              data-testid={frame >= LINE_TRY ? "ml-supervised-boundary" : undefined}
              data-angle={angle}
              style={{
                transform: `rotate(${screenAngle(angle)}deg)`,
                transformOrigin: `${cx}px ${cy}px`,
                transformBox: "view-box",
                transition: "transform 1200ms cubic-bezier(.4,0,.2,1)",
              }}
            >
              {/* 線の右下（回転後の +y 側）が犬の側、左上が猫の側 */}
              <g style={{ opacity: frame >= LINE_TRY ? 1 : 0, transition: "opacity 600ms", transitionDelay: frame >= LINE_TRY ? "800ms" : "0ms" }}>
                <rect x={cx - 160} y={cy} width={320} height={160} fill={GROUP.dog.color} fillOpacity={0.1} />
                <rect x={cx - 160} y={cy - 160} width={320} height={160} fill={GROUP.cat.color} fillOpacity={0.08} />
              </g>
              <line
                x1={cx - 160}
                y1={cy}
                x2={cx + 160}
                y2={cy}
                pathLength={1}
                stroke="#111827"
                strokeWidth={2}
                strokeDasharray="1"
                style={{ strokeDashoffset: frame >= LINE_TRY ? 0 : 1, transition: "stroke-dashoffset 1200ms ease-in-out" }}
              />
            </g>
          </g>

          {PETS.map((p, i) => {
            const x = sx(p.nose);
            const y = sy(p.ear);
            const on = frame >= LABEL;
            const c = GROUP[p.kind].color;
            // 正解は一度に出さず、左から順にふわっと付ける（コマは1つのまま）
            const delay = on ? `${i * 120}ms` : "0ms";
            return (
              <g key={p.id} data-testid={on ? "ml-supervised-label" : undefined}>
                <circle cx={x} cy={y} r={6} fill="#9ca3af" style={{ opacity: on ? 0 : 1, transition: "opacity 300ms", transitionDelay: delay }} />
                <g style={{ opacity: on ? 1 : 0, transition: "opacity 300ms", transitionDelay: delay }}>
                  {p.kind === "dog" ? (
                    <circle cx={x} cy={y} r={10} fill={c} fillOpacity={0.18} stroke={c} />
                  ) : (
                    <polygon points={`${x},${y - 11} ${x - 10},${y + 8} ${x + 10},${y + 8}`} fill={c} fillOpacity={0.18} stroke={c} />
                  )}
                  <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fontWeight="bold" fill={c}>
                    {p.kind === "dog" ? "犬" : "猫"}
                  </text>
                </g>
                {/* 仮の線で反対側に落ちた写真＝まちがい */}
                <circle
                  cx={x}
                  cy={y}
                  r={14}
                  fill="none"
                  stroke="#e11d48"
                  strokeWidth={2}
                  data-testid={wrongIds.has(p.id) ? "ml-supervised-wrong" : undefined}
                  style={{ opacity: wrongIds.has(p.id) ? 1 : 0, transition: "opacity 400ms", transitionDelay: "0ms" }}
                />
              </g>
            );
          })}

          <g
            data-testid={frame >= NEW_DROP ? "ml-supervised-new" : undefined}
            style={{
              opacity: frame >= NEW_DROP ? 1 : 0,
              transform: `translateY(${frame >= NEW_DROP ? 0 : -60}px)`,
              transition: "transform 800ms cubic-bezier(.5,0,.3,1.2), opacity 300ms",
            }}
          >
            <circle cx={sx(NEW_PET.nose)} cy={sy(NEW_PET.ear)} r={11} fill="#fff" stroke="#1d4ed8" strokeWidth={2} />
            <text x={sx(NEW_PET.nose)} y={sy(NEW_PET.ear) + 4} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#1d4ed8">
              {frame >= RESULT ? "犬" : "？"}
            </text>
          </g>
        </svg>
        <div
          className="flex justify-center gap-4 text-[11px] font-bold transition-opacity duration-500"
          style={{ opacity: frame >= LINE_TRY ? 1 : 0 }}
          aria-hidden={frame < LINE_TRY}
          data-testid="ml-supervised-legend"
        >
          <span className="flex items-center gap-1" style={{ color: GROUP.dog.color }}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP.dog.color, opacity: 0.35 }} />
            犬の側
          </span>
          <span className="flex items-center gap-1" style={{ color: GROUP.cat.color }}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP.cat.color, opacity: 0.3 }} />
            猫の側
          </span>
        </div>
      </div>
    </div>
  );
}
