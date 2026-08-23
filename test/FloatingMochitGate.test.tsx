// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import FloatingMochitGate from "@/components/mochit/FloatingMochitGate";
import { makeExamReadinessResult } from "@/test/fixtures/examReadiness/result";

const routeState = vi.hoisted(() => ({
  pathname: "/today",
  appState: { profile: {} } as unknown,
}));
const fetchCurrentExamReadiness = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => routeState.pathname,
}));

vi.mock("@/lib/useAppState", () => ({
  useAppState: () => [routeState.appState, vi.fn()],
}));

vi.mock("@/lib/userSession", () => ({
  fetchCurrentExamReadiness,
  loadCachedProgressBootstrap: () => null,
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

beforeEach(() => {
  fetchCurrentExamReadiness.mockReset().mockResolvedValue(null);
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

  it("shows current shared readiness and its saved primary improvement in the mounted menu", async () => {
    routeState.appState = {
      profile: {},
      progress: {
        reviewQueue: [],
        checkpointProgress: { currentCheckpointId: "cp5" },
      },
    };
    fetchCurrentExamReadiness.mockResolvedValue(makeExamReadinessResult({
      score: 85,
      band: "ready",
      validUntil: null,
      primaryImprovement: { code: "improve_field", fieldId: "technology" },
    }));
    render(<FloatingMochitGate />);

    const pet = await screen.findByRole("button", { name: "モチットを触る" });
    await waitFor(() => expect(fetchCurrentExamReadiness).toHaveBeenCalledOnce());
    fireEvent.contextMenu(pet);

    expect(await screen.findByText(/合格準備度 85\/100/)).toHaveTextContent(
      "「テクノロジ」の問題を優先しましょう",
    );
    expect(screen.getByRole("menuitem", { name: "計画を見る" })).toHaveAttribute(
      "href",
      "/plan",
    );
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
