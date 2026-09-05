"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Mochit from "./Mochit";
import FloatingMochitBubble from "./FloatingMochitBubble";
import FloatingMochitMenu from "./FloatingMochitMenu";
import {
  createMochitEventSignal,
  subscribeMochitEvent,
} from "./mochitEventBus";
import type { MochitEventSignal } from "./mochitEvents";
import {
  clampFloatingMochitPoint,
  getDefaultFloatingMochitPoint,
  getFloatingMochitViewportMetrics,
  type FloatingViewportMetrics,
} from "./floatingMochitLayout";
import {
  getFloatingMochitPreferencesServerSnapshot,
  getFloatingMochitPreferencesSnapshot,
  parseFloatingMochitPreferences,
  saveFloatingMochitPreferences,
  subscribeToFloatingMochitPreferences,
  type FloatingMochitPoint,
  type FloatingMochitPreferences,
} from "./floatingMochitPreferences";
import { getMochitDisplayName } from "@/lib/mochitName";
import { loadAppState } from "@/lib/storage";
import {
  buildMochitMessage,
  type FloatingMochitMessage,
} from "./floatingMochitMessages";
import type { MochitPresentation } from "@/lib/mochitPresentation";

type MotionState =
  | "idle"
  | "pressed"
  | "dragging"
  | "rebounding"
  | "settling";

const DRAG_THRESHOLD_PX = 6;
const LONG_PRESS_MS = 550;

type ActiveGesture = {
  pointerId: number;
  start: FloatingMochitPoint;
  origin: FloatingMochitPoint;
  latest: FloatingMochitPoint;
  dragging: boolean;
  menuTriggered: boolean;
};

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefers(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return prefers;
}

function positionForPreferences(
  preferences: FloatingMochitPreferences,
  metrics: FloatingViewportMetrics,
): FloatingMochitPoint {
  return clampFloatingMochitPoint(
    preferences.position ?? getDefaultFloatingMochitPoint(metrics),
    metrics,
  );
}

type Props = {
  reducedMotion?: boolean;
  presentation?: MochitPresentation | null;
};

