export const PUBLIC_PREFIXES = [
  "/login",
  "/auth",
  "/lp",
  "/campaign",
  "/legal",
  "/privacy",
  "/terms",
  "/guide",
  "/kakomon",
  "/kaisetsu",
  "/words",
  // ネットワーク構築ラボ（試作・noindex）
  "/netlab",
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
