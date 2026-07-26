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
  window.innerWidth = 390;
  window.innerHeight = 844;
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("FloatingMochit touch response", () => {
  it("shows a non-live positive bubble for an accepted correct event", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    await screen.findByRole("button", { name: "モチットを触る" });

    emitMochitEvent("correct");

    const bubble = await screen.findByTestId("floating-mochit-bubble");
    expect([
      "ナイス！",
      "正解！",
      "その調子！",
      "いいね！",
    ]).toContain(bubble.textContent);
    expect(bubble).not.toHaveAttribute("aria-live");
  });

  it("shows only supportive copy for an accepted incorrect event", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    await screen.findByRole("button", { name: "モチットを触る" });

    emitMochitEvent("incorrect");

    const bubble = await screen.findByTestId("floating-mochit-bubble");
    expect([
      "ここで覚えればOK！",
      "解説を確認しよう",
      "次に活かそう！",
    ]).toContain(bubble.textContent);
    expect(bubble).not.toHaveTextContent(/ダメ|失敗|残念|泣/);
  });

  it("replaces a lower-priority bubble and rejects a later lower-priority one", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    await screen.findByRole("button", { name: "モチットを触る" });

    emitMochitEvent("encourage");
    await screen.findByTestId("floating-mochit-bubble");

    emitMochitEvent("checkpointClear");
    await waitFor(() => {
      expect(screen.getByTestId("floating-mochit-bubble")).toHaveTextContent(
        "チェックポイント突破！",
      );
    });

    emitMochitEvent("correct");
    expect(screen.getByTestId("floating-mochit-bubble")).toHaveTextContent(
      "チェックポイント突破！",
    );
  });

  it("removes a correct bubble after 1.4 seconds", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    await screen.findByRole("button", { name: "モチットを触る" });
    vi.useFakeTimers();

    await act(async () => {
      emitMochitEvent("correct");
    });
    expect(screen.getByTestId("floating-mochit-bubble")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1_400);
    });
    expect(screen.queryByTestId("floating-mochit-bubble")).toBeNull();
  });

  it("closes the bubble when a drag starts", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });
    emitMochitEvent("correct");
    await screen.findByTestId("floating-mochit-bubble");

    fireEvent.pointerDown(pet, {
      pointerId: 12,
      button: 0,
      clientX: 320,
      clientY: 60,
    });
    fireEvent.pointerMove(pet, {
      pointerId: 12,
      clientX: 280,
      clientY: 120,
    });

    expect(screen.queryByTestId("floating-mochit-bubble")).toBeNull();
  });

  it("keeps the bubble visible in reduced-motion mode", async () => {
    render(<FloatingMochit reducedMotion />);
    await screen.findByRole("button", { name: "モチットを触る" });

    emitMochitEvent("encourage");

    expect(
      await screen.findByTestId("floating-mochit-bubble"),
    ).toBeInTheDocument();
  });

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
    expect(
      screen.getByRole("menu", { name: "モチットクイックメニュー" }),
    ).toBeInTheDocument();
  });

  it("renders a 108px hit area with an 84px Mochit at the upper-right default", async () => {
    render(<FloatingMochit reducedMotion={false} />);

    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });
    expect(pet.parentElement).toHaveStyle({
      left: "266px",
      top: "16px",
    });
    expect(pet.parentElement).toHaveClass("h-[108px]", "w-[108px]");
    expect(pet.querySelector(".mochit > div")).toHaveClass(
      "h-[84px]",
      "w-[84px]",
    );

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
    expect(
      screen.getByRole("menu", { name: "モチットクイックメニュー" }),
    ).toBeInTheDocument();
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
    expect(
      screen.getByRole("menu", { name: "モチットクイックメニュー" }),
    ).toBeInTheDocument();
  });
});

