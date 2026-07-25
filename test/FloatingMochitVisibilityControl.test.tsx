// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import FloatingMochitVisibilityControl from "@/components/mochit/FloatingMochitVisibilityControl";
import {
  FLOATING_MOCHIT_STORAGE_KEY,
  loadFloatingMochitPreferences,
  setFloatingMochitVisibility,
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
  cleanup();
  window.localStorage.clear();
});

describe("FloatingMochitVisibilityControl", () => {
  it("restores a hidden pet without losing its saved position", async () => {
    window.localStorage.setItem(
      FLOATING_MOCHIT_STORAGE_KEY,
      JSON.stringify({
        visible: false,
        position: { x: 120, y: 80 },
      }),
    );
    render(<FloatingMochitVisibilityControl />);

    const restore = await screen.findByRole("button", {
      name: "フローティングモチットを表示",
    });
    fireEvent.click(restore);

    expect(loadFloatingMochitPreferences()).toEqual({
      visible: true,
      position: { x: 120, y: 80 },
    });
    expect(
      screen.getByText("フローティングモチットは表示中です"),
    ).toBeInTheDocument();
  });

  it("updates when the floating pet is hidden in the same window", async () => {
    render(<FloatingMochitVisibilityControl />);
    await screen.findByText("フローティングモチットは表示中です");

    setFloatingMochitVisibility(false);

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "フローティングモチットを表示",
        }),
      ).toBeInTheDocument();
    });
  });

  it("renders a restore-only control only while the pet is hidden", async () => {
    const { rerender } = render(
      <FloatingMochitVisibilityControl restoreOnly />,
    );
    await waitFor(() => {
      expect(
        screen.queryByText("フローティングモチットは表示中です"),
      ).toBeNull();
    });

    setFloatingMochitVisibility(false);
    rerender(<FloatingMochitVisibilityControl restoreOnly />);

    expect(
      await screen.findByRole("button", {
        name: "フローティングモチットを表示",
      }),
    ).toBeInTheDocument();
  });
});
