// @vitest-environment jsdom

import { useEffect } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMochitSleep, type MochitSleepControls } from "@/components/mochit/useMochitSleep";
import type { MochitWakeReason } from "@/components/mochit/mochitSleep";

let hidden = false;
const controlsRef: { current: MochitSleepControls | null } = { current: null };
let wakes: MochitWakeReason[] = [];

function Harness({ enabled = true, suppressed = false }: { enabled?: boolean; suppressed?: boolean }) {
  const controls = useMochitSleep({ enabled, suppressed, onWake: (reason) => wakes.push(reason) });
  useEffect(() => {
    controlsRef.current = controls;
  });
  return <div data-testid="phase">{controls.sleeping ? "sleepy" : "awake"}</div>;
}

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  wakes = [];
  controlsRef.current = null;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete (document as { hidden?: unknown }).hidden;
});

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const phase = (view: ReturnType<typeof render>) => view.getByTestId("phase").textContent;
const fire = (type: string, target: EventTarget = document.body) =>
  act(() => {
    target.dispatchEvent(new Event(type, { bubbles: true }));
  });

describe("useMochitSleep", () => {
  it("60秒未満では眠らず、60秒無操作で sleepy", () => {
    const view = render(<Harness />);
    advance(59_000);
    expect(phase(view)).toBe("awake");
    advance(1_000);
    expect(phase(view)).toBe("sleepy");
  });

  it.each(["pointerdown", "keydown", "touchstart", "scroll"])("%s でタイマーがリセットされる", (type) => {
    const view = render(<Harness />);
    advance(50_000);
    fire(type);
    advance(50_000);
    expect(phase(view)).toBe("awake");
    advance(10_000);
    expect(phase(view)).toBe("sleepy");
  });

  it("要素内の scroll（bubble しない）も capture で拾う", () => {
    const view = render(<Harness />);
    const scroller = document.createElement("div");
    document.body.appendChild(scroller);
    advance(50_000);
    act(() => {
      scroller.dispatchEvent(new Event("scroll", { bubbles: false }));
    });
    advance(50_000);
    expect(phase(view)).toBe("awake");
    scroller.remove();
  });

  it("mousemove / pointermove だけではリセットしない", () => {
    const view = render(<Harness />);
    advance(50_000);
    fire("mousemove");
    fire("pointermove");
    advance(10_000);
    expect(phase(view)).toBe("sleepy");
    // mousemove では起きない
    fire("mousemove");
    expect(phase(view)).toBe("sleepy");
    expect(wakes).toEqual([]);
  });

  it("sleepy 中の活動で awake に戻り、onWake(activity)", () => {
    const view = render(<Harness />);
    advance(60_000);
    fire("pointerdown");
    expect(phase(view)).toBe("awake");
    expect(wakes).toEqual(["activity"]);
  });

  it("notifyLearningEvent は同期で awake に戻す（learning）", () => {
    const view = render(<Harness />);
    advance(60_000);
    act(() => controlsRef.current!.notifyLearningEvent());
    expect(phase(view)).toBe("awake");
    expect(wakes).toEqual(["learning"]);
  });

  it("hidden 中はタイマー停止、復帰後は新しく60秒", () => {
    const view = render(<Harness />);
    advance(40_000);
    act(() => {
      hidden = true;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(20 * 60_000);
    expect(phase(view)).toBe("awake");
    act(() => {
      hidden = false;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(59_000);
    expect(phase(view)).toBe("awake");
    advance(1_000);
    expect(phase(view)).toBe("sleepy");
  });

  it("suppressed（content/result）の間は眠らない", () => {
    const view = render(<Harness suppressed />);
    advance(5 * 60_000);
    expect(phase(view)).toBe("awake");
    view.rerender(<Harness suppressed={false} />);
    advance(60_000);
    expect(phase(view)).toBe("sleepy");
  });

  it("enabled=false では監視しない・アンマウントでリスナーを外す", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const view = render(<Harness enabled={false} />);
    advance(5 * 60_000);
    expect(phase(view)).toBe("awake");
    view.rerender(<Harness />);
    view.unmount();
    const removed = remove.mock.calls.map((c) => c[0]);
    for (const type of ["pointerdown", "keydown", "touchstart", "scroll", "visibilitychange"]) {
      expect(removed).toContain(type);
    }
    remove.mockRestore();
  });
});
