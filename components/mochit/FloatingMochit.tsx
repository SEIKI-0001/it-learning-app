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
import MochitCompanionScene from "./MochitCompanionScene";
import MochitEmotionAccent from "./MochitEmotionAccent";
import Mochit from "./Mochit";
import FloatingMochitBubble from "./FloatingMochitBubble";
import FloatingMochitMenu from "./FloatingMochitMenu";
import {
  createMochitEventSignal,
  subscribeMochitEvent,
} from "./mochitEventBus";
import { MOCHIT_EVENT_REACTION_MS, type MochitEventSignal } from "./mochitEvents";
import {
  clampFloatingMochitPoint,
  FLOATING_MOCHIT_HIT_SIZE,
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
import type { MochitBehaviorState } from "./mochitBehavior";
import { useMochitSleep } from "./useMochitSleep";
import { useMochitContextualAttention } from "./useMochitContextualAttention";
import { viewportTargetToAttentionPoint, type MochitAttentionPoint } from "./mochitAttention";
import FloatingMochitFocusChip from "./FloatingMochitFocusChip";
import { activityAllowsSleep, activityForFocusPhase } from "./mochitActivity";
import { FOCUS_BREAK_OFFER_MS, hasFocusBreakOffer, type FocusSessionState } from "./mochitFocusSession";
import { useMochitFocusSession, useMochitFocusSessionEvents } from "./useMochitFocusSession";
import { createLearningStreakTracker, type LearningStreakTracker } from "./mochitLearningStreak";
import {
  getMochitConsultSnapshot,
  openMochitConsult,
  subscribeMochitConsult,
} from "./mochitConsultStore";

type MotionState =
  | "idle"
  | "pressed"
  | "dragging"
  | "rebounding"
  | "settling";

const DRAG_THRESHOLD_PX = 6;
const LONG_PRESS_MS = 550;
/** 足元の集中タイマー表示の高さ（下に置けない位置では上に出す判定に使う） */
const FOCUS_CHIP_CLEARANCE_PX = 28;

/** Today 完了のリアクションが終わってから、振り返りの誘いを出すまでの間。 */
const REFLECTION_BUBBLE_DELAY_MS = 2_600;
const REFLECTION_BUBBLE: FloatingMochitMessage = {
  text: "今日のミッション完了！ タップで30秒ふりかえり",
  durationMs: 6_000,
};

const hasFocusChip = (session: FocusSessionState) => session.phase !== "idle" || hasFocusBreakOffer(session);

// Focus Session の節目にモチットが話すひとこと（学習イベントではないので Reaction は伴わない）
const FOCUS_SESSION_BUBBLES = {
  focusStarted: { text: "いっしょに集中しよう", durationMs: 1_800 },
  breakStarted: { text: "ひと息つこう", durationMs: 1_800 },
  breakCompleted: { text: "休憩おわり。また一緒にやろう", durationMs: 2_400 },
} as const satisfies Record<string, FloatingMochitMessage>;

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

// Sleep 状態の Behavior。awake かつ Contextual Attention が無いときは behavior を渡さない（従来表示のまま）。
const SLEEPY_BEHAVIOR: Partial<MochitBehaviorState> = Object.freeze({
  emotion: "sleepy",
  idleBehavior: "sleepy",
});

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
  const lively = preferences?.reactionLevel !== "low";
  const [acceptedReaction, setAcceptedReaction] = useState<MochitEventSignal | null>(null);
  const emotionTimerRef = useRef<number | null>(null);
  const [bubble, setBubble] = useState<FloatingMochitMessage | null>(null);
  const [dragRotation, setDragRotation] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const consult = useSyncExternalStore(subscribeMochitConsult, getMochitConsultSnapshot, getMochitConsultSnapshot);
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

  // Focus Session（もちっとと集中する）: 集中中は一緒に勉強（studying）、休憩中は一緒に休む（resting）。
  // イベントの購読はセッション状態の購読より先に張る（購読開始時に確定した完了も受け取るため）。
  const showBubbleRef = useRef<(message: FloatingMochitMessage, options?: { withMenu?: boolean }) => void>(
    () => {},
  );
  useMochitFocusSessionEvents((event) => {
    if (event.type === "focusCompleted") {
      // 集中を終えて小さく達成 Reaction。ずっと後で気づいた完了（提案の期限切れ）は祝わない
      if (Date.now() - event.at <= FOCUS_BREAK_OFFER_MS) {
        setReactionSignal(createMochitEventSignal("focusComplete"));
      }
      return;
    }
    // 開始はメニュー操作から来る（同じ操作でメニューは閉じる）ので、開いていても話す
    showBubbleRef.current(FOCUS_SESSION_BUBBLES[event.type], {
      withMenu: event.type === "focusStarted" || event.type === "breakStarted",
    });
  }, !!preferences?.visible);
  const focusSession = useMochitFocusSession();
  const activity = activityForFocusPhase(focusSession.phase);

  // Sleep / Wake: しばらく操作が無いと眠そうにし、ユーザーが戻ると起きる。
  // 単純に戻ってきた（操作した）時だけ wakeUp Reaction を出す。学習イベントで起きた時は
  // wakeUp を挟まず、半目を解除してから本来の Reaction をそのまま再生する。
  const { sleeping, notifyLearningEvent } = useMochitSleep({
    enabled: !!preferences?.visible,
    // 集中中・休憩中は眠らない（Activity > Sleep）
    suppressed: !activityAllowsSleep(activity),
    onWake: (reason) => {
      if (reason === "activity") setReactionSignal(createMochitEventSignal("wakeUp"));
    },
  });

  // Contextual Attention: ページ（Today など）が「今ここを見てほしい」と通知した対象を見る。
  // Reaction 中は終わるまで待ち、Sleep 中の通知は起こさずに捨てる（判定は mochitContextualAttention）。
  const contextualAttention = useMochitContextualAttention({
    enabled: !!preferences?.visible,
    sleeping,
  });
  const appliedAttention = sleeping ? null : contextualAttention.applied;

  // 連続正解の節目の correct は、少し強い喜び（correctStreak）に置き換える
  const streakRef = useRef<LearningStreakTracker | null>(null);
  useEffect(() => {
    if (!preferences?.visible) return;
    const streak = (streakRef.current ??= createLearningStreakTracker());
    return subscribeMochitEvent((signal) => {
      // 学習イベントは Reaction より先に awake へ戻す（同じ描画で目も開く）
      notifyLearningEvent();
      setReactionSignal(streak.process(signal));
    });
  }, [preferences?.visible, notifyLearningEvent]);

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

  const handleEventAccepted = (signal: MochitEventSignal) => {
    setAcceptedReaction(signal);
    if (emotionTimerRef.current !== null) window.clearTimeout(emotionTimerRef.current);
    emotionTimerRef.current = window.setTimeout(() => setAcceptedReaction(null), MOCHIT_EVENT_REACTION_MS[signal.type] + 2400);
    contextualAttention.reactionStarted(MOCHIT_EVENT_REACTION_MS[signal.type]);
    showBubbleForEvent(signal);
  };

  const showBubble = (message: FloatingMochitMessage, options: { withMenu?: boolean } = {}) => {
    if (menuOpen && !options.withMenu) return;
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

  const showBubbleForEvent = (signal: MochitEventSignal) => {
    const message = buildMochitMessage(signal, previousBubbleTextRef.current);
    if (message) showBubble(message);
  };

  useEffect(() => {
    showBubbleRef.current = showBubble;
  });

  // Today の完了で振り返りが差し出されたら、完了リアクションのあとに一度だけ誘う（強制しない）
  const reflectionOffered = consult.reflection.status === "offered";
  const reflectionDate = consult.reflection.date;
  useEffect(() => {
    if (!preferences?.visible || !reflectionOffered) return;
    const timer = window.setTimeout(() => {
      if (!getMochitConsultSnapshot().open) showBubbleRef.current(REFLECTION_BUBBLE);
    }, REFLECTION_BUBBLE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [preferences?.visible, reflectionOffered, reflectionDate]);

  // タップ（Enter / Space）は相談シートを開く。長押し・右クリック・Shift+F10 は従来のメニュー。
  const openConsult = () => {
    clearLongPress();
    clearBubble();
    setMenuOpen(false);
    openMochitConsult({ from: "pet" });
  };

  const openMenu = () => {
    clearLongPress();
    clearBubble();
    setMotion("idle");
    setMenuOpen(true);
  };

  useEffect(() => {
    return () => {
      if (emotionTimerRef.current !== null) window.clearTimeout(emotionTimerRef.current);
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
        ...preferences,
        visible: true,
        position: savedPosition,
      });
      setDragPosition(null);
      setMotion(effectiveReducedMotion ? "idle" : "settling");
      return;
    }

    setReactionSignal(createMochitEventSignal("tap"));
    openConsult();
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
    openConsult();
    setMotion(effectiveReducedMotion ? "idle" : "rebounding");
  };

  const hidePet = () => {
    setMenuOpen(false);
    clearBubble();
    saveFloatingMochitPreferences({
      ...preferences,
      visible: false,
      position,
    });
  };

  if (!preferences?.visible) return null;

  // 視線の基準は「置かれている位置」（保存済み位置）。ドラッグ中は更新を連発せず、
  // ドラッグを終えて位置が保存された時点で同じ対象への向きを計算し直す。
  const restingPosition = positionForPreferences(preferences, viewportMetrics);
  let attentionPoint: MochitAttentionPoint | undefined;
  if (appliedAttention && (appliedAttention.attention === "content" || appliedAttention.attention === "result")) {
    attentionPoint = viewportTargetToAttentionPoint(appliedAttention.target, {
      x: restingPosition.x + FLOATING_MOCHIT_HIT_SIZE / 2,
      y: restingPosition.y + FLOATING_MOCHIT_HIT_SIZE / 2,
    });
  }
  const behavior: Partial<MochitBehaviorState> | undefined = sleeping
    ? SLEEPY_BEHAVIOR
    : appliedAttention
      ? { attention: appliedAttention.attention }
      : lively && acceptedReaction
        ? { emotion: acceptedReaction.type === "incorrect" ? "thinking" : "happy" }
        : undefined;

  // 足元の集中タイマー。画面下端（BottomNav の手前）で足元に置けない時は頭の上に出す
  const chipPlacement =
    position.y + FLOATING_MOCHIT_HIT_SIZE + FOCUS_CHIP_CLEARANCE_PX >
    viewportMetrics.height - viewportMetrics.bottomClearance
      ? "above"
      : "below";

  return (
    <div
      ref={rootRef}
      className="mochit-companion fixed z-30 h-[108px] w-[108px]"
      data-lively={lively}
      data-reduced-motion={effectiveReducedMotion}
      data-activity={activity}
      data-reacting={!!acceptedReaction}
      style={{ left: position.x, top: position.y }}
    >
      <button
        ref={petButtonRef}
        type="button"
        aria-label={`${displayName}に相談する`}
        aria-haspopup="dialog"
        aria-expanded={consult.open || menuOpen}
        className="floating-mochit-body flex h-full w-full cursor-grab touch-none select-none items-center justify-center rounded-full active:cursor-grabbing"
        data-motion={motion}
        data-reduced-motion={effectiveReducedMotion ? "true" : undefined}
        data-sleep={sleeping ? "sleepy" : "awake"}
        data-activity={activity}
        data-attention={appliedAttention?.attention ?? "random"}
        data-attention-point={attentionPoint ? `${attentionPoint.x},${attentionPoint.y}` : undefined}
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
          lively={lively}
          animation={presentation?.animation ?? "idle"}
          reducedMotion={effectiveReducedMotion}
          behavior={behavior}
          attentionPoint={attentionPoint}
          activity={activity}
          event={reactionSignal}
          onEventAccepted={handleEventAccepted}
          className="pointer-events-none justify-center"
        />
        {lively && activity === "studying" && <MochitCompanionScene paused={!!acceptedReaction} />}
      </button>
      {lively && acceptedReaction && <MochitEmotionAccent key={acceptedReaction.id} event={acceptedReaction.type} />}
      <FloatingMochitFocusChip session={focusSession} placement={chipPlacement} onOpenMenu={openMenu} />
      {bubble && !consult.open ? (
        <FloatingMochitBubble
          message={bubble}
          anchor={position}
          viewport={viewportMetrics}
          chipPlacement={hasFocusChip(focusSession) ? chipPlacement : null}
          chipHeight={FOCUS_CHIP_CLEARANCE_PX - 8}
        />
      ) : null}
      {menuOpen ? (
        <FloatingMochitMenu
          anchor={position}
          viewport={viewportMetrics}
          firstItemRef={menuItemRef}
          presentation={presentation}
          focus={{ session: focusSession, displayName }}
          onClose={() => setMenuOpen(false)}
          onHide={hidePet}
        />
      ) : null}
    </div>
  );
}
