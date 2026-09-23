// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import FloatingMochit from "@/components/mochit/FloatingMochit";
import { emitMochitEvent } from "@/components/mochit/mochitEventBus";
import {
  loadFocusSessionLog,
  resetFocusSessionStoreForTest,
  startMochitFocus,
} from "@/components/mochit/mochitFocusSessionStore";

// FloatingMochit × Focus Session（集中タイマー）× Activity の結合。描画は本物の MochitSvg（WAAPI はスタブ）。

const storageValues = new Map<string, string>();
beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      get length() {
        return storageValues.size;
      },
      clear: () => storageValues.clear(),
      getItem: (key: string) => storageValues.get(key) ?? null,
      key: (index: number) => [...storageValues.keys()][index] ?? null,
      removeItem: (key: string) => storageValues.delete(key),
      setItem: (key: string, value: string) => storageValues.set(key, String(value)),
    } satisfies Storage,
  });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390, writable: true });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 844, writable: true });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-09-23T10:00:00+09:00"));
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    writable: true,
    value: function animate() {
      const anim = {
        playState: "running",
        effect: { setKeyframes: vi.fn() },
        updatePlaybackRate: vi.fn(),
        persist: vi.fn(),
        cancel: vi.fn(() => (anim.playState = "idle")),
        finished: new Promise(() => {}),
      };
      return anim;
    },
  });
});

afterEach(() => {
  cleanup();
  resetFocusSessionStoreForTest();
  window.localStorage.clear();
  vi.clearAllTimers();
  vi.useRealTimers();
  delete (Element.prototype as { animate?: unknown }).animate;
});

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

async function renderPet() {
  render(<FloatingMochit reducedMotion={false} />);
  const pet = await screen.findByRole("button", { name: "モチットを触る" });
  await waitFor(() => expect(pet.querySelector("#Pupil_L")).not.toBeNull());
  return pet;
}

const chip = () => document.querySelector<HTMLButtonElement>("[data-focus-chip]");
const openMenu = (pet: HTMLElement) => {
  fireEvent.contextMenu(pet);
  return screen.getByRole("menu", { name: "モチットクイックメニュー" });
};

