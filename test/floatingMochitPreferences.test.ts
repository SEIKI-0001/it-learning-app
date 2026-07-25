// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  FLOATING_MOCHIT_STORAGE_KEY,
  clampFloatingMochitPosition,
  getDefaultFloatingMochitPosition,
  loadFloatingMochitPreferences,
  parseFloatingMochitPreferences,
  saveFloatingMochitPreferences,
  setFloatingMochitVisibility,
  subscribeToFloatingMochitPreferences,
} from "@/components/mochit/floatingMochitPreferences";

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
});

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("floating Mochit viewport geometry", () => {
  it("places the default pet at the upper-right margin", () => {
    expect(getDefaultFloatingMochitPosition(390, 844, 72, 72)).toEqual({
      x: 302,
      y: 16,
    });
  });

  it("clamps the complete hit area inside the viewport", () => {
    expect(
      clampFloatingMochitPosition(
        { x: -20, y: 900 },
        390,
        844,
        72,
        72,
      ),
    ).toEqual({
      x: 16,
      y: 756,
    });
  });

  it("keeps the margin stable when the viewport is smaller than the pet", () => {
    expect(
      clampFloatingMochitPosition({ x: 200, y: 200 }, 60, 60, 72, 72),
    ).toEqual({
      x: 16,
      y: 16,
    });
  });
});

describe("floating Mochit preference parsing", () => {
  it("defaults missing or malformed saved data to visible", () => {
    expect(parseFloatingMochitPreferences(null)).toEqual({
      visible: true,
      position: null,
    });
    expect(parseFloatingMochitPreferences("{broken")).toEqual({
      visible: true,
      position: null,
    });
  });

  it("preserves valid visibility while dropping an invalid position", () => {
    expect(
      parseFloatingMochitPreferences(
        '{"visible":false,"position":{"x":"no","y":2}}',
      ),
    ).toEqual({
      visible: false,
      position: null,
    });
  });

  it("accepts a finite saved position", () => {
    expect(
      parseFloatingMochitPreferences(
        '{"visible":true,"position":{"x":120.5,"y":80}}',
      ),
    ).toEqual({
      visible: true,
      position: { x: 120.5, y: 80 },
    });
  });
});

describe("floating Mochit device storage", () => {
  it("persists preferences and notifies same-window subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToFloatingMochitPreferences(listener);

    saveFloatingMochitPreferences({
      visible: false,
      position: { x: 120, y: 80 },
    });

    expect(
      JSON.parse(window.localStorage.getItem(FLOATING_MOCHIT_STORAGE_KEY)!),
    ).toEqual({
      visible: false,
      position: { x: 120, y: 80 },
    });
    expect(listener).toHaveBeenCalledWith({
      visible: false,
      position: { x: 120, y: 80 },
    });
    unsubscribe();
  });

  it("preserves the saved position when visibility changes", () => {
    saveFloatingMochitPreferences({
      visible: true,
      position: { x: 144, y: 96 },
    });

    setFloatingMochitVisibility(false);

    expect(loadFloatingMochitPreferences()).toEqual({
      visible: false,
      position: { x: 144, y: 96 },
    });
  });

  it("still notifies the current page when localStorage throws", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementationOnce(() => {
      throw new DOMException("blocked");
    });
    const listener = vi.fn();
    const unsubscribe = subscribeToFloatingMochitPreferences(listener);

    saveFloatingMochitPreferences({
      visible: false,
      position: null,
    });

    expect(listener).toHaveBeenCalledWith({
      visible: false,
      position: null,
    });
    unsubscribe();
  });
});
