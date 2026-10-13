import { describe, expect, it } from "vitest";
import { buildAttributionCookieValue, parseAttributionCookie } from "@/lib/growth/attributionCookie";
import { xPostEntryPlacement, parseFunnelInput } from "@/lib/growth/funnel";
import { buildPostUrl } from "@/lib/growth/xPosting/core";
describe("X acquisition reuses existing analytics", () => {
  it("passes the same post ID through signup first-touch and funnel entry placement", () => {
    const url = new URL(buildPostUrl("/lp", "x-abc", "https://example.test"));
    const raw = buildAttributionCookieValue({ search: url.search, pathname: url.pathname, referrer: "https://t.co/x", currentHost: url.hostname, now: Date.now() });
    expect(parseAttributionCookie(raw)).toMatchObject({ ref: "x-abc", utmSource: "x", utmMedium: "social", utmCampaign: "organic_x" });
    const placement = xPostEntryPlacement(url.search);
    expect(parseFunnelInput({ event: "view", path: "/lp", placement })?.placement).toBe("x-abc");
  });
  it("does not attribute internal navigation, beta or unrelated UTMs to an X post", () => {
    for (const search of ["", "?ref=beta", "?utm_content=x-abc", "?utm_source=x&utm_medium=social&utm_campaign=organic_x&utm_content=%3Cscript%3E"]) expect(xPostEntryPlacement(search)).toBeNull();
  });
});
