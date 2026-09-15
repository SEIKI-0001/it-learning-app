export function pilotPublicDefines(
  vars: Record<string, unknown>,
): Record<string, string> {
  const defines: Record<string, string> = {};
  // Only these intentionally public values may enter the browser bundle.
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_LINE_ADD_FRIEND_URL",
  ]) {
    const value = vars[name];
    if (value === undefined) continue;
    if (typeof value !== "string") {
      throw new Error(`Invalid public Worker variable: ${name}`);
    }
    defines[`process.env.${name}`] = JSON.stringify(value);
  }
  return defines;
}
