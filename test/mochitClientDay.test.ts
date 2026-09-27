import { describe, expect, it } from "vitest";
import { clampTimezoneOffset, resolveMochitClientDay } from "@/lib/mochitAi/clientDay";

describe("resolveMochitClientDay", () => {
  it("日本時間は 0:00 JST で日付が変わる", () => {
    const before = resolveMochitClientDay(new Date("2026-09-26T14:59:59.000Z"), "2026-09-26", -540);
    const after = resolveMochitClientDay(new Date("2026-09-26T15:00:00.000Z"), "2026-09-27", -540);
    expect(before.localDate).toBe("2026-09-26");
    expect(new Date(before.dayStartMs).toISOString()).toBe("2026-09-25T15:00:00.000Z");
    expect(after.localDate).toBe("2026-09-27");
    expect(new Date(after.dayStartMs).toISOString()).toBe("2026-09-26T15:00:00.000Z");
  });

  it("サーバー時刻と合わない日付の申告は採用しない", () => {
    const day = resolveMochitClientDay(new Date("2026-09-26T15:30:00.000Z"), "2026-09-28", -540);
    expect(day.localDate).toBe("2026-09-27");
  });

  it("offset が無い・壊れているときは UTC として扱い、範囲外は丸める", () => {
    expect(resolveMochitClientDay(new Date("2026-09-26T23:00:00.000Z"), undefined, undefined).localDate).toBe("2026-09-26");
    expect(clampTimezoneOffset("abc")).toBe(0);
    expect(clampTimezoneOffset(-5000)).toBe(-840);
    expect(clampTimezoneOffset(300.4)).toBe(300);
  });

  it("UTC より遅い地域（offset 正）も、その地域の 0:00 を起点にする", () => {
    const day = resolveMochitClientDay(new Date("2026-09-27T03:00:00.000Z"), "2026-09-26", 300); // UTC-5 22:00
    expect(day.localDate).toBe("2026-09-26");
    expect(new Date(day.dayStartMs).toISOString()).toBe("2026-09-26T05:00:00.000Z");
  });
});
