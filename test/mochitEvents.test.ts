import { describe, expect, it } from "vitest";
import {
  createMochitReactionController,
  MOCHIT_EVENT_PRIORITIES,
  MOCHIT_EVENT_REACTION_MS,
  MOCHIT_EVENT_TRIGGERS,
  type MochitEvent,
} from "@/components/mochit/mochitEvents";
import { MOCHIT_RIVE_TRIGGER_INPUTS } from "@/components/mochit/mochitTypes";

const ALL_EVENTS = Object.keys(MOCHIT_EVENT_TRIGGERS) as MochitEvent[];

describe("mochitEvents mapping", () => {
  it("maps every semantic event to a defined state-machine trigger", () => {
    for (const event of ALL_EVENTS) {
      expect(MOCHIT_RIVE_TRIGGER_INPUTS).toContain(MOCHIT_EVENT_TRIGGERS[event]);
      expect(MOCHIT_EVENT_PRIORITIES[event]).toBeGreaterThan(0);
      expect(MOCHIT_EVENT_REACTION_MS[event]).toBeGreaterThan(0);
    }
  });

  it("orders priorities per spec: checkpoint > badge > task > allCorrect > answer > encourage > tap", () => {
    const p = MOCHIT_EVENT_PRIORITIES;
    expect(p.checkpointClear).toBeGreaterThan(p.badgeEarned);
    expect(p.badgeEarned).toBeGreaterThan(p.taskComplete);
    expect(p.taskComplete).toBeGreaterThan(p.allCorrect);
    expect(p.allCorrect).toBeGreaterThan(p.correct);
    expect(p.correct).toBe(p.incorrect);
    expect(p.correct).toBeGreaterThan(p.encourage);
    expect(p.encourage).toBeGreaterThan(p.tap);
  });
});

describe("createMochitReactionController", () => {
  const make = () => {
    let time = 0;
    const controller = createMochitReactionController(() => time);
    return { controller, advance: (ms: number) => { time += ms; } };
  };

  it("accepts a higher-priority event during a lower-priority reaction", () => {
    const { controller } = make();
    expect(controller.dispatch("tap")).toBe(true);
    expect(controller.dispatch("checkpointClear")).toBe(true);
    expect(controller.activeEvent()).toBe("checkpointClear");
  });

  it("rejects lower-priority events while a higher-priority reaction is running", () => {
    const { controller } = make();
    expect(controller.dispatch("checkpointClear")).toBe(true);
    expect(controller.dispatch("tap")).toBe(false);
    expect(controller.dispatch("correct")).toBe(false);
    expect(controller.activeEvent()).toBe("checkpointClear");
  });

  it("accepts lower-priority events after the reaction window expires", () => {
    const { controller, advance } = make();
    controller.dispatch("checkpointClear");
    advance(MOCHIT_EVENT_REACTION_MS.checkpointClear + 1);
    expect(controller.activeEvent()).toBeNull();
    expect(controller.dispatch("tap")).toBe(true);
    expect(controller.activeEvent()).toBe("tap");
  });

  it("lets equal-priority events replace each other (consecutive answers)", () => {
    const { controller } = make();
    expect(controller.dispatch("correct")).toBe(true);
    expect(controller.dispatch("incorrect")).toBe(true);
    expect(controller.activeEvent()).toBe("incorrect");
  });

  it("clear() releases the active reaction immediately", () => {
    const { controller } = make();
    controller.dispatch("checkpointClear");
    controller.clear();
    expect(controller.activeEvent()).toBeNull();
    expect(controller.dispatch("tap")).toBe(true);
  });
});
