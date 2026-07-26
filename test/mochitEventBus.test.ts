// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import {
  emitMochitEvent,
  subscribeMochitEvent,
} from "@/components/mochit/mochitEventBus";

describe("mochitEventBus", () => {
  it("delivers consecutive events of the same type with unique signal ids", () => {
    const signals: Array<{ type: string; id: number }> = [];
    const unsubscribe = subscribeMochitEvent((signal) => signals.push(signal));

    const first = emitMochitEvent("correct");
    const second = emitMochitEvent("correct");

    expect(signals).toEqual([first, second]);
    expect(first?.type).toBe("correct");
    expect(second?.type).toBe("correct");
    expect(second?.id).not.toBe(first?.id);
    unsubscribe();
  });

  it("stops delivery after the subscriber unsubscribes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeMochitEvent(listener);

    emitMochitEvent("encourage");
    unsubscribe();
    emitMochitEvent("checkpointClear");

    expect(listener).toHaveBeenCalledOnce();
  });
});
