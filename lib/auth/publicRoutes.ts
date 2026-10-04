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
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
