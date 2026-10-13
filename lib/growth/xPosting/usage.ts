export type UsageRow = { created_at: string; publish_attempt_at: string | null; destination_url: string | null };
type Usage = { reservedAiCalls: number; maxOutputTokens: number; xRequests: number; xEstimatedUsd: number };
/** Conservative usage estimates, not billing records. Identity reads are excluded. */
export function monthlyUsage(rows: UsageRow[]): Record<string, Usage> {
  const monthly: Record<string, Usage> = {};
  const at = (time: string) => {
    const month = new Date(Date.parse(time) + 9 * 3600000).toISOString().slice(0, 7);
    return monthly[month] ??= { reservedAiCalls: 0, maxOutputTokens: 0, xRequests: 0, xEstimatedUsd: 0 };
  };
  for (const row of rows) {
    const generation = at(row.created_at);
    generation.reservedAiCalls++;
    generation.maxOutputTokens += 1200;
    if (row.publish_attempt_at) {
      const post = at(row.publish_attempt_at);
      post.xRequests++;
      post.xEstimatedUsd = Number((post.xEstimatedUsd + (row.destination_url ? 0.2 : 0.015)).toFixed(3));
    }
  }
  return monthly;
}
