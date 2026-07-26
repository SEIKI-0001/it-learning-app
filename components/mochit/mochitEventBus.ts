import type { MochitEvent, MochitEventSignal } from "./mochitEvents";

const MOCHIT_EVENT_NAME = "fequest:mochit";
let lastSignalId = 0;

export function createMochitEventSignal(
  type: MochitEvent,
): MochitEventSignal {
  lastSignalId = Math.max(lastSignalId + 1, Date.now() * 1000);
  return { type, id: lastSignalId };
}

export function emitMochitEvent(
  event: MochitEvent,
): MochitEventSignal | null {
  if (typeof window === "undefined") return null;
  const signal = createMochitEventSignal(event);
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
