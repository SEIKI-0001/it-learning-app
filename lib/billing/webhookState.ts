export type StripeWebhookEventStatus = "processing" | "succeeded" | "failed";

export const STALE_WEBHOOK_PROCESSING_SECONDS = 5 * 60;

/**
 * 同じStripeイベントを再処理してよいかを決める。
 * 成功済み・現在処理中のイベントは重複実行せず、失敗済みまたは停止した処理だけ再試行する。
 */
export function shouldRetryWebhookEvent(
  status: StripeWebhookEventStatus,
  updatedAt: string | null,
  now: Date = new Date(),
): boolean {
  if (status === "failed") return true;
  if (status !== "processing") return false;
  if (!updatedAt) return true;
  const updatedAtMs = Date.parse(updatedAt);
  if (Number.isNaN(updatedAtMs)) return true;
  return now.getTime() - updatedAtMs >= STALE_WEBHOOK_PROCESSING_SECONDS * 1000;
}
