import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("public SEO surface", () => {
  it("keeps the canonical LP crawlable by search and AI search bots", () => {
    const robots = read("public/robots.txt");

    expect(robots).toContain("User-agent: OAI-SearchBot");
    expect(robots).toContain("User-agent: ChatGPT-User");
    expect(robots).toContain("Sitemap: https://shikaku-mochit.com/sitemap.xml");
  });

  it("publishes only HTTPS canonical URLs in the sitemap", () => {
    const sitemap = read("public/sitemap.xml");

    expect(sitemap).toContain("<loc>https://shikaku-mochit.com/lp</loc>");
    expect(sitemap).not.toContain("<loc>http://");
  });

  it("marks the landing page indexable and canonical", () => {
    const landingPage = read("app/lp/page.tsx");

    expect(landingPage).toContain("robots: { index: true, follow: true }");
    expect(landingPage).toContain("alternates: { canonical: '/lp' }");
  });

  it("permanently consolidates anonymous root traffic into the canonical LP", () => {
    const proxy = read("proxy.ts");

    expect(proxy).toContain('lpUrl.pathname = "/lp"');
    expect(proxy).toContain("NextResponse.redirect(lpUrl, 308)");
  });
});
