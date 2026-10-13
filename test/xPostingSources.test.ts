import { describe, expect, it } from "vitest";
import { availableSources, questionSource } from "@/lib/growth/xPosting/sources";
import { computeContentHash } from "@/lib/questionBank/contentHash";
import { getPublishedQuestions } from "@/lib/questionBank";
import { compose, validLength } from "@/lib/growth/xPosting/core";
import type { QuestionRecord } from "@/types/questionBank";
function q(): QuestionRecord {
  const base = { ...getPublishedQuestions()[0], id: "short-test", origin: "app_original" as const, status: "published" as const, official: undefined, figures: undefined, prompt: "DNSの役割は？", choices: [{ key: "A" as const, text: "名前解決" }, { key: "B" as const, text: "暗号化" }, { key: "C" as const, text: "圧縮" }, { key: "D" as const, text: "給電" }], correctChoice: "A" as const, explanation: "名前とIPアドレスを対応付ける。", reviewedAt: "2026-10-14", reviewedBy: "test" };
  return { ...base, contentHash: computeContentHash(base) };
}
describe("public content eligibility", () => {
  it("copies all question facts without allowing an AI answer rewrite", () => {
    const source = questionSource(q(), "question");
    expect(source?.text).toContain("正答：A\n名前とIPアドレスを対応付ける。");
    expect(source?.text).toContain("A 名前解決\nB 暗号化\nC 圧縮\nD 給電");
  });
  it("rejects draft, unreviewed, modified, AI-generated, figure-based and hash-mismatched questions", () => {
    for (const change of [{ status: "draft" }, { reviewedBy: null }, { origin: "modified_official" }, { origin: "ai_generated" }, { figures: [{ id: "f" }] }, { explanation: "changed" }]) expect(questionSource({ ...q(), ...change } as QuestionRecord, "question")).toBeNull();
  });
  it("provides weighted-length-safe content for every theme and falls back without latest news", () => {
    for (const theme of ["question", "terms", "trick", "study", "challenge", "knowhow", "service"] as const) {
      const sources = availableSources(theme, "2026-10-13T22:00:00Z");
      expect(sources.length).toBeGreaterThan(0);
      for (const source of sources) expect(validLength(compose("知っていますか？", source, "https://example.test"))).toBe(true);
    }
    expect(availableSources("question", "2026-10-13T22:00:00Z")[0].theme).toBe("terms");
  });
});
