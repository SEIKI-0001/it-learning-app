// 1. フック：受験者の「迷い」が画面にあふれる → モチットが降ってきて吹き飛ばす。
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Mochit } from "../parts/Mochit";
import { Backdrop, Kinetic, Sparkle, clamp, usePop } from "../parts/motion";
import { C, FONT } from "../theme";
import type { Scene } from "../timeline";

const WORRIES = [
  { t: "範囲が広すぎる…", x: 210, y: 200, r: -6 },
  { t: "何から？", x: 1480, y: 170, r: 5 },
  { t: "用語がむずかしい", x: 1330, y: 800, r: 4 },
  { t: "時間がない…", x: 170, y: 790, r: -3 },
  { t: "続かない…", x: 1560, y: 480, r: 7 },
  { t: "過去問どうする？", x: 330, y: 500, r: -8 },
];

export function Hook({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const [l1, l2] = scene.lines;
  const drop = l2.from - 20; // モチット登場
  const burst = drop + 10; // 迷いが吹き飛ぶ

  const landing = usePop(drop, { damping: 8, stiffness: 140 });
  const squash = interpolate(frame - drop, [8, 12, 18], [1, 0.82, 1], clamp);
  const bright = interpolate(frame, [burst, burst + 12], [0, 1], clamp);
  const titleOut = interpolate(frame, [burst - 4, burst + 6], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop from="#1B2440" to="#0A0F1F" seed={11} />
      <AbsoluteFill style={{ opacity: bright }}>
        <Backdrop from={C.brand500} to={C.brand900} seed={12} />
      </AbsoluteFill>

      {/* 迷いの吹き出し：ぽこぽこ湧いて揺れる → 登場の瞬間に外へ吹き飛ぶ */}
      {WORRIES.map((w, i) => {
        const inP = usePopAt(14 + i * 11);
        const out = interpolate(frame, [burst, burst + 14], [0, 1], clamp);
        const dx = (w.x - 960) * out * 1.6;
        const dy = (w.y - 540) * out * 1.6;
        const wob = Math.sin((frame + i * 13) / 7) * 4;
        return (
          <div
            key={w.t}
            style={{
              position: "absolute",
              left: w.x,
              top: w.y,
              transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(${inP * (1 - out * 0.4)}) rotate(${w.r + wob + out * 40}deg)`,
              opacity: 1 - out,
              padding: "22px 34px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.1)",
              border: "2px solid rgba(255,255,255,0.28)",
              color: "rgba(255,255,255,0.88)",
              fontSize: 44,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {w.t}
          </div>
        );
      })}

      {/* 中央の問いかけ */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: titleOut }}>
        <Kinetic
          start={3}
          size={120}
          align="center"
          segs={[{ t: "ITパスポート、" }, { t: "\n" }, { t: "何から", color: C.sun }, { t: "始める？" }]}
        />
      </AbsoluteFill>

      {/* モチット登場 → 手を振って案内宣言 */}
      {frame >= drop && (
        <>
          <div
            style={{
              position: "absolute",
              left: 1130,
              top: 170,
              transform: `translateY(${(1 - landing) * -1100}px) scale(${2 - squash}, ${squash})`,
              transformOrigin: "50% 100%",
            }}
          >
            <Mochit size={720} mood={frame > l2.from && frame < l2.from + l2.frames ? "talk" : "smile"} wave={frame > l2.from + 10} />
          </div>
          <Sparkle x={1260} y={260} size={90} delay={burst} />
          <Sparkle x={1760} y={330} size={60} delay={burst + 12} color={C.mint} />
          <Sparkle x={1300} y={820} size={50} delay={burst + 20} />
        </>
      )}
      {frame >= l2.from - 6 && (
        <div style={{ position: "absolute", left: 150, top: 300 }}>
          <Kinetic start={l2.from - 6} size={104} segs={[{ t: "だいじょうぶ！" }]} color={C.sun} />
          <Kinetic
            start={l2.from + 18}
            size={80}
            style={{ marginTop: 28 }}
            segs={[{ t: "合格まで、" }, { t: "\n" }, { t: "ぼくが案内するよ" }]}
          />
        </div>
      )}
    </AbsoluteFill>
  );
}

// ループ内で使うための usePop（呼び出し順は固定なのでフック規則上問題ない）
function usePopAt(start: number) {
  return usePop(start, { damping: 9, stiffness: 200 });
}