describe("FloatingMochit dragging", () => {
  it("reclamps a position saved for the old 72px size into the new viewport", async () => {
    window.localStorage.setItem(
      FLOATING_MOCHIT_STORAGE_KEY,
      JSON.stringify({
        visible: true,
        position: { x: 302, y: 756 },
      }),
    );

    render(<FloatingMochit reducedMotion={false} />);

    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });
    expect(pet.parentElement).toHaveStyle({
      left: "266px",
      top: "656px",
    });
  });

  it("reclamps the complete hit area when the viewport resizes", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });

    window.innerWidth = 320;
    window.innerHeight = 600;
    fireEvent(window, new Event("resize"));

    await waitFor(() => {
      expect(pet.parentElement).toHaveStyle({
        left: "196px",
        top: "16px",
      });
    });
  });

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
    expect(pet.parentElement).toHaveStyle({ left: "136px", top: "172px" });

    emitMochitEvent("correct");
    await waitFor(() => {
      expect(pet.querySelector(".mochit")).toHaveAttribute(
        "data-active-event",
        "correct",
      );
    });
    expect(pet.parentElement).toHaveStyle({ left: "136px", top: "172px" });

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
    ).toEqual({ x: 136, y: 172 });
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
      top: "656px",
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
      position: { x: 16, y: 656 },
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
    expect(
      screen.getByRole("menu", { name: "モチットクイックメニュー" }),
    ).toBeInTheDocument();
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

  it("opens the quick menu on right-click and hides only the floating pet", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });

    fireEvent.contextMenu(pet, { clientX: 330, clientY: 44 });
    fireEvent.click(
      screen.getByRole("menuitem", { name: "モチットを非表示" }),
    );

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

    expect(
      screen.getByRole("menuitem", { name: "モチットを非表示" }),
    ).toBeInTheDocument();
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

    expect(
      screen.queryByRole("menuitem", { name: "モチットを非表示" }),
    ).toBeNull();
    expect(pet).toHaveAttribute("data-motion", "dragging");
  });

  it("supports Enter, Space, context-menu shortcuts, and Escape", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });

    fireEvent.keyDown(pet, { key: "Enter" });
    expect(pet).toHaveAttribute("data-motion", "rebounding");
    expect(
      screen.getByRole("menu", { name: "モチットクイックメニュー" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.keyDown(pet, { key: " " });
    expect(
      screen.getByRole("menu", { name: "モチットクイックメニュー" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.keyDown(pet, { key: "F10", shiftKey: true });
    expect(
      screen.getByRole("menuitem", { name: "モチットを非表示" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen.queryByRole("menuitem", { name: "モチットを非表示" }),
    ).toBeNull();
    expect(pet).toHaveFocus();
  });

  it("offers the five shortcut links with exact destinations", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });
    fireEvent.contextMenu(pet);

    const links = [
      ["今日の学習", "/today"],
      ["復習する", "/review"],
      ["ロードマップ", "/plan"],
      ["進捗を見る", "/progress"],
      ["モチットの成長", "/avatar"],
    ] as const;
    for (const [name, href] of links) {
      expect(screen.getByRole("menuitem", { name })).toHaveAttribute(
        "href",
        href,
      );
    }
  });

  it("closes on an outside pointer and after selecting a link", async () => {
    render(
      <div>
        <FloatingMochit reducedMotion={false} />
        <button type="button">Outside</button>
      </div>,
    );
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });

    fireEvent.contextMenu(pet);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
    expect(
      screen.queryByRole("menu", { name: "モチットクイックメニュー" }),
    ).toBeNull();

    fireEvent.contextMenu(pet);
    const todayLink = screen.getByRole("menuitem", { name: "今日の学習" });
    todayLink.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    fireEvent.click(todayLink);
    expect(
      screen.queryByRole("menu", { name: "モチットクイックメニュー" }),
    ).toBeNull();
  });

  it("does not open the menu for a drag and closes an active bubble when opening", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });
    emitMochitEvent("correct");
    await screen.findByTestId("floating-mochit-bubble");

    fireEvent.contextMenu(pet);
    expect(screen.queryByTestId("floating-mochit-bubble")).toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerDown(pet, {
      pointerId: 31,
      button: 0,
      clientX: 320,
      clientY: 60,
    });
    fireEvent.pointerMove(pet, {
      pointerId: 31,
      clientX: 220,
      clientY: 180,
    });
    fireEvent.pointerUp(pet, {
      pointerId: 31,
      button: 0,
      clientX: 220,
      clientY: 180,
    });
    expect(
      screen.queryByRole("menu", { name: "モチットクイックメニュー" }),
    ).toBeNull();
  });

  it("keeps the menu open and suppresses bubbles while the menu is visible", async () => {
    render(<FloatingMochit reducedMotion={false} />);
    const pet = await screen.findByRole("button", {
      name: "モチットを触る",
    });

    fireEvent.contextMenu(pet);
    await act(async () => {
      emitMochitEvent("correct");
      await Promise.resolve();
    });

    expect(
      screen.getByRole("menu", { name: "モチットクイックメニュー" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("floating-mochit-bubble")).toBeNull();
  });
});
