import { describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import { getAllTopics } from "@/lib/content";
import { diagnoseBookOrder } from "@/lib/bookOrderDiagnostics";
import { referenceBookFromPreset } from "@/lib/referenceBookPresets";

// 管理画面の Shadow 比較。書き込みはせず、アプリ順と参考書順の差を並べるだけ。

const topics = getAllTopics();

function state(completedTopics: string[]): AppState {
  return {
    progress: {
      currentDay: 1,
      completedDays: [],
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics,
      topicMastery: {},
      reviewQueue: [],
    },
    answers: [],
  };
}

describe("diagnoseBookOrder", () => {
  it("reports quality only when there is no usable book", () => {
    const d = diagnoseBookOrder({ book: null, state: null, topics });
    expect(d.ok).toBe(true);
    expect(d.quality?.eligible).toBe(false);
    expect(d.units).toBeUndefined();
  });

  it("compares the next new topics in app order and book order", () => {
    const book = referenceBookFromPreset("gihyo-kitami-itpass-r08")!;
    const d = diagnoseBookOrder({ book, state: state([]), topics, now: new Date("2026-10-04T00:00:00Z") });
    expect(d.ok).toBe(true);
    expect(d.quality?.eligible).toBe(true);
    expect(d.nextBook).toHaveLength(5);
    expect(d.nextApp?.length).toBeGreaterThan(0);
    expect(d.currentUnitLabel).toContain("Chapter1");
    expect(d.units?.maxTopicsPerUnit).toBeGreaterThan(0);
  });

  it("moves the current unit forward as topics are completed", () => {
    const book = referenceBookFromPreset("gihyo-kitami-itpass-r08")!;
    const first = diagnoseBookOrder({ book, state: state([]), topics });
    const after = diagnoseBookOrder({ book, state: state(first.nextBook!), topics });
    expect(after.nextBook?.some((id) => first.nextBook!.includes(id))).toBe(false);
    expect(after.completedCount).toBe(5);
    expect(after.examPoolTopics).toBe(5);
  });

  it("never throws; failures are reported", () => {
    const d = diagnoseBookOrder({ book: { title: "x", active: true, chapters: [{ id: "c", title: "c", sections: 5 }] } as never, state: null, topics });
    expect(d.ok).toBe(false);
    expect(d.error).toBeTruthy();
  });
});
