import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { GUIDES, GUIDE_BASE_PATH, guidePath } from "@/lib/guide/guides";
import { KAKOMON_BASE_PATH, getAllKakomonQuestions, getKakomonYears } from "@/lib/publicPages/kakomon";
import { WORDS_BASE_PATH } from "@/lib/publicPages/words";
import { getAllWords } from "@/lib/wordlist";

function read(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const SITE = "https://shikaku-mochit.com";
const sitemapUrls = () => sitemap().map((entry) => entry.url);

describe("public SEO surface", () => {
  it("keeps the canonical LP crawlable by search and AI search bots", () => {
    const robots = read("public/robots.txt");

    expect(robots).toContain("User-agent: OAI-SearchBot");
    expect(robots).toContain("User-agent: ChatGPT-User");
    expect(robots).toContain("Sitemap: https://shikaku-mochit.com/sitemap.xml");
  });

  it("publishes only HTTPS canonical URLs in the sitemap", () => {
    const urls = sitemapUrls();

    expect(urls).toContain(`${SITE}/lp`);
    for (const u of urls) expect(u.startsWith(`${SITE}/`)).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("generates the sitemap from app/sitemap.ts only (no static file shadowing it)", () => {
    expect(() => read("public/sitemap.xml")).toThrow();
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

  it("lists the guide index and every guide article in the sitemap", () => {
    const urls = sitemapUrls();

    for (const path of [GUIDE_BASE_PATH, ...GUIDES.map((g) => guidePath(g.slug))]) {
      expect(urls).toContain(`${SITE}${path}`);
    }
    // 既存の公開ページを落とさない。
    expect(urls).toContain(`${SITE}/legal/tokusho`);
    expect(urls).toContain(`${SITE}/privacy`);
  });

  it("lists every public past-exam question and acronym page in the sitemap", () => {
    const urls = new Set(sitemapUrls());

    expect(urls.has(`${SITE}${KAKOMON_BASE_PATH}`)).toBe(true);
    for (const year of getKakomonYears()) expect(urls.has(`${SITE}${KAKOMON_BASE_PATH}/${year}`)).toBe(true);
    for (const q of getAllKakomonQuestions()) expect(urls.has(`${SITE}${q.path}`)).toBe(true);
    expect(urls.has(`${SITE}${WORDS_BASE_PATH}`)).toBe(true);
    for (const w of getAllWords()) expect(urls.has(`${SITE}${WORDS_BASE_PATH}/${w.id}`)).toBe(true);
  });

  it("keeps past-exam and acronym pages crawlable", () => {
    const robots = read("public/robots.txt");
    expect(robots).toContain("Allow: /kakomon");
    expect(robots).toContain("Allow: /words");
  });

  it("keeps guides crawlable and linked from the LP", () => {
    expect(read("public/robots.txt")).toContain("Allow: /guide");
    expect(read("app/lp/page.tsx")).toContain('href="/guide"');
  });
});
