import type { Metadata } from "next";
import { GUIDE_BASE_PATH, GUIDE_INDEX, guidePath, type GuideArticle } from "@/lib/guide/guides";

// ============================================================================
// 公開ガイドの metadata と構造化データ（Article / BreadcrumbList）。
// 著者は実在する運営主体（このサービス）だけを書く。個人の著者プロフィールは作らない。
// ============================================================================

export const SITE_URL = "https://shikaku-mochit.com";
export const SERVICE_NAME = "ITパスポート学習コーチ";
const OG_IMAGE = { url: "/og/lp.png", width: 1200, height: 630 };

type PageSeo = { path: string; title: string; description: string; type: "article" | "website" };

function buildMetadata({ path, title, description, type }: PageSeo): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: path },
    openGraph: {
      type,
      locale: "ja_JP",
      url: path,
      siteName: SERVICE_NAME,
      title,
      description,
      images: [{ ...OG_IMAGE, alt: SERVICE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

export function buildGuideMetadata(guide: GuideArticle): Metadata {
  return buildMetadata({
    path: guidePath(guide.slug),
    title: guide.title,
    description: guide.description,
    type: "article",
  });
}

export function buildGuideIndexMetadata(): Metadata {
  return buildMetadata({
    path: GUIDE_BASE_PATH,
    title: GUIDE_INDEX.title,
    description: GUIDE_INDEX.description,
    type: "website",
  });
}

export type Crumb = { name: string; path: string };

export function guideCrumbs(guide?: GuideArticle): Crumb[] {
  const crumbs: Crumb[] = [
    { name: "トップ", path: "/lp" },
    { name: "学習ガイド", path: GUIDE_BASE_PATH },
  ];
  if (guide) crumbs.push({ name: guide.h1, path: guidePath(guide.slug) });
  return crumbs;
}

const publisher = {
  "@type": "Organization",
  name: SERVICE_NAME,
  url: `${SITE_URL}/lp`,
};

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

export function articleJsonLd(guide: GuideArticle) {
  const url = `${SITE_URL}${guidePath(guide.slug)}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.h1,
    description: guide.description,
    datePublished: guide.datePublished,
    dateModified: guide.dateModified,
    inLanguage: "ja",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    image: `${SITE_URL}${OG_IMAGE.url}`,
    author: publisher,
    publisher,
    isPartOf: { "@type": "WebSite", name: SERVICE_NAME, url: `${SITE_URL}/lp` },
  };
}

/** JSON-LD を <script> に埋めるための文字列。"</script>" 混入を避けて < をエスケープする。 */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
