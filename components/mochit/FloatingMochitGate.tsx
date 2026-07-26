"use client";

import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import FloatingMochit from "./FloatingMochit";

const HIDDEN_ROUTE_PREFIXES = [
  "/login",
  "/onboarding",
  "/avatar",
  "/dev",
] as const;

function isPathWithin(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function shouldShowFloatingMochit(
  pathname: string,
  configured: boolean,
): boolean {
  if (!configured || pathname === "/") return false;
  return !HIDDEN_ROUTE_PREFIXES.some((prefix) =>
    isPathWithin(pathname, prefix),
  );
}

function ConfiguredFloatingMochit({ pathname }: { pathname: string }) {
  const [state] = useAppState();
  if (!shouldShowFloatingMochit(pathname, Boolean(state?.profile))) {
    return null;
  }
  return <FloatingMochit />;
}

export default function FloatingMochitGate() {
  const pathname = usePathname();
  if (
    pathname === "/" ||
    HIDDEN_ROUTE_PREFIXES.some((prefix) => isPathWithin(pathname, prefix))
  ) {
    return null;
  }
  return <ConfiguredFloatingMochit pathname={pathname} />;
}
