import Image from "next/image";
import type { MochitAnimation, MochitGrowthStage, MochitState } from "./mochitTypes";

// 既存のWebP静的表示。Rive未導入・ロード失敗時の唯一のフォールバック。
// 見た目・寸法・alt・CSSアニメーションは従来の Mochit.tsx と同一に保つ。

export const MOCHIT_STATE_META: Record<MochitState, { alt: string; src: string }> = {
  normal: { alt: "モチット", src: "/characters/mochit/normal.webp" },
  happy: { alt: "よろこぶモチット", src: "/characters/mochit/happy.webp" },
  thinking: { alt: "考えるモチット", src: "/characters/mochit/thinking.webp" },
  cheering: { alt: "応援するモチット", src: "/characters/mochit/cheering.webp" },
};

const ANIMATION_CLASS: Record<MochitAnimation, string> = {
  idle: "mochit-idle",
  bounce: "mochit-bounce",
  tilt: "mochit-tilt",
  celebrate: "mochit-celebrate",
  none: "",
};

type Props = {
  state: MochitState;
  animation: MochitAnimation;
  growthStage: MochitGrowthStage;
  sizesAttr: string;
};

export default function MochitFallback({ state, animation, growthStage, sizesAttr }: Props) {
  const meta = MOCHIT_STATE_META[state];
  return (
    <Image
      src={meta.src}
      alt={meta.alt}
      width={512}
      height={512}
      sizes={sizesAttr}
      className={`h-full w-full object-contain mochit-growth-${growthStage} ${ANIMATION_CLASS[animation]}`}
    />
  );
}
