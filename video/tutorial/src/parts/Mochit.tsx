// アプリ本体のモチット SVG（components/mochit/mochitSvgMarkup.ts）を動画用にフレーム駆動で動かす。
// 名前付きレイヤー（Anim_Breathe / Arm_R / Mouth_* / Core_Glow など）へ、フレームから計算した transform を当てる。
import { useId } from "react";
import { useCurrentFrame } from "remotion";
import { MOCHIT_SVG_MARKUP } from "../../../../components/mochit/mochitSvgMarkup";

// 支点はアプリと同じ master 座標（components/mochit/mochitReactionAnimation.ts）
const ARM_L_PIVOT = { x: 296, y: 745 };
const ARM_R_PIVOT = { x: 934, y: 745 };
const ANTENNA_PIVOT = { x: 680, y: 360 };
const rotateAbout = (p: { x: number; y: number }, deg: number) => `translate(${p.x}px, ${p.y}px) rotate(${deg}deg) translate(${-p.x}px, ${-p.y}px)`;

/** talk = 語りに合わせて口をぱくぱくさせる */
export type MochitMood = "normal" | "smile" | "open" | "talk";

type Props = {
  size: number;
  mood?: MochitMood;
  /** 右腕を振る（手招き・あいさつ） */
  wave?: boolean;
  /** 知識コアの光 0〜1（成長演出） */
  glow?: number;
  /** 目線 -1〜1（左右） */
  look?: number;
  /** まばたきの位相をずらす（複数体を出すとき用） */
  blinkOffset?: number;
};

export function Mochit({ size, mood = "normal", wave = false, glow = 0, look = 0, blinkOffset = 0 }: Props) {
  const frame = useCurrentFrame();
  const scope = `m${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  // 呼吸：ゆっくり伸び縮み
  const breathe = 1 + Math.sin(frame / 9) * 0.018;
  // まばたき：約2.8秒ごとに4フレーム
  const bf = (frame + blinkOffset) % 84;
  const blink = bf < 4 ? [1, 0.25, 0.1, 0.6][bf] : 1;
  // 腕：アプリのリアクション（mochitReactionAnimation.ts）と同じ肩の支点で回す。
  // 右腕は負の角度で外へ開く。手を振るときも体から離れて見えない範囲（6〜22°）に収める。
  const arm = wave ? -(14 + Math.sin(frame / 5) * 8) : Math.sin(frame / 9) * 2;
  const armL = Math.sin(frame / 9 + 1) * 2;
  // アンテナのハートは常に少し揺れる
  const antenna = Math.sin(frame / 6) * 4;
  const pupil = look * 10;
  const mouth = mood === "talk" ? (Math.floor(frame / 3) % 3 === 0 ? "smile" : "open") : mood;

  const css = `
    .${scope} * { transform-box: fill-box; }
    .${scope} #Anim_Breathe { transform-origin: 50% 100%; transform: scale(${1 / breathe}, ${breathe}); }
    .${scope} #Arm_R, .${scope} #Arm_L, .${scope} #Anim_Antenna { transform-box: view-box; transform-origin: 0 0; }
    .${scope} #Arm_R { transform: ${rotateAbout(ARM_R_PIVOT, arm)}; }
    .${scope} #Arm_L { transform: ${rotateAbout(ARM_L_PIVOT, armL)}; }
    .${scope} #Anim_Antenna { transform: ${rotateAbout(ANTENNA_PIVOT, antenna)}; }
    .${scope} #EyeWhite_L, .${scope} #EyeWhite_R, .${scope} #Pupil_L, .${scope} #Pupil_R,
    .${scope} #EyeHighlight_L, .${scope} #EyeHighlight_R { transform-origin: 50% 50%; transform: scaleY(${blink}); }
    .${scope} #Pupil_L rect, .${scope} #Pupil_R rect, .${scope} #EyeHighlight_L rect, .${scope} #EyeHighlight_R rect { transform: translateX(${pupil}px); }
    .${scope} #Mouth_Neutral { opacity: ${mouth === "normal" ? 1 : 0}; }
    .${scope} #Mouth_Smile { opacity: ${mouth === "smile" ? 1 : 0}; }
    .${scope} #Mouth_Open { opacity: ${mouth === "open" ? 1 : 0}; }
    .${scope} #Core_Glow { opacity: ${glow}; transform-origin: 50% 50%; transform: scale(${1 + glow * 0.25 + Math.sin(frame / 5) * 0.05 * glow}); }
  `;

  return (
    <svg
      className={scope}
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      style={{ overflow: "visible", filter: glow > 0 ? `drop-shadow(0 0 ${24 * glow}px rgba(109,238,254,${0.8 * glow}))` : undefined }}
    >
      <style>{css}</style>
      <g dangerouslySetInnerHTML={{ __html: MOCHIT_SVG_MARKUP }} />
    </svg>
  );
}
