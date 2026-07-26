// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import FloatingMochit from "@/components/mochit/FloatingMochit";
import { emitMochitEvent } from "@/components/mochit/mochitEventBus";
import { FLOATING_MOCHIT_STORAGE_KEY } from "@/components/mochit/floatingMochitPreferences";

const storageValues = new Map<string, string>();
const localStorageStub: Storage = {
  get length() {
    return storageValues.size;
  },
  clear() {
    storageValues.clear();
  },
  getItem(key) {
    return storageValues.get(key) ?? null;
  },
  key(index) {
    return [...storageValues.keys()][index] ?? null;
  },
  removeItem(key) {
    storageValues.delete(key);
  },
  setItem(key, value) {
    storageValues.set(key, String(value));
  },
};

beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageStub,
  });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 390,
    writable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 844,
    writable: true,
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("FloatingMochit touch response", () => {
  it("subscribes to learning events and keeps a higher-priority reaction over a tap", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });
    const mochit = pet.querySelector(".mochit");

    emitMochitEvent("checkpointClear");
    await waitFor(() => {
      expect(mochit).toHaveAttribute("data-active-event", "checkpointClear");
    });

    fireEvent.keyDown(pet, { key: "Enter" });
    expect(mochit).toHaveAttribute("data-active-event", "checkpointClear");
  });

  it("renders at the upper-right default and compresses on press", async () => {
    render(<FloatingMochit reducedMotion={false} />);

    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });
    expect(pet.parentElement).toHaveStyle({
      left: "302px",
      top: "16px",
    });

    fireEvent.pointerDown(pet, {
      pointerId: 1,
      button: 0,
      clientX: 330,
      clientY: 44,
    });

    expect(pet).toHaveAttribute("data-motion", "pressed");
  });

  it("rebounds after a tap", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });

    vi.useFakeTimers();
    fireEvent.pointerDown(pet, {
      pointerId: 1,
      button: 0,
      clientX: 330,
      clientY: 44,
    });
    fireEvent.pointerUp(pet, {
      pointerId: 1,
      button: 0,
      clientX: 330,
      clientY: 44,
    });

    expect(pet).toHaveAttribute("data-motion", "rebounding");
    await act(async () => {
      vi.advanceTimersByTime(520);
    });
    expect(pet).toHaveAttribute("data-motion", "idle");
  });

  it("keeps reduced-motion interaction static", async () => {
    render(<FloatingMochit reducedMotion />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });

    fireEvent.pointerDown(pet, {
      pointerId: 1,
      button: 0,
      clientX: 330,
      clientY: 44,
    });
    fireEvent.pointerUp(pet, {
      pointerId: 1,
      button: 0,
      clientX: 330,
      clientY: 44,
    });

    await waitFor(() => {
      expect(pet).toHaveAttribute("data-motion", "idle");
    });
  });
});

