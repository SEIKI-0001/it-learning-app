import { describe, expect, it } from "vitest";
import {
  applyMochitRiveInputs,
  buildMochitRiveInputValues,
  fireMochitRiveTrigger,
  MOCHIT_RIVE_BOOLEAN_INPUTS,
  MOCHIT_RIVE_NUMBER_INPUTS,
  MOCHIT_SCREEN_CONTEXT_CODES,
  shouldPlayMochitRive,
  type MochitRiveInputLike,
  type MochitRiveInputSyncProps,
} from "@/components/mochit/mochitTypes";

const baseProps: MochitRiveInputSyncProps = {
  state: "normal",
  growthStage: 1,
  reducedMotion: false,
  compact: false,
  primary: true,
  visible: true,
  focused: false,
  screenContext: "today",
};

const makeInput = (name: string): MochitRiveInputLike & { fired: number } => {
  const input = {
    name,
    value: undefined as number | boolean | undefined,
    fired: 0,
    fire() {
      input.fired += 1;
    },
  };
  return input;
};

describe("buildMochitRiveInputValues", () => {
  it("derives mood from state when mood is not given", () => {
    expect(buildMochitRiveInputValues({ ...baseProps, state: "cheering" }).numbers.mood).toBe(1);
    expect(buildMochitRiveInputValues({ ...baseProps, state: "thinking" }).numbers.mood).toBeLessThan(0);
    expect(buildMochitRiveInputValues({ ...baseProps, mood: 0.25 }).numbers.mood).toBe(0.25);
  });

  it("disables pointer tracking and marks reducedMotion when reduced motion is requested", () => {
    const values = buildMochitRiveInputValues({ ...baseProps, reducedMotion: true });
    expect(values.booleans.reducedMotion).toBe(true);
    expect(values.booleans.pointerEnabled).toBe(false);
  });

  it("never claims primaryInstance for compact instances", () => {
    const values = buildMochitRiveInputValues({ ...baseProps, compact: true, primary: true });
    expect(values.booleans.primaryInstance).toBe(false);
  });

  it("encodes screenContext as its numeric code", () => {
    const values = buildMochitRiveInputValues({ ...baseProps, screenContext: "quizResult" });
    expect(values.numbers.screenContext).toBe(MOCHIT_SCREEN_CONTEXT_CODES.quizResult);
    expect(values.booleans.isAnswering).toBe(true);
  });

  it("reflects visibility into isVisible", () => {
    expect(buildMochitRiveInputValues({ ...baseProps, visible: false }).booleans.isVisible).toBe(false);
  });
});

describe("applyMochitRiveInputs", () => {
  it("applies every contract input when all are present", () => {
    const inputs = [...MOCHIT_RIVE_BOOLEAN_INPUTS, ...MOCHIT_RIVE_NUMBER_INPUTS].map(makeInput);
    const values = buildMochitRiveInputValues(baseProps);
    const result = applyMochitRiveInputs(inputs, values);
    expect(result.missing).toEqual([]);
    expect(result.applied).toHaveLength(MOCHIT_RIVE_BOOLEAN_INPUTS.length + MOCHIT_RIVE_NUMBER_INPUTS.length);
    expect(inputs.find((i) => i.name === "growthStage")?.value).toBe(1);
    expect(inputs.find((i) => i.name === "isActive")?.value).toBe(true);
  });

  it("reports missing inputs without crashing and still applies the rest", () => {
    const inputs = [makeInput("mood"), makeInput("isActive")];
    const values = buildMochitRiveInputValues(baseProps);
    const result = applyMochitRiveInputs(inputs, values);
    expect(result.applied.sort()).toEqual(["isActive", "mood"]);
    expect(result.missing).toContain("growthStage");
    expect(result.missing).toContain("reducedMotion");
  });

  it("handles a state machine with no inputs at all", () => {
    const result = applyMochitRiveInputs([], buildMochitRiveInputValues(baseProps));
    expect(result.applied).toEqual([]);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});

describe("fireMochitRiveTrigger", () => {
  it("fires an existing trigger and reports success", () => {
    const trigger = makeInput("triggerCorrect");
    expect(fireMochitRiveTrigger([trigger], "triggerCorrect")).toBe(true);
    expect(trigger.fired).toBe(1);
  });

  it("returns false for a missing trigger instead of crashing", () => {
    expect(fireMochitRiveTrigger([], "triggerCheckpointClear")).toBe(false);
  });
});

describe("shouldPlayMochitRive", () => {
  it("plays only while visible in the viewport and the document is shown", () => {
    expect(shouldPlayMochitRive({ inViewport: true, documentHidden: false, loadFailed: false })).toBe(true);
    expect(shouldPlayMochitRive({ inViewport: false, documentHidden: false, loadFailed: false })).toBe(false);
    expect(shouldPlayMochitRive({ inViewport: true, documentHidden: true, loadFailed: false })).toBe(false);
    expect(shouldPlayMochitRive({ inViewport: true, documentHidden: false, loadFailed: true })).toBe(false);
  });
});
