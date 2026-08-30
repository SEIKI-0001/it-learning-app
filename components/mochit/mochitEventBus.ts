import type { MochitContext, MochitEvent, MochitEventSignal } from "./mochitEvents";

const MOCHIT_EVENT_NAME = "fequest:mochit";
let lastSignalId = 0;

export function createMochitEventSignal(
  type: MochitEvent,
  context?: MochitContext,
): MochitEventSignal {
  lastSignalId = Math.max(lastSignalId + 1, Date.now() * 1000);
  return { type, id: lastSignalId, ...(context ? { context } : {}) };
}

/**
 * モチットイベントを発火する。
 * context は任意で、渡さなければ従来どおりの汎用メッセージになる（後方互換）。
 */
export function emitMochitEvent(
  event: MochitEvent,
  context?: MochitContext,
): MochitEventSignal | null {
  if (typeof window === "undefined") return null;
  const signal = createMochitEventSignal(event, context);
  window.dispatchEvent(
    new CustomEvent<MochitEventSignal>(MOCHIT_EVENT_NAME, { detail: signal }),
  );
  return signal;
}

export function subscribeMochitEvent(
  listener: (signal: MochitEventSignal) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handleEvent = (event: Event) => {
    listener((event as CustomEvent<MochitEventSignal>).detail);
  };
  window.addEventListener(MOCHIT_EVENT_NAME, handleEvent);
  return () => window.removeEventListener(MOCHIT_EVENT_NAME, handleEvent);
}
