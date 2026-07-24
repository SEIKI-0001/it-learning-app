import type { Metadata } from "next";

export type BlogSlug =
  | "it-passport-start"
  | "it-passport-continue"
  | "it-passport-past-questions";

export type BlogPost = {
  slug: BlogSlug;
  title: string;
  description: string;
  audience: string;
  readTime: string;
  datePublished: string;
  dateModified: string;
  category: string;
  keywords: string[];
  ctaLabel: string;
  ctaHref: string;
  takeaways: string[];
};

export const BLOG_SITE_NAME = "ITパスポート学習コーチ";
export const BLOG_AUTHOR = "ITパスポート学習コーチ編集部";
export const BLOG_SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
export const IPA_RANGE_URL =
  "https://www3.jitec.ipa.go.jp/JitesCbt/html/about/range.html";

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "it-passport-start",
    title:
      "ITパスポートは何から勉強すればいい？初心者が最初にやるべき3ステップ",
    description:
      "ITパスポート初心者が最初に迷いやすい勉強順を整理。試験範囲の見方、用語の覚え方、確認問題への進み方を解説します。",
    audience: "試験を受けたいが、参考書のどこから始めるか決めきれない人",
    readTime: "6分",
    datePublished: "2026-06-28",
    dateModified: "2026-06-28",
    category: "はじめ方",
    keywords: ["ITパスポート", "勉強法", "初心者", "未経験", "確認問題"],
    ctaLabel: "今日の学習メニューを作る",
    ctaHref: "/onboarding",
    takeaways: [
      "最初の1周目は暗記量より、3分野の地図を作る。",
      "用語は意味だけでなく、使われる場面とセットで覚える。",
      "読んだ直後に短い確認問題を解き、分かったつもりを減らす。",
    ],
  },
  {
    slug: "it-passport-continue",
    title: "ITパスポートの勉強が続かない理由は「やる気不足」ではない",
    description:
      "ITパスポート学習が止まる原因を、意志ではなく学習設計から見直します。短時間学習、復習、進捗可視化の作り方を紹介。",
    audience: "参考書や過去問を始めたものの、数日で止まりがちな人",
    readTime: "7分",
    datePublished: "2026-06-28",
    dateModified: "2026-06-28",
    category: "続け方",
    keywords: ["ITパスポート", "続かない", "勉強法", "初心者", "進捗"],
    ctaLabel: "止まったところから再開する",
    ctaHref: "/today",
    takeaways: [
      "続かない原因は、予定が崩れた日に戻れない設計にある。",
      "1回の学習を小さくし、完了条件をはっきりさせる。",
      "進捗はページ数ではなく、理解済み・復習待ち・苦手で見る。",
    ],
  },
  {
    slug: "it-passport-past-questions",
    title:
      "ITパスポートは過去問だけで合格できる？初心者が注意すべき落とし穴",
    description:
      "ITパスポートの過去問演習は重要。ただし初心者が過去問だけで進めると理解が浅くなる理由と、復習の順番を解説します。",
    audience: "過去問中心で進めたいが、用語理解に不安があるIT未経験者",
    readTime: "7分",
    datePublished: "2026-06-28",
    dateModified: "2026-06-28",
    category: "過去問",
    keywords: ["ITパスポート", "過去問", "合格", "初心者", "復習"],
    ctaLabel: "1テーマ学んでから問題を解く",
    ctaHref: "/today",
    takeaways: [
      "過去問は知識を作る教材というより、弱点を見つける教材。",
      "知らない用語が多い段階では、基本テーマを先に押さえる。",
      "点数より、間違えた理由を分類して復習することが合格に近い。",
    ],
  },
];

export function getBlogPost(slug: BlogSlug) {
  const post = BLOG_POSTS.find((item) => item.slug === slug);
  if (!post) {
    throw new Error(`Unknown blog post: ${slug}`);
  }
  return post;
}

export function getRelatedPosts(slug: BlogSlug) {
  return BLOG_POSTS.filter((post) => post.slug !== slug);
}

export function absoluteBlogUrl(slug?: BlogSlug) {
  const base = BLOG_SITE_URL.replace(/\/$/, "");
  return `${base}${slug ? `/blog/${slug}` : "/blog"}`;
}

export function createBlogListingMetadata(): Metadata {
  return {
    title: `ITパスポート勉強法ブログ | ${BLOG_SITE_NAME}`,
    description:
      "ITパスポート初心者・IT未経験者向けに、勉強の始め方、続け方、過去問の使い方を実践しやすく整理したブログです。",
    alternates: {
      canonical: absoluteBlogUrl(),
    },
    openGraph: {
      title: `ITパスポート勉強法ブログ | ${BLOG_SITE_NAME}`,
      description:
        "ITパスポート初心者向けに、はじめ方・続け方・過去問活用を整理したブログ一覧です。",
      type: "website",
      url: absoluteBlogUrl(),
      siteName: BLOG_SITE_NAME,
      locale: "ja_JP",
    },
  };
}

export function createArticleMetadata(slug: BlogSlug): Metadata {
  const post = getBlogPost(slug);
  const url = absoluteBlogUrl(slug);

  return {
    title: `${post.title} | ${BLOG_SITE_NAME}`,
    description: post.description,
    alternates: {
      canonical: url,
    },
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url,
      siteName: BLOG_SITE_NAME,
      locale: "ja_JP",
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      authors: [BLOG_AUTHOR],
    },
  };
}

export function createArticleJsonLd(slug: BlogSlug) {
  const post = getBlogPost(slug);
  const url = absoluteBlogUrl(slug);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    author: {
      "@type": "Organization",
      name: BLOG_AUTHOR,
    },
    publisher: {
      "@type": "Organization",
      name: BLOG_SITE_NAME,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
  };
}