describe("FloatingMochit dragging", () => {
  it("keeps and saves the drag position when a learning event arrives", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });

    fireEvent.pointerDown(pet, {
      pointerId: 8,
      button: 0,
      clientX: 330,
      clientY: 44,
    });
    fireEvent.pointerMove(pet, {
      pointerId: 8,
      clientX: 200,
      clientY: 200,
    });
    expect(pet.parentElement).toHaveStyle({ left: "172px", top: "172px" });

    emitMochitEvent("correct");
    await waitFor(() => {
      expect(pet.querySelector(".mochit")).toHaveAttribute(
        "data-active-event",
        "correct",
      );
    });
    expect(pet.parentElement).toHaveStyle({ left: "172px", top: "172px" });

    fireEvent.pointerUp(pet, {
      pointerId: 8,
      button: 0,
      clientX: 200,
      clientY: 200,
    });
    expect(
      JSON.parse(
        window.localStorage.getItem(FLOATING_MOCHIT_STORAGE_KEY)!,
      ).position,
    ).toEqual({ x: 172, y: 172 });
  });

  it("drags, clamps, and saves without using the tap rebound", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });

    fireEvent.pointerDown(pet, {
      pointerId: 1,
      button: 0,
      clientX: 330,
      clientY: 44,
    });
    fireEvent.pointerMove(pet, {
      pointerId: 1,
      clientX: -100,
      clientY: 900,
    });

    expect(pet).toHaveAttribute("data-motion", "dragging");
    expect(pet.parentElement).toHaveStyle({
      left: "16px",
      top: "756px",
    });

    fireEvent.pointerUp(pet, {
      pointerId: 1,
      button: 0,
      clientX: -100,
      clientY: 900,
    });

    expect(pet).toHaveAttribute("data-motion", "settling");
    expect(
      JSON.parse(
        window.localStorage.getItem(FLOATING_MOCHIT_STORAGE_KEY)!,
      ),
    ).toEqual({
      visible: true,
      position: { x: 16, y: 756 },
    });
  });

  it("keeps small pointer movement as a tap", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });

    fireEvent.pointerDown(pet, {
      pointerId: 1,
      button: 0,
      clientX: 330,
      clientY: 44,
    });
    fireEvent.pointerMove(pet, {
      pointerId: 1,
      clientX: 334,
      clientY: 47,
    });
    fireEvent.pointerUp(pet, {
      pointerId: 1,
      button: 0,
      clientX: 334,
      clientY: 47,
    });

    expect(pet).toHaveAttribute("data-motion", "rebounding");
    expect(window.localStorage.getItem(FLOATING_MOCHIT_STORAGE_KEY)).toBeNull();
  });
});

describe("FloatingMochit visibility menu", () => {
  it("ignores learning events while hidden without throwing", () => {
    window.localStorage.setItem(
      FLOATING_MOCHIT_STORAGE_KEY,
      JSON.stringify({ visible: false, position: { x: 120, y: 80 } }),
    );
    render(<FloatingMochit reducedMotion={false} />);

    expect(() => emitMochitEvent("correct")).not.toThrow();
    expect(
      screen.queryByRole("button", { name: "モチットを触る" }),
    ).not.toBeInTheDocument();
  });

  it("opens Hide on right-click and hides only the floating pet", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });

    fireEvent.contextMenu(pet, { clientX: 330, clientY: 44 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Hide" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "モチットを触る" }),
      ).not.toBeInTheDocument();
    });
    expect(
      JSON.parse(
        window.localStorage.getItem(FLOATING_MOCHIT_STORAGE_KEY)!,
      ).visible,
    ).toBe(false);
  });

  it("opens the same menu after a stationary long press", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });
    vi.useFakeTimers();

    fireEvent.pointerDown(pet, {
      pointerId: 1,
      button: 0,
      clientX: 330,
      clientY: 44,
    });
    await act(async () => {
      vi.advanceTimersByTime(550);
    });

    expect(screen.getByRole("menuitem", { name: "Hide" })).toBeInTheDocument();
    fireEvent.pointerUp(pet, {
      pointerId: 1,
      button: 0,
      clientX: 330,
      clientY: 44,
    });
    expect(pet).toHaveAttribute("data-motion", "idle");
  });

  it("cancels long-press when the gesture becomes a drag", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });
    vi.useFakeTimers();

    fireEvent.pointerDown(pet, {
      pointerId: 1,
      button: 0,
      clientX: 330,
      clientY: 44,
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerMove(pet, {
      pointerId: 1,
      clientX: 300,
      clientY: 100,
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByRole("menuitem", { name: "Hide" })).toBeNull();
    expect(pet).toHaveAttribute("data-motion", "dragging");
  });

  it("supports keyboard reaction, context-menu shortcut, and Escape", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });

    fireEvent.keyDown(pet, { key: "Enter" });
    expect(pet).toHaveAttribute("data-motion", "rebounding");

    fireEvent.keyDown(pet, { key: "F10", shiftKey: true });
    expect(screen.getByRole("menuitem", { name: "Hide" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menuitem", { name: "Hide" })).toBeNull();
    expect(pet).toHaveFocus();
  });
});
