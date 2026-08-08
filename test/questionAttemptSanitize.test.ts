import { describe, expect, it } from "vitest";

import {
  MAX_ANSWERED_AT_FUTURE_SKEW_MS,
  MAX_TIME_SPENT_SECONDS,
  MIN_ANSWERED_AT_ISO,
  sanitizeAnsweredAt,
  sanitizeTimeSpentSeconds,
} from "@/lib/questionAttemptSanitize";

// ============================================================================
// 回答ログの数値・日時の正規化。
// ----------------------------------------------------------------------------
// timeSpentSeconds は実測難易度の入力になるので、異常値を保存させない。
// ============================================================================

describe("sanitizeTimeSpentSeconds", () => {
  it("通常の値はそのまま通る", () => {
    expect(sanitizeTimeSpentSeconds(42)).toBe(42);
    expect(sanitizeTimeSpentSeconds(0)).toBe(0);
  });

  it("小数は整数へ丸める（DB は integer 列）", () => {
    expect(sanitizeTimeSpentSeconds(12.4)).toBe(12);
    expect(sanitizeTimeSpentSeconds(12.6)).toBe(13);
  });

  it("NaN を拒否する", () => {
    expect(sanitizeTimeSpentSeconds(Number.NaN)).toBeNull();
  });

  it("Infinity を拒否する", () => {
    expect(sanitizeTimeSpentSeconds(Number.POSITIVE_INFINITY)).toBeNull();
    expect(sanitizeTimeSpentSeconds(Number.NEGATIVE_INFINITY)).toBeNull();
  });

  it("負数を拒否する", () => {
    expect(sanitizeTimeSpentSeconds(-1)).toBeNull();
    expect(sanitizeTimeSpentSeconds(-0.5)).toBeNull();
  });

  it("極端に大きい値は上限へ丸める", () => {
    expect(sanitizeTimeSpentSeconds(MAX_TIME_SPENT_SECONDS + 1)).toBe(MAX_TIME_SPENT_SECONDS);
    expect(sanitizeTimeSpentSeconds(999_999_999)).toBe(MAX_TIME_SPENT_SECONDS);
    // 上限ちょうどは丸めない。
    expect(sanitizeTimeSpentSeconds(MAX_TIME_SPENT_SECONDS)).toBe(MAX_TIME_SPENT_SECONDS);
  });

  it("数値でない値を拒否する", () => {
    expect(sanitizeTimeSpentSeconds("42")).toBeNull();
    expect(sanitizeTimeSpentSeconds(null)).toBeNull();
    expect(sanitizeTimeSpentSeconds(undefined)).toBeNull();
    expect(sanitizeTimeSpentSeconds({})).toBeNull();
  });

  it("上限は本番モードの制限時間（120分）に一致する", () => {
    expect(MAX_TIME_SPENT_SECONDS).toBe(7200);
  });
});

describe("sanitizeAnsweredAt", () => {
  const now = new Date("2026-08-01T12:00:00.000Z");

  it("通常の日時は ISO8601 に正規化して通す", () => {
    expect(sanitizeAnsweredAt("2026-08-01T11:59:00.000Z", now)).toBe(
      "2026-08-01T11:59:00.000Z",
    );
    // タイムゾーン付きの表記も同じ形へ揃える。
    expect(sanitizeAnsweredAt("2026-08-01T20:59:00+09:00", now)).toBe(
      "2026-08-01T11:59:00.000Z",
    );
  });

  it("日時として解釈できない値は null", () => {
    expect(sanitizeAnsweredAt("not-a-date", now)).toBeNull();
    expect(sanitizeAnsweredAt("", now)).toBeNull();
    expect(sanitizeAnsweredAt(12345, now)).toBeNull();
    expect(sanitizeAnsweredAt(null, now)).toBeNull();
  });

  it("未来すぎる日時を拒否する", () => {
    const tooFarAhead = new Date(
      now.getTime() + MAX_ANSWERED_AT_FUTURE_SKEW_MS + 1000,
    ).toISOString();
    expect(sanitizeAnsweredAt(tooFarAhead, now)).toBeNull();
  });

  it("わずかな時計ずれは許容する", () => {
    const slightlyAhead = new Date(
      now.getTime() + MAX_ANSWERED_AT_FUTURE_SKEW_MS - 1000,
    ).toISOString();
    expect(sanitizeAnsweredAt(slightlyAhead, now)).toBe(slightlyAhead);
  });

  it("古すぎる日時を拒否する", () => {
    expect(sanitizeAnsweredAt("1970-01-01T00:00:00.000Z", now)).toBeNull();
    expect(sanitizeAnsweredAt("2019-12-31T23:59:59.000Z", now)).toBeNull();
    // 下限ちょうどは通す。
    expect(sanitizeAnsweredAt(MIN_ANSWERED_AT_ISO, now)).toBe(MIN_ANSWERED_AT_ISO);
  });
});