export default function FloatingMochit({ reducedMotion, presentation }: Props) {
  const systemReducedMotion = usePrefersReducedMotion();
  const effectiveReducedMotion = reducedMotion ?? systemReducedMotion;
  const preferencesSnapshot = useSyncExternalStore(
    subscribeToFloatingMochitPreferences,
    getFloatingMochitPreferencesSnapshot,
    getFloatingMochitPreferencesServerSnapshot,
  );
  const preferences =
    preferencesSnapshot === null
      ? null
      : parseFloatingMochitPreferences(preferencesSnapshot || null);
  const [dragPosition, setDragPosition] =
    useState<FloatingMochitPoint | null>(null);
  const [, setViewportRevision] = useState(0);
  const [motion, setMotion] = useState<MotionState>("idle");
  const [reactionSignal, setReactionSignal] =
    useState<MochitEventSignal | null>(null);
  const [bubble, setBubble] = useState<FloatingMochitMessage | null>(null);
  const [dragRotation, setDragRotation] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  // 表示名は保存済みの AppState から一度だけ読む（このコンポーネントは
  // 進捗を持たないため、購読せずマウント時のスナップショットで足りる）。
  const [displayName] = useState(() => getMochitDisplayName(loadAppState()));
  const gestureRef = useRef<ActiveGesture | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const petButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuItemRef = useRef<HTMLAnchorElement | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);
  const previousBubbleTextRef = useRef<string | null>(null);
  const viewportMetrics = preferences
    ? getFloatingMochitViewportMetrics(window)
    : { width: 0, height: 0, margin: 0, bottomClearance: 0 };
  const position = preferences
    ? clampFloatingMochitPoint(
        dragPosition ?? positionForPreferences(preferences, viewportMetrics),
        viewportMetrics,
      )
    : { x: 0, y: 0 };

  useEffect(() => {
    const handleResize = () => {
      const metrics = getFloatingMochitViewportMetrics(window);
      setDragPosition((current) =>
        current ? clampFloatingMochitPoint(current, metrics) : current,
      );
      if (gestureRef.current) {
        gestureRef.current.latest = clampFloatingMochitPoint(
          gestureRef.current.latest,
          metrics,
        );
      }
      setViewportRevision((revision) => revision + 1);
    };
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!preferences?.visible) return;
    return subscribeMochitEvent(setReactionSignal);
  }, [preferences?.visible]);

  useEffect(() => {
    if (motion !== "rebounding" && motion !== "settling") return;
    const timeoutId = window.setTimeout(() => setMotion("idle"), 520);
    return () => window.clearTimeout(timeoutId);
  }, [motion]);

  const clearLongPress = () => {
    if (longPressTimerRef.current === null) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const clearBubble = () => {
    if (bubbleTimerRef.current !== null) {
      window.clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = null;
    }
    setBubble(null);
  };

  const showBubbleForEvent = (signal: MochitEventSignal) => {
    if (menuOpen) return;

    const message = buildMochitMessage(signal, previousBubbleTextRef.current);
    if (!message) return;

    if (bubbleTimerRef.current !== null) {
      window.clearTimeout(bubbleTimerRef.current);
    }
    previousBubbleTextRef.current = message.text;
    setBubble(message);
    bubbleTimerRef.current = window.setTimeout(() => {
      bubbleTimerRef.current = null;
      setBubble(null);
    }, message.durationMs);
  };

  const openMenu = () => {
    clearLongPress();
    clearBubble();
    setMotion("idle");
    setMenuOpen(true);
  };

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
      if (bubbleTimerRef.current !== null) {
        window.clearTimeout(bubbleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    menuItemRef.current?.focus();
    const handleOutsidePointer = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenuOpen(false);
      petButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", handleOutsidePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.button !== 0 || gestureRef.current !== null) return;
    gestureRef.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: position,
      latest: position,
      dragging: false,
      menuTriggered: false,
    };
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic or already-ended pointers may not be capturable.
    }
    setDragRotation(0);
    setMenuOpen(false);
    setMotion("pressed");
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId || gesture.dragging) {
        return;
      }
      gesture.menuTriggered = true;
      openMenu();
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.start.x;
    const deltaY = event.clientY - gesture.start.y;
    if (
      !gesture.dragging &&
      Math.hypot(deltaX, deltaY) <= DRAG_THRESHOLD_PX
    ) {
      return;
    }

    gesture.dragging = true;
    clearLongPress();
    clearBubble();
    setMenuOpen(false);
    const next = clampFloatingMochitPoint(
      {
        x: gesture.origin.x + deltaX,
        y: gesture.origin.y + deltaY,
      },
      getFloatingMochitViewportMetrics(window),
    );
    gesture.latest = next;
    setDragPosition(next);
    setDragRotation(Math.min(6, Math.max(-6, deltaX / 12)));
    setMotion("dragging");
  };

  const releasePointer = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ): ActiveGesture | null => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return null;
    clearLongPress();
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    return gesture;
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const gesture = releasePointer(event);
    if (!gesture) return;
    if (gesture.menuTriggered) {
      setMotion("idle");
      return;
    }
    if (gesture.dragging) {
      const savedPosition = clampFloatingMochitPoint(
        gesture.latest,
        getFloatingMochitViewportMetrics(window),
      );
      saveFloatingMochitPreferences({
        visible: true,
        position: savedPosition,
      });
      setDragPosition(null);
      setMotion(effectiveReducedMotion ? "idle" : "settling");
      return;
    }

    setReactionSignal(createMochitEventSignal("tap"));
    openMenu();
    setMotion(effectiveReducedMotion ? "idle" : "rebounding");
  };

  const handlePointerCancel = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (!releasePointer(event)) return;
    setDragRotation(0);
    setMotion("idle");
  };

  const handleContextMenu = (
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    openMenu();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const opensMenu =
      event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey);
    if (opensMenu) {
      event.preventDefault();
      openMenu();
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setReactionSignal(createMochitEventSignal("tap"));
    openMenu();
    setMotion(effectiveReducedMotion ? "idle" : "rebounding");
  };

  const hidePet = () => {
    setMenuOpen(false);
    clearBubble();
    saveFloatingMochitPreferences({
      visible: false,
      position,
    });
  };

  if (!preferences?.visible) return null;

  return (
    <div
      ref={rootRef}
      className="fixed z-30 h-[108px] w-[108px]"
      style={{ left: position.x, top: position.y }}
    >
      <button
        ref={petButtonRef}
        type="button"
        aria-label={`${displayName}を触る`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="floating-mochit-body flex h-full w-full cursor-grab touch-none select-none items-center justify-center rounded-full active:cursor-grabbing"
        data-motion={motion}
        data-reduced-motion={effectiveReducedMotion ? "true" : undefined}
        style={
          {
            "--mochit-drag-rotate": `${dragRotation}deg`,
          } as CSSProperties
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onAnimationEnd={() => setMotion("idle")}
      >
        <Mochit
          state={presentation?.state}
          size="floating"
          reactionProfile="floating"
          animation={presentation?.animation ?? "idle"}
          reducedMotion={effectiveReducedMotion}
          event={reactionSignal}
          onEventAccepted={showBubbleForEvent}
          className="pointer-events-none justify-center"
        />
      </button>
      {bubble ? (
        <FloatingMochitBubble
          message={bubble}
          anchor={position}
          viewport={viewportMetrics}
        />
      ) : null}
      {menuOpen ? (
        <FloatingMochitMenu
          anchor={position}
          viewport={viewportMetrics}
          firstItemRef={menuItemRef}
          presentation={presentation}
          onClose={() => setMenuOpen(false)}
          onHide={hidePet}
        />
      ) : null}
    </div>
  );
}
