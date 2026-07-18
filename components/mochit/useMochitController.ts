"use client";

// セマンティックイベントを優先度付きで受理し、Riveトリガー発火へ橋渡しするフック。
// Rive未ロード時（フォールバック表示中）は発火先が無いだけで、優先度制御は同じに動く。

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createMochitReactionController,
  MOCHIT_EVENT_REACTION_MS,
  MOCHIT_EVENT_TRIGGERS,
  type MochitEvent,
} from "./mochitEvents";
import type { MochitRiveTriggerInput } from "./mochitTypes";

export type MochitTriggerFirer = (trigger: MochitRiveTriggerInput) => void;

export function useMochitController() {
  const controllerRef = useRef(createMochitReactionController());
  const firerRef = useRef<MochitTriggerFirer | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeEvent, setActiveEvent] = useState<MochitEvent | null>(null);

  // MochitRive がロード完了時に発火関数を登録する。
  const registerTriggerFirer = useCallback((firer: MochitTriggerFirer | null) => {
    firerRef.current = firer;
  }, []);

  const dispatch = useCallback((event: MochitEvent): boolean => {
    const accepted = controllerRef.current.dispatch(event);
    if (!accepted) return false;
    setActiveEvent(event);
    firerRef.current?.(MOCHIT_EVENT_TRIGGERS[event]);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveEvent(null);
    }, MOCHIT_EVENT_REACTION_MS[event]);
    return true;
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { dispatch, activeEvent, registerTriggerFirer };
}