describe("FloatingMochit: もちっとと集中する", () => {
  it("メニューから集中を始めると studying になり、足元に FOCUS 25:00 を出す", async () => {
    const pet = await renderPet();
    expect(pet).toHaveAttribute("data-activity", "idle");
    expect(chip()).toBeNull();
    const menu = openMenu(pet);
    fireEvent.click(within(menu).getByRole("menuitem", { name: /モチットと集中する/ }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(pet).toHaveAttribute("data-activity", "studying");
    expect(chip()).toHaveTextContent("FOCUS25:00");
    expect(await screen.findByTestId("floating-mochit-bubble")).toHaveTextContent("いっしょに集中しよう");
  });

  it("残り時間は絶対時刻から表示する（6分18秒後に 18:42）", async () => {
    await renderPet();
    act(() => startMochitFocus());
    advance(6 * 60_000 + 18_000);
    await waitFor(() => expect(chip()).toHaveTextContent("FOCUS18:42"));
    expect(chip()).toHaveAttribute("aria-label", "集中 残り18分42秒。メニューを開く");
  });

  it("集中中・休憩中は60秒無操作でも眠らない。一時停止中は通常どおり眠る", async () => {
    const pet = await renderPet();
    act(() => startMochitFocus());
    advance(120_000);
    expect(pet).toHaveAttribute("data-sleep", "awake");
    const menu = openMenu(pet);
    fireEvent.click(within(menu).getByRole("menuitem", { name: "一時停止" }));
    expect(pet).toHaveAttribute("data-activity", "idle");
    expect(chip()).toHaveTextContent("PAUSE");
    advance(61_000);
    expect(pet).toHaveAttribute("data-sleep", "sleepy");
  });

  it("一時停止中の時間は数えず、再開すると続きから", async () => {
    const pet = await renderPet();
    act(() => startMochitFocus());
    advance(60_000);
    fireEvent.click(within(openMenu(pet)).getByRole("menuitem", { name: "一時停止" }));
    advance(10 * 60_000);
    expect(chip()).toHaveTextContent("PAUSE24:00");
    fireEvent.click(within(openMenu(pet)).getByRole("menuitem", { name: "再開する" }));
    expect(pet).toHaveAttribute("data-activity", "studying");
    await waitFor(() => expect(chip()).toHaveTextContent("FOCUS24:00"));
  });

  it("25分で集中を終えて小さく達成し、休憩を選ぶと resting、5分後に idle へ戻る", async () => {
    const pet = await renderPet();
    act(() => startMochitFocus());
    advance(25 * 60_000 + 100);
    expect(pet).toHaveAttribute("data-activity", "idle");
    expect(chip()).toHaveTextContent("DONE");
    await waitFor(() =>
      expect(screen.getByTestId("floating-mochit-bubble")).toHaveTextContent("集中おつかれさま！休憩する？"),
    );
    expect(loadFocusSessionLog()).toEqual([
      expect.objectContaining({ completed: true, focusedMs: 25 * 60_000 }),
    ]);

    fireEvent.click(chip()!);
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "5分休憩する" }));
    expect(pet).toHaveAttribute("data-activity", "resting");
    expect(chip()).toHaveTextContent("BREAK05:00");
    advance(120_000);
    expect(pet).toHaveAttribute("data-sleep", "awake");

    advance(3 * 60_000 + 100);
    expect(pet).toHaveAttribute("data-activity", "idle");
    expect(chip()).toBeNull();
    await waitFor(() =>
      expect(screen.getByTestId("floating-mochit-bubble")).toHaveTextContent("休憩おわり。また一緒にやろう"),
    );
  });

  it("ページ遷移（再マウント・モジュール再読み込み）しても集中は続く", async () => {
    await renderPet();
    act(() => startMochitFocus());
    advance(60_000);
    cleanup();
    resetFocusSessionStoreForTest();
    const pet = await renderPet();
    expect(pet).toHaveAttribute("data-activity", "studying");
    await waitFor(() => expect(chip()).toHaveTextContent("FOCUS24:00"));
  });

  it("タブ非表示のまま終了時刻を過ぎても、復帰時に1回だけ完了する", async () => {
    const pet = await renderPet();
    act(() => startMochitFocus());
    // タイマーを進めずに時計だけ27分進める（非表示タブでタイマーが止まっていた状態）
    vi.setSystemTime(Date.now() + 27 * 60_000);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(pet).toHaveAttribute("data-activity", "idle");
    expect(loadFocusSessionLog()).toHaveLength(1);
    advance(60_000);
    expect(loadFocusSessionLog()).toHaveLength(1);
  });

  it("集中中の正解は Activity を壊さない。3問連続正解で少し強く喜ぶ", async () => {
    const pet = await renderPet();
    act(() => startMochitFocus());
    advance(2_000);
    act(() => {
      emitMochitEvent("correct");
    });
    await waitFor(() =>
      expect(["ナイス！", "正解！", "その調子！", "いいね！"]).toContain(
        screen.getByTestId("floating-mochit-bubble").textContent,
      ),
    );
    expect(pet).toHaveAttribute("data-activity", "studying");
    advance(2_000);
    act(() => {
      emitMochitEvent("correct");
    });
    advance(2_000);
    act(() => {
      emitMochitEvent("correct");
    });
    await waitFor(() =>
      expect(["連続正解！いい流れ！", "連続正解！冴えてるね"]).toContain(
        screen.getByTestId("floating-mochit-bubble").textContent,
      ),
    );
    expect(pet).toHaveAttribute("data-activity", "studying");
  });

  it("集中中もドラッグで位置を移動でき、足元のタイマーも一緒に動く", async () => {
    const pet = await renderPet();
    act(() => startMochitFocus());
    const root = pet.parentElement!;
    const before = root.style.left;
    fireEvent.pointerDown(pet, { pointerId: 1, button: 0, clientX: 300, clientY: 60 });
    fireEvent.pointerMove(pet, { pointerId: 1, clientX: 200, clientY: 200 });
    fireEvent.pointerUp(pet, { pointerId: 1, clientX: 200, clientY: 200 });
    expect(root.style.left).not.toBe(before);
    expect(root.contains(chip())).toBe(true);
    expect(pet).toHaveAttribute("data-activity", "studying");
  });
});
