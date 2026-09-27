// 2. 約束：試験日を決めると、旅立ちの村から合格の城まで冒険マップが描かれていく。
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AdventureMap } from "../parts/AdventureMap";
import { Kinetic, Sparkle, clamp, usePop } from "../parts/motion";
import { C, FONT } from "../theme";
import type { Scene } from "../timeline";

const MAP_W = 1500;
const MAP_H = MAP_W * (1429 / 1100);

export function MapScene({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const end = scene.frames;
  const ease = Easing.bezier(0.45, 0, 0.2, 1);
  // 道の描画はカメラより少し先行させる
  const progress = interpolate(frame, [8, end - 34], [0, 1], { ...clamp, easing: ease });
  // カメラ：村（下）→ 城（上）へパンしつつ、最後に少し引いて全体を見せる
  const camY = interpolate(frame, [0, end - 30], [(109 / 130) * MAP_H, (16 / 130) * MAP_H], { ...clamp, easing: ease });
  const zoom = interpolate(frame, [0, end - 40, end], [1.12, 0.95, 0.9], { ...clamp, easing: ease });
  const tilt = interpolate(frame, [0, end], [24, 10], clamp);
  const badge = usePop(8);
  const castleT = end - 34;

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #BFE6F7, #6CB9E0)", overflow: "hidden", fontFamily: FONT }}>
      <AbsoluteFill style={{ perspective: 1800 }}>
        <div
          style={{
            position: "absolute",
            left: 960 - MAP_W / 2 + 180,
            top: 540 - camY,
            transformOrigin: `50% ${camY}px`,
            transform: `rotateX(${tilt}deg) scale(${zoom})`,
          }}
        >
          <AdventureMap width={MAP_W} progress={progress} labelScale={1.35} />
          {frame > castleT &&
            [0, 1, 2, 3].map((i) => (
              <Sparkle key={i} x={(57 / 100) * MAP_W + [-120, 90, -40, 150][i]} y={(12 / 130) * MAP_H + [-60, -90, 60, 20][i]} size={[90, 70, 60, 80][i]} delay={castleT + i * 6} color={i % 2 ? C.white : C.sun} />
            ))}
        </div>
      </AbsoluteFill>

      {/* 見出しパネル */}
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 90,
          padding: "44px 56px",
          borderRadius: 40,
          background: "rgba(16,38,75,0.88)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.3)",
          transform: `translateX(${(1 - badge) * -700}px) rotate(${(1 - badge) * -8}deg)`,
        }}
      >
        <div style={{ color: C.mint, fontSize: 38, fontWeight: 800, marginBottom: 14 }}>試験日を決めるだけで</div>
        <Kinetic start={14} size={92} segs={[{ t: "合格までの" }, { t: "\n" }, { t: "冒険マップ", color: C.sun }, { t: "が完成！" }]} />
      </div>
      <AbsoluteFill style={{ background: C.white, opacity: interpolate(frame, [castleT, castleT + 4, castleT + 14], [0, 0.55, 0], clamp) }} />
    </AbsoluteFill>
  );
}
