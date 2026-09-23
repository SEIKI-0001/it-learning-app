import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { FloatingMochitMessage } from "./floatingMochitMessages";
import {
  FLOATING_MOCHIT_HIT_SIZE,
  getFloatingOverlayPosition,
  type FloatingViewportMetrics,
} from "./floatingMochitLayout";
import type { FloatingMochitPoint } from "./floatingMochitPreferences";

type Props = {
  message: FloatingMochitMessage;
  anchor: FloatingMochitPoint;
  viewport: FloatingViewportMetrics;
  /** 足元（below）/ 頭上（above）に集中タイマーが出ている時は、その分だけ離して置く */
  chipPlacement?: "below" | "above" | null;
  chipHeight?: number;
};

export default function FloatingMochitBubble({
  message,
  anchor,
  viewport,
  chipPlacement = null,
  chipHeight = 0,
}: Props) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState({ width: 220, height: 40 });
  useLayoutEffect(() => {
    const element = bubbleRef.current;
    if (!element) return;
    const measure = () => {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      if (width > 0 && height > 0) setMeasured((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [message.text, viewport.width]);
  const size = measured;
  const position = getFloatingOverlayPosition(
    {
      x: anchor.x + 12,
      y: chipPlacement === "above" ? anchor.y - chipHeight : anchor.y + 12,
      width: FLOATING_MOCHIT_HIT_SIZE - 24,
      height: FLOATING_MOCHIT_HIT_SIZE - 24 + (chipPlacement ? chipHeight + 12 : 0),
    },
    size,
    viewport,
    { preferHorizontal: !!chipPlacement, gap: 4 },
  );

  return (
    <div
      ref={bubbleRef}
      data-testid="floating-mochit-bubble"
      data-placement={position.placement}
      className="mochit-speech-bubble floating-mochit-overlay pointer-events-none fixed z-40 w-max max-w-[220px] whitespace-normal rounded-2xl border border-brand-100 bg-white px-3 py-2 text-sm font-bold text-gray-800 shadow-lg"
      style={{
        left: position.left, top: position.top,
        maxWidth: Math.min(220, viewport.width - viewport.margin * 2),
        "--bubble-tip-x": `${Math.max(14, Math.min(size.width - 14, anchor.x + 54 - position.left))}px`,
        "--bubble-tip-y": `${Math.max(12, Math.min(size.height - 12, anchor.y + 54 - position.top))}px`,
      } as CSSProperties}
    >
      {message.text}
    </div>
  );
}
