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
  const size = {
    width: Math.min(220, viewport.width - viewport.margin * 2),
    height: 80,
  };
  const position = getFloatingOverlayPosition(
    {
      x: anchor.x,
      y: chipPlacement === "above" ? anchor.y - chipHeight : anchor.y,
      width: FLOATING_MOCHIT_HIT_SIZE,
      height: FLOATING_MOCHIT_HIT_SIZE + (chipPlacement ? chipHeight : 0),
    },
    size,
    viewport,
  );

  return (
    <div
      data-testid="floating-mochit-bubble"
      data-placement={position.placement}
      className="floating-mochit-overlay pointer-events-none fixed z-40 w-max max-w-[220px] whitespace-normal rounded-2xl border border-brand-100 bg-white px-3 py-2 text-sm font-bold text-gray-800 shadow-lg"
      style={{ left: position.left, top: position.top }}
    >
      {message.text}
    </div>
  );
}
