import type { ComponentType } from "react";
import type { Metadata } from "next";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GUIDES, GUIDE_BASE_PATH, guidePath } from "@/lib/guide/guides";
import { expectedPhaseSpans, GUIDE_FACTS } from "@/lib/guide/facts";
import { getPlayableOfficialExamYears } from "@/lib/questionBank";
import { shouldShowFloatingMochit } from "@/components/mochit/FloatingMochitGate";
import * as IndexPage from "@/app/guide/page";
import * as StudyMethod from "@/app/guide/it-passport-study-method/page";
import * as StudyTime from "@/app/guide/study-time/page";
import * as StudyPlan from "@/app/guide/study-plan/page";
import * as CantContinue from "@/app/guide/cant-continue-studying/page";
import * as PastExam from "@/app/guide/past-exam-strategy/page";

type PageModule = { default: ComponentType; metadata: Metadata };

const ARTICLES: Record<string, PageModule> = {
  "it-passport-study-method": StudyMethod,
  "study-time": StudyTime,
  "study-plan": StudyPlan,
  "cant-continue-studying": CantContinue,
  "past-exam-strategy": PastExam,
};

const PAGES: { path: string; mod: PageModule }[] = [
  { path: GUIDE_BASE_PATH, mod: IndexPage },
  ...GUIDES.map((g) => ({ path: guidePath(g.slug), mod: ARTICLES[g.slug] })),
];

function html(mod: PageModule): string {
  const Page = mod.default;
  return renderToStaticMarkup(<Page />);
}

function jsonLd(markup: string): Record<string, unknown>[] {
  const blocks = [...markup.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  return blocks.flatMap((m) => {
    const data = JSON.parse(m[1]) as unknown;
    return (Array.isArray(data) ? data : [data]) as Record<string, unknown>[];
  });
}

function hrefs(markup: string): string[] {
  return [...markup.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}

describe("guide registry", () => {
  it("has a page module for every registered guide", () => {
    expect(Object.keys(ARTICLES).sort()).toEqual(GUIDES.map((g) => g.slug).sort());
  });

  it("keeps titles and descriptions unique", () => {
    expect(new Set(GUIDES.map((g) => g.title)).size).toBe(GUIDES.length);
    expect(new Set(GUIDES.map((g) => g.description)).size).toBe(GUIDES.length);
  });

  it("links each article to 2-3 other existing guides", () => {
    const slugs = new Set(GUIDES.map((g) => g.slug));
    for (const g of GUIDES) {
      expect(g.related.length).toBeGreaterThanOrEqual(2);
      expect(g.related.length).toBeLessThanOrEqual(3);
      expect(g.related).not.toContain(g.slug);
      for (const r of g.related) expect(slugs.has(r)).toBe(true);
    }
  });
});

describe.each(PAGES)("$path", ({ path, mod }) => {
  const markup = html(mod);

  it("is indexable with its own canonical, OG and Twitter card", () => {
    const { metadata } = mod;
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates?.canonical).toBe(path);
    expect(metadata.metadataBase?.toString()).toBe("https://shikaku-mochit.com/");
    expect(metadata.openGraph?.url).toBe(path);
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(typeof metadata.title).toBe("string");
    expect(String(metadata.description).length).toBeGreaterThan(50);
  });

  it("renders exactly one H1 and never skips a heading level", () => {
    const levels = [...markup.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it("outputs BreadcrumbList JSON-LD ending at this page", () => {
    const crumbs = jsonLd(markup).find((d) => d["@type"] === "BreadcrumbList");
    const items = crumbs?.itemListElement as { item: string; position: number }[];
    expect(items[0].item).toBe("https://shikaku-mochit.com/lp");
    expect(items.at(-1)?.item).toBe(`https://shikaku-mochit.com${path}`);
  });

  it("links to the LP and the free start", () => {
    const links = hrefs(markup);
    expect(links).toContain("/lp");
    expect(links).toContain("/login");
    expect(links.every((h) => !h.startsWith("http://"))).toBe(true);
  });
});

describe("guide index", () => {
  it("links to every guide article", () => {
    const links = hrefs(html(IndexPage));
    for (const g of GUIDES) expect(links).toContain(guidePath(g.slug));
  });
});

describe.each(GUIDES)("article $slug", (guide) => {
  const markup = html(ARTICLES[guide.slug]);

  it("outputs Article JSON-LD with real dates and no invented author", () => {
    const article = jsonLd(markup).find((d) => d["@type"] === "Article");
    expect(article).toMatchObject({
      headline: guide.h1,
      description: guide.description,
      datePublished: guide.datePublished,
      dateModified: guide.dateModified,
      inLanguage: "ja",
      mainEntityOfPage: { "@type": "WebPage", "@id": `https://shikaku-mochit.com${guidePath(guide.slug)}` },
      author: { "@type": "Organization", name: "ITパスポート学習コーチ" },
    });
  });

  it("links to its related guides", () => {
    const links = hrefs(markup);
    for (const r of guide.related) expect(links).toContain(guidePath(r));
  });

  it("points every in-page anchor at an existing section", () => {
    const anchors = hrefs(markup).filter((h) => h.startsWith("#")).map((h) => h.slice(1));
    expect(anchors.length).toBeGreaterThan(0);
    for (const id of anchors) expect(markup).toContain(`id="${id}"`);
  });

  it("shows the updated date", () => {
    expect(markup).toContain(`dateTime="${guide.dateModified}"`);
  });
});

describe("guide facts stay in sync with app data", () => {
  it("counts official past exams from the question bank", () => {
    const years = getPlayableOfficialExamYears();
    expect(GUIDE_FACTS.officialYears).toEqual(years);
    expect(GUIDE_FACTS.officialQuestionCount).toBe(years.length * 100);
    expect(html(PastExam)).toContain(`計${GUIDE_FACTS.officialQuestionCount}問`);
  });

  it("matches the phase ratio table on /guide/study-plan to the planner", () => {
    // 100日計画なら「開始日」がそのまま経過%になる。本文の表（10/45/65/80/95%）と一致すること。
    const starts = expectedPhaseSpans(100).map((s) => s.fromDay - 1);
    expect(starts).toEqual([0, 10, 45, 65, 80, 95]);
  });
});

describe("floating mascot", () => {
  it("stays off the reading pages", () => {
    expect(shouldShowFloatingMochit("/guide", true)).toBe(false);
    expect(shouldShowFloatingMochit("/guide/study-time", true)).toBe(false);
    expect(shouldShowFloatingMochit("/today", true)).toBe(true);
  });
});
