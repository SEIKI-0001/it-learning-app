import { describe, expect, it } from "vitest";
import {
  AUGUST_2026_CAMPAIGN,
  isAugust2026BonusActive,
  isAugust2026BonusOpen,
  parseAugust2026CheckoutResult,
} from "@/lib/campaign/august2026";

describe("August 2026 campaign", () => {
  it("uses the approved plan, price, path, and JST deadline", () => {
    expect(AUGUST_2026_CAMPAIGN).toMatchObject({
      key: "august_2026",
      path: "/campaign/august-2026",
      planKey: "one_6m",
      totalJpy: 3480,
      bonusLimit: 6,
      endsAt: "2026-08-10T14:59:59.999Z",
    });
  });

  it("is active through the final millisecond and closed immediately after", () => {
    expect(
      isAugust2026BonusActive({
        now: new Date("2026-08-10T14:59:59.999Z"),
        bonusOpen: true,
      }),
    ).toBe(true);
    expect(
      isAugust2026BonusActive({
        now: new Date("2026-08-10T15:00:00.000Z"),
        bonusOpen: true,
      }),
    ).toBe(false);
  });

  it("honors the manual sold-out switch", () => {
    expect(
      isAugust2026BonusActive({
        now: new Date("2026-08-01T00:00:00.000Z"),
        bonusOpen: false,
      }),
    ).toBe(false);
    expect(isAugust2026BonusOpen(undefined)).toBe(true);
    expect(isAugust2026BonusOpen("false")).toBe(false);
    expect(isAugust2026BonusOpen(" FALSE ")).toBe(false);
  });

  it("accepts only known checkout results", () => {
    expect(parseAugust2026CheckoutResult("success")).toBe("success");
    expect(parseAugust2026CheckoutResult("cancel")).toBe("cancel");
    expect(parseAugust2026CheckoutResult(["success"])).toBeNull();
    expect(parseAugust2026CheckoutResult("paid")).toBeNull();
    expect(parseAugust2026CheckoutResult(undefined)).toBeNull();
  });
});
