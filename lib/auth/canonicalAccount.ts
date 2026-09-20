import { getServiceSupabase } from "@/lib/supabaseServer";

/** Old signed LINE cookies and Stripe metadata remain valid after linking. */
export async function canonicalAccountId(userId: string): Promise<string> {
  const db = getServiceSupabase();
  if (!db) throw new Error("Supabase is not configured");
  const { data, error } = await db.rpc("canonical_account_id", { p_id: userId });
  // Allows the application to deploy before the additive migration.
  if (error?.code === "PGRST202") return userId;
  if (error || typeof data !== "string") throw new Error("Account lookup failed");
  return data;
}
