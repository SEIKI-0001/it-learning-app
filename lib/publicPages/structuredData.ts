// 公開ページ（/kakomon・/words・/kaisetsu）の構造化データ（JSON-LD）。
//
// 検索エンジンや AI 検索（Google の AI による概要、ChatGPT・Perplexity など）が
// 「何についてのページか」「答えはどれか」「出典はどこか」を本文の解析に頼らず読めるようにする。
// 中身はページに表示している内容だけから組み立てる（表示していない情報を JSON-LD にだけ書かない）。

import { SERVICE_NAME, SITE_URL } from "@/lib/guide/seo";
import { CHOICE_LABELS } from "@/lib/pastExam/questionView";
import { kakomonQuestionTitle, kakomonYearLabel, type KakomonQuestion } from "@/lib/publicPages/kakomon";
import { WORDS_BASE_PATH, isWordLikeEntry, wordPath } from "@/lib/publicPages/words";
import type { Topic } from "@/types/content";
import type { WordlistEntry } from "@/types/wordlist";

const CONTEXT = "https://schema.org";

const publisher = {
  "@type": "Organization",
  name: SERVICE_NAME,
  url: `${SITE_URL}/lp`,
};

const website = { "@type": "WebSite", name: SERVICE_NAME, url: `${SITE_URL}/lp` };

const IPA = {
  "@type": "Organization",
  name: "独立行政法人情報処理推進機構（IPA）",
  url: "https://www.ipa.go.jp/",
};

/** 英略語1語。DefinedTerm（用語集の1項目）として、略語・正式名称・日本語名・一言の意味を出す。 */
export function wordJsonLd(w: WordlistEntry) {
  const alternateName = isWordLikeEntry(w) ? [w.japanese] : [w.fullName, w.japanese];
  return {
    "@context": CONTEXT,
    "@type": "DefinedTerm",
    name: w.acronym,
    alternateName,
    description: w.oneLine,
    url: `${SITE_URL}${wordPath(w.id)}`,
    inLanguage: "ja",
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "ITパスポート試験の英略語",
      url: `${SITE_URL}${WORDS_BASE_PATH}`,
    },
  };
}

/** テーマ別解説1件。Article として、何のテーマか（about）と、無料で読めることを出す。 */
export function kaisetsuJsonLd(t: Topic, args: { path: string; headline: string; description: string; about: string[] }) {
  const url = `${SITE_URL}${args.path}`;
  return {
    "@context": CONTEXT,
    "@type": "Article",
    headline: args.headline,
    description: args.description,
    inLanguage: "ja",
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    about: args.about.map((name) => ({ "@type": "Thing", name })),
    educationalUse: "ITパスポート試験対策",
    isAccessibleForFree: true,
    author: publisher,
    publisher,
    isPartOf: website,
    keywords: [t.title, ...(t.relatedTerms ?? [])].join(","),
  };
}

/**
 * 公開過去問1問。Quiz の中に Question 1つ。正解（acceptedAnswer）と他の選択肢（suggestedAnswer）、
 * 本サービスの解説（answerExplanation）を入れ、問題文・選択肢の出典として IPA の公開問題を isBasedOn に書く。
 * 正解と解説はページでは <details> に入っているが HTML には含まれており、表示内容と一致する。
 */
export function kakomonJsonLd(q: KakomonQuestion) {
  const { view } = q;
  const url = `${SITE_URL}${q.path}`;
  const answer = (key: (typeof view.choices)[number]["key"], text: string) => ({
    "@type": "Answer",
    text: `${CHOICE_LABELS[key]}　${text}`,
    position: view.choices.findIndex((c) => c.key === key),
  });
  const correct = view.choices.find((c) => c.key === view.correctChoice);
  const source = view.attribution.replace(/^出典：/, "") || `${kakomonYearLabel(view.year)} ITパスポート試験 公開問題 問${view.questionNumber}`;
  return {
    "@context": CONTEXT,
    "@type": "Quiz",
    name: kakomonQuestionTitle(q),
    url,
    inLanguage: "ja",
    educationalUse: "ITパスポート試験対策",
    about: q.tags.map((name) => ({ "@type": "Thing", name })),
    isAccessibleForFree: true,
    publisher,
    isPartOf: website,
    isBasedOn: {
      "@type": "CreativeWork",
      name: source,
      ...(view.sourceUrl ? { url: view.sourceUrl } : {}),
      publisher: IPA,
    },
    hasPart: [
      {
        "@type": "Question",
        eduQuestionType: "Multiple choice",
        text: view.prompt,
        ...(correct
          ? {
              acceptedAnswer: {
                ...answer(correct.key, correct.text),
                answerExplanation: { "@type": "Comment", text: view.explanation },
              },
            }
          : {}),
        suggestedAnswer: view.choices
          .filter((c) => c.key !== view.correctChoice)
          .map((c) => answer(c.key, c.text)),
      },
    ],
  };
}
