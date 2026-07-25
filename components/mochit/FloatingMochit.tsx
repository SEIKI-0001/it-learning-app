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
import {
  clampFloatingMochitPosition,
  getFloatingMochitPreferencesServerSnapshot,
  getFloatingMochitPreferencesSnapshot,
  getDefaultFloatingMochitPosition,
  parseFloatingMochitPreferences,
  saveFloatingMochitPreferences,
  subscribeToFloatingMochitPreferences,
  type FloatingMochitPoint,
  type FloatingMochitPreferences,
} from "./floatingMochitPreferences";

type MotionState =
  | "idle"
  | "pressed"
  | "dragging"
  | "rebounding"
  | "settling";

const PET_HIT_SIZE = 72;
const VIEWPORT_MARGIN = 16;
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
): FloatingMochitPoint {
  const saved =
    preferences.position ??
    getDefaultFloatingMochitPosition(
      window.innerWidth,
      window.innerHeight,
      PET_HIT_SIZE,
      PET_HIT_SIZE,
      VIEWPORT_MARGIN,
    );

  return clampFloatingMochitPosition(
    saved,
    window.innerWidth,
    window.innerHeight,
    PET_HIT_SIZE,
    PET_HIT_SIZE,
    VIEWPORT_MARGIN,
  );
}

type Props = {
  reducedMotion?: boolean;
};

export default function FloatingMochit({ reducedMotion }: Props) {
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
  const [tapId, setTapId] = useState(0);
  const [dragRotation, setDragRotation] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const gestureRef = useRef<ActiveGesture | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const petButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuItemRef = useRef<HTMLButtonElement | null>(null);
  const position = preferences
    ? (dragPosition ?? positionForPreferences(preferences))
    : { x: 0, y: 0 };

  useEffect(() => {
    const handleResize = () => {
      setViewportRevision((revision) => revision + 1);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const openMenu = () => {
    clearLongPress();
    setMotion("idle");
    setMenuOpen(true);
  };

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
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
    setMenuOpen(false);
    const next = clampFloatingMochitPosition(
      {
        x: gesture.origin.x + deltaX,
        y: gesture.origin.y + deltaY,
      },
      window.innerWidth,
      window.innerHeight,
      PET_HIT_SIZE,
      PET_HIT_SIZE,
      VIEWPORT_MARGIN,
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
      saveFloatingMochitPreferences({
        visible: true,
        position: gesture.latest,
      });
      setDragPosition(null);
      setMotion(effectiveReducedMotion ? "idle" : "settling");
      return;
    }

    setTapId((current) => current + 1);
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
    setTapId((current) => current + 1);
    setMotion(effectiveReducedMotion ? "idle" : "rebounding");
  };

  const hidePet = () => {
    setMenuOpen(false);
    saveFloatingMochitPreferences({
      visible: false,
      position,
    });
  };

  if (!preferences?.visible) return null;

  return (
    <div
      ref={rootRef}
      className="fixed z-30 h-[72px] w-[72px]"
      style={{ left: position.x, top: position.y }}
    >
      <button
        ref={petButtonRef}
        type="button"
        aria-label="モチットを触る"
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
          size="xs"
          animation="idle"
          reducedMotion={effectiveReducedMotion}
          event={tapId > 0 ? { type: "tap", id: tapId } : null}
          className="pointer-events-none justify-center"
        />
      </button>
      {menuOpen ? (
        <div
          role="menu"
          aria-label="モチットメニュー"
          className={`absolute right-0 min-w-24 rounded-lg border border-gray-200 bg-white p-1 shadow-lg ${
            position.y > window.innerHeight / 2
              ? "bottom-full mb-2"
              : "top-full mt-2"
          }`}
        >
          <button
            ref={menuItemRef}
            type="button"
            role="menuitem"
            onClick={hidePet}
            className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-gray-800 hover:bg-gray-100 active:bg-gray-200"
          >
            Hide
          </button>
        </div>
      ) : null}
    </div>
  );
}
