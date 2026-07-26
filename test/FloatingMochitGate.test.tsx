// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import FloatingMochitGate from "@/components/mochit/FloatingMochitGate";

const routeState = vi.hoisted(() => ({
  pathname: "/today",
  appState: { profile: {} } as unknown,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => routeState.pathname,
}));

vi.mock("@/lib/useAppState", () => ({
  useAppState: () => [routeState.appState, vi.fn()],
}));

const storageValues = new Map<string, string>();

beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storageValues.get(key) ?? null,
      setItem: (key: string, value: string) =>
        storageValues.set(key, String(value)),
      removeItem: (key: string) => storageValues.delete(key),
      clear: () => storageValues.clear(),
      key: (index: number) => [...storageValues.keys()][index] ?? null,
      get length() {
        return storageValues.size;
      },
    },
  });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 390,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 844,
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
  storageValues.clear();
  routeState.pathname = "/today";
  routeState.appState = { profile: {} };
});

describe("FloatingMochitGate", () => {
  it("shows the floating Mochit on a configured user's normal app page", async () => {
    render(<FloatingMochitGate />);

    expect(
      await screen.findByRole("button", { name: "モチットを触る" }),
    ).toBeInTheDocument();
  });

  it("hides the floating Mochit when the user is not configured", () => {
    routeState.appState = null;
    render(<FloatingMochitGate />);

    expect(
      screen.queryByRole("button", { name: "モチットを触る" }),
    ).not.toBeInTheDocument();
  });

  it.each(["/", "/login", "/onboarding", "/avatar", "/dev/mochit"])(
    "hides the floating Mochit on %s",
    (pathname) => {
      routeState.pathname = pathname;
      render(<FloatingMochitGate />);

      expect(
        screen.queryByRole("button", { name: "モチットを触る" }),
      ).not.toBeInTheDocument();
    },
  );
});
