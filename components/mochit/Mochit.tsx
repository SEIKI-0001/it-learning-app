import Image from "next/image";

export type MochitState = "normal" | "happy" | "thinking" | "cheering";
export type MochitSize = "small" | "medium" | "large";
export type MochitAnimation = "idle" | "bounce" | "tilt" | "celebrate" | "none";
export type MochitGrowthStage = 1 | 2 | 3;

const STATE_META: Record<MochitState, { alt: string; src: string }> = {
  normal: { alt: "モチット", src: "/characters/mochit/normal.webp" },
  happy: { alt: "よろこぶモチット", src: "/characters/mochit/happy.webp" },
  thinking: { alt: "考えるモチット", src: "/characters/mochit/thinking.webp" },
  cheering: { alt: "応援するモチット", src: "/characters/mochit/cheering.webp" },
};

const SIZE_CLASS: Record<MochitSize, string> = {
  small: "h-24 w-24",
  medium: "h-32 w-32",
  large: "h-60 w-60",
};

const ANIMATION_CLASS: Record<MochitAnimation, string> = {
  idle: "mochit-idle",
  bounce: "mochit-bounce",
  tilt: "mochit-tilt",
  celebrate: "mochit-celebrate",
  none: "",
};

type Props = {
  state?: MochitState;
  size?: MochitSize;
  message?: string;
  animation?: MochitAnimation;
  growthStage?: MochitGrowthStage;
  className?: string;
};

export default function Mochit({
  state = "normal",
  size = "medium",
  message,
  animation = "idle",
  growthStage = 1,
  className = "",
}: Props) {
  const meta = STATE_META[state];
  return (
    <div className={`mochit flex items-center gap-3 ${className}`}>
      <Image
        src={meta.src}
        alt={meta.alt}
        width={512}
        height={512}
        sizes="(max-width: 640px) 128px, 240px"
        className={`${SIZE_CLASS[size]} shrink-0 object-contain mochit-growth-${growthStage} ${ANIMATION_CLASS[animation]}`}
      />
      {message ? <p className="text-sm font-semibold leading-relaxed text-gray-700">{message}</p> : null}
    </div>
  );
}
