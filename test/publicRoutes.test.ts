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
    "/guide",
    "/guide/it-passport-study-method",
    "/guide/past-exam-strategy",
  ])("allows %s without an app session", (pathname) => {
    expect(isPublicPath(pathname)).toBe(true);
  });

  it.each(["/", "/more", "/campaigning", "/legalese", "/privacy-policy", "/guides", "/guidebook"])(
    "does not broaden matching to %s",
    (pathname) => {
      expect(isPublicPath(pathname)).toBe(false);
    },
  );

  it.each(["/today", "/learn", "/review", "/progress", "/plan", "/settings", "/past-exams"])(
    "keeps the app screen %s behind login",
    (pathname) => {
      expect(isPublicPath(pathname)).toBe(false);
    },
  );
});
