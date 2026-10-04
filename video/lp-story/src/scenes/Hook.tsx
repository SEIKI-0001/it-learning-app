// 1. つかみ：夜の机で勉強する人。「読んだ・解いた。でも本当に理解できている？」
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { PenLine, Rise, clamp } from "../parts/motion";
import { C } from "../theme";
import type { Scene } from "../timeline";

export function Hook({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const [l1, l2] = scene.lines;
  // ゆっくり寄っていく（ケン・バーンズ）。顔のあたりへ少し流す
  const z = interpolate(frame, [0, scene.frames], [1.06, 1.16], clamp);
  const dx = interpolate(frame, [0, scene.frames], [0, -40], clamp);
  const fadeIn = interpolate(frame, [0, 24], [0, 1], clamp);
  // 問いかけの場面では写真を少し暗くし、文字に視線を集める
  const dim = interpolate(frame, [l2.from - 10, l2.from + 20], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: C.night }}>
      <AbsoluteFill style={{ opacity: fadeIn }}>
        <Img
          src={staticFile("photo/student.png")}
          style={{ position: "absolute", width: 1920, height: 1080, objectFit: "cover", transform: `translateX(${dx}px) scale(${z})`, transformOrigin: "70% 40%", filter: `brightness(${0.92 - dim * 0.2}) saturate(0.9)` }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(8,12,32,0.92) 0%, rgba(8,12,32,0.72) 38%, rgba(8,12,32,0.1) 72%, rgba(8,12,32,0) 100%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.4) 100%)" }} />

      <div style={{ position: "absolute", left: 150, top: 330 }}>
        <Rise runs="参考書を読んだ。" at={l1.onsets[0]} exit={l2.from - 16} size={92} color={C.white} />
        <Rise runs="過去問も、解いた。" at={l1.onsets[1]} exit={l2.from - 14} size={92} color={C.white} style={{ marginTop: 18 }} />
      </div>

      <div style={{ position: "absolute", left: 150, top: 300 }}>
        <Rise runs="でも、" at={l2.onsets[0]} size={60} color={C.mist} weight={500} />
        <div style={{ position: "relative", marginTop: 20 }}>
          <Rise runs="本当に、" at={l2.onsets[1]} size={104} color={C.white} />
          <div style={{ position: "relative" }}>
            <Rise runs={[{ t: "理解", color: C.white }, { t: "できていますか？", color: C.white }]} at={l2.onsets[2]} size={104} color={C.white} />
            <PenLine width={232} at={l2.onsets[2] + 14} style={{ left: 0, top: 128 }} stroke={10} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
