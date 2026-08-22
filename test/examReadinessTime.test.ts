import { describe, expect, it } from "vitest";

import {
  freshnessCoefficient,
  nextTimeBoundary,
  retentionOverdueMultiplier,
  snapshotDateInTokyo,
} from "@/lib/examReadiness/time";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const referenceTime = new Date("2026-08-22T00:00:00.000Z");

describe("freshnessCoefficient", () => {
  it.each([
    [0, 1],
    [30, 1],
    [31, 0.8],
    [60, 0.8],
    [61, 0.6],
    [90, 0.6],
    [91, 0.4],
  ])("uses the V1 coefficient after %i whole elapsed days", (elapsedDays, expected) => {
    expect(freshnessCoefficient(referenceTime, new Date(referenceTime.getTime() - elapsedDays * DAY))).toBe(expected);
  });

  it("clamps a future evidence timestamp to zero elapsed days", () => {
    expect(freshnessCoefficient(referenceTime, new Date(referenceTime.getTime() + DAY))).toBe(1);
  });
});

describe("retentionOverdueMultiplier", () => {
  it.each([
    ["not due", DAY, 7, 1],
    ["due now", 0, 7, 1],
    ["zero full overdue days", -23 * HOUR, 7, 1],
    ["one full overdue day", -DAY, 7, 0.7],
    ["exactly the scheduled interval", -7 * DAY, 7, 0.7],
    ["one day beyond the scheduled interval", -8 * DAY, 7, 0.4],
  ])("uses %s multiplier boundary", (_name, dueOffset, scheduledIntervalDays, expected) => {
    expect(
      retentionOverdueMultiplier({
        referenceTime,
        dueAt: new Date(referenceTime.getTime() + dueOffset),
        scheduledIntervalDays,
      }),
    ).toBe(expected);
  });
});

describe("nextTimeBoundary", () => {
  it.each([
    ["the 31-day freshness transition", [new Date(referenceTime.getTime() - 30 * DAY)], [], new Date(referenceTime.getTime() + DAY)],
    ["the 61-day freshness transition", [new Date(referenceTime.getTime() - 60 * DAY)], [], new Date(referenceTime.getTime() + DAY)],
    ["the 91-day freshness transition", [new Date(referenceTime.getTime() - 90 * DAY)], [], new Date(referenceTime.getTime() + DAY)],
    ["a future Review Due arrival", [], [{ dueAt: new Date(referenceTime.getTime() + 2 * DAY), scheduledIntervalDays: 7 }], new Date(referenceTime.getTime() + 2 * DAY)],
    ["the one-day-overdue transition", [], [{ dueAt: referenceTime, scheduledIntervalDays: 7 }], new Date(referenceTime.getTime() + DAY)],
    ["the interval-exceeded transition", [], [{ dueAt: new Date(referenceTime.getTime() - 6 * DAY), scheduledIntervalDays: 7 }], new Date(referenceTime.getTime() + 2 * DAY)],
  ])("selects %s", (_name, evidenceTimes, reviews, expected) => {
    const boundary = nextTimeBoundary({ calculationReferenceTime: referenceTime, evidenceTimes, reviews });
    expect(boundary?.toISOString()).toBe(expected.toISOString());
    expect(boundary!.getTime()).toBeGreaterThan(referenceTime.getTime());
  });

  it("selects the earliest candidate when several boundaries are pending", () => {
    const boundary = nextTimeBoundary({
      calculationReferenceTime: referenceTime,
      evidenceTimes: [new Date(referenceTime.getTime() - 30 * DAY)],
      reviews: [{ dueAt: new Date(referenceTime.getTime() + 3 * DAY), scheduledIntervalDays: 7 }],
    });

    expect(boundary?.toISOString()).toBe(new Date(referenceTime.getTime() + DAY).toISOString());
  });

  it("returns null when no coefficient or review state can change later", () => {
    expect(
      nextTimeBoundary({
        calculationReferenceTime: referenceTime,
        evidenceTimes: [new Date(referenceTime.getTime() - 91 * DAY)],
        reviews: [{ dueAt: new Date(referenceTime.getTime() - 9 * DAY), scheduledIntervalDays: 7 }],
      }),
    ).toBeNull();
  });
});

describe("snapshotDateInTokyo", () => {
  it.each([
    ["before Tokyo midnight", "2026-08-22T14:59:59.999Z", "2026-08-22"],
    ["at Tokyo midnight", "2026-08-22T15:00:00.000Z", "2026-08-23"],
  ])("uses the Tokyo date %s", (_name, calculatedAt, expected) => {
    expect(snapshotDateInTokyo(new Date(calculatedAt))).toBe(expected);
  });
});
