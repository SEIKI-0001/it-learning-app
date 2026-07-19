export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;

export type SubscriptionStateForReconciliation = {
  status: string;
  priceIds: string[];
};

export function shouldApplySubscriptionEvent(
  latestEventCreated: number | null,
  eventCreated: number,
): boolean {
  return latestEventCreated === null || eventCreated >= latestEventCreated;
}

export function hasActiveProSubscription(
  subscriptions: SubscriptionStateForReconciliation[],
  proPriceId: string,
): boolean {
  return subscriptions.some(
    (subscription) =>
      ACTIVE_SUBSCRIPTION_STATUSES.includes(
        subscription.status as (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number],
      ) && subscription.priceIds.includes(proPriceId),
  );
}

export function subscriptionKeepsPro(
  hasMatchingSubscription: boolean,
  proUntil: string | null,
  now = new Date(),
): boolean {
  if (hasMatchingSubscription) return true;
  return Boolean(proUntil && new Date(proUntil).getTime() > now.getTime());
}
