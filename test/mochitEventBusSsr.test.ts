import { describe, expect, it, vi } from "vitest";
import {
  emitMochitEvent,
  subscribeMochitEvent,
} from "@/components/mochit/mochitEventBus";

describe("mochitEventBus during SSR", () => {
  it("does not emit or subscribe when window is unavailable", () => {
    const listener = vi.fn();

    expect(emitMochitEvent("correct")).toBeNull();
    expect(() => subscribeMochitEvent(listener)()).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });
});
