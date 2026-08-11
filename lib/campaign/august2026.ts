export const AUGUST_2026_CAMPAIGN = {
  key: "august_2026",
  path: "/campaign/august-2026",
  planKey: "one_6m",
  totalJpy: 3480,
  bonusLimit: 6,
  endsAt: "2026-08-10T14:59:59.999Z",
} as const;

export type August2026CheckoutResult = "success" | "cancel";

export function isAugust2026BonusOpen(value: string | undefined): boolean {
  return value?.trim().toLowerCase() !== "false";
}

export function isAugust2026BonusActive({
  now,
  bonusOpen,
}: {
  now: Date;
  bonusOpen: boolean;
}): boolean {
  return bonusOpen && now.getTime() <= Date.parse(AUGUST_2026_CAMPAIGN.endsAt);
}

export function parseAugust2026CheckoutResult(
  value: string | string[] | undefined,
): August2026CheckoutResult | null {
  return value === "success" || value === "cancel" ? value : null;
}
