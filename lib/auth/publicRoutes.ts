export const PUBLIC_PREFIXES = [
  "/login",
  "/auth",
  "/lp",
  "/campaign",
  "/legal",
  "/privacy",
  "/guide",
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
