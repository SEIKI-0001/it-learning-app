import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/auth/publicRoutes";

describe("public route matching", () => {
  it.each([
    "/login",
    "/auth/callback",
    "/lp",
    "/campaign/august-2026",
    "/legal/tokusho",
    "/privacy",
  ])("allows %s without an app session", (pathname) => {
    expect(isPublicPath(pathname)).toBe(true);
  });

  it.each(["/", "/more", "/campaigning", "/legalese", "/privacy-policy"])(
    "does not broaden matching to %s",
    (pathname) => {
      expect(isPublicPath(pathname)).toBe(false);
    },
  );
});
