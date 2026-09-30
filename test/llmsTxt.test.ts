import { describe, expect, it } from "vitest";
import { buildLlmsTxt } from "@/lib/publicPages/llmsTxt";
import { GUIDES, guidePath } from "@/lib/guide/guides";
import { getKaisetsuTopics, kaisetsuPath } from "@/lib/publicPages/kaisetsu";
import { isPublicPath } from "@/lib/auth/publicRoutes";
import sitemap from "@/app/sitemap";

const SITE = "https://shikaku-mochit.com";
const txt = buildLlmsTxt();
const links = [...txt.matchAll(/\]\((https:[^)]+)\)/g)].map((m) => m[1]);

describe("/llms.txt", () => {
  it("starts with an H1 and a blockquote summary (llmstxt.org format)", () => {
    const [h1, blank, quote] = txt.split("\n");
    expect(h1).toBe("# ITパスポート学習コーチ");
    expect(blank).toBe("");
    expect(quote.startsWith("> ")).toBe(true);
  });

  it("lists every guide article and every topic explanation", () => {
    for (const g of GUIDES) expect(links).toContain(`${SITE}${guidePath(g.slug)}`);
    for (const t of getKaisetsuTopics()) expect(links).toContain(`${SITE}${kaisetsuPath(t.id)}`);
  });

  it("links only to public pages that are also in the sitemap", () => {
    const sitemapUrls = new Set(sitemap().map((e) => e.url));
    const own = links.filter((u) => u.startsWith(`${SITE}/`));
    expect(own.length).toBeGreaterThan(0);
    for (const u of own) {
      expect(isPublicPath(u.slice(SITE.length))).toBe(true);
      expect(sitemapUrls.has(u)).toBe(true);
    }
  });
});
