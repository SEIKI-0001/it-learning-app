import { describe, expect, it } from "vitest";
import { jsonLdString } from "@/lib/guide/seo";
import { CHOICE_LABELS } from "@/lib/pastExam/questionView";
import { getKaisetsuTopic, kaisetsuPath } from "@/lib/publicPages/kaisetsu";
import { getAllKakomonQuestions } from "@/lib/publicPages/kakomon";
import { kaisetsuJsonLd, kakomonJsonLd, wordJsonLd } from "@/lib/publicPages/structuredData";
import { getAllWords, getWord } from "@/lib/wordlist";

describe("structured data for public pages", () => {
  it("marks every past question as a Quiz whose accepted answer is the displayed correct choice", () => {
    for (const q of getAllKakomonQuestions()) {
      const data = kakomonJsonLd(q);
      const question = data.hasPart[0];
      const correct = q.view.choices.find((c) => c.key === q.view.correctChoice)!;
      expect(question.text).toBe(q.view.prompt);
      expect(question.acceptedAnswer?.text).toBe(`${CHOICE_LABELS[correct.key]}　${correct.text}`);
      expect(question.acceptedAnswer?.answerExplanation.text).toBe(q.view.explanation);
      expect(question.suggestedAnswer).toHaveLength(q.view.choices.length - 1);
      // 問題文・選択肢の出典は IPA の公開問題
      expect(data.isBasedOn.name).toMatch(/ITパスポート試験 公開問題 問\d+$/);
      expect(data.isBasedOn.publisher.name).toContain("IPA");
      // <script> に埋めても閉じタグにならない
      expect(jsonLdString(data)).not.toContain("</");
    }
  });

  it("describes every acronym as a DefinedTerm with its full and Japanese names", () => {
    for (const w of getAllWords()) {
      const data = wordJsonLd(w);
      expect(data.name).toBe(w.acronym);
      expect(data.alternateName).toContain(w.japanese);
      expect(data.description).toBe(w.oneLine);
    }
    expect(wordJsonLd(getWord("rpo")!).alternateName).toEqual(["Recovery Point Objective", "目標復旧時点"]);
  });

  it("describes a topic explanation as a free Article about the topic", () => {
    const t = getKaisetsuTopic("tech-http-https")!;
    const data = kaisetsuJsonLd(t, {
      path: kaisetsuPath(t.id),
      headline: "HTTPとHTTPSとは？わかりやすく解説",
      description: "説明",
      about: [t.title],
    });
    expect(data["@type"]).toBe("Article");
    expect(data.url).toBe("https://shikaku-mochit.com/kaisetsu/tech-http-https");
    expect(data.about).toEqual([{ "@type": "Thing", name: "HTTPとHTTPS" }]);
    expect(data.isAccessibleForFree).toBe(true);
  });
});
