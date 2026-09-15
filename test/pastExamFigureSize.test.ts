import { describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => {
    throw new Error("node:fs is unavailable in the Worker runtime");
  }),
}));

import { getPngSize } from "@/lib/pastExam/figureSize";

describe("past-exam figure dimensions", () => {
  it("returns generated dimensions for a known official figure without node:fs", () => {
    expect(
      getPngSize("/question-bank/official/ipa/it-passport/2022/q011-figure-1.png"),
    ).toEqual({ width: 900, height: 350 });
  });

  it("rejects traversal and unknown images", () => {
    expect(getPngSize("/../secret.png")).toBeNull();
    expect(getPngSize("/question-bank/missing.png")).toBeNull();
  });
});
