import { describe, expect, it } from "vitest";
import { formatJapaneseExamYear } from "@/lib/pastExam/yearLabel";
import { getPlayableOfficialExamYears } from "@/lib/questionBank";
import { kakomonActivityFromSpec } from "@/lib/todayKakomon";

describe("試験年度の表記（共通 helper）", () => {
  it("収録している2022〜2026年度をすべて和暦で出す", () => {
    expect(formatJapaneseExamYear(2022)).toBe("令和4年度");
    expect(formatJapaneseExamYear(2023)).toBe("令和5年度");
    expect(formatJapaneseExamYear(2024)).toBe("令和6年度");
    expect(formatJapaneseExamYear(2025)).toBe("令和7年度");
    expect(formatJapaneseExamYear(2026)).toBe("令和8年度");
  });

  it("収録年度はすべて「令和◯年度」になる（ページごとの対応表に頼らない）", () => {
    for (const year of getPlayableOfficialExamYears()) {
      expect(formatJapaneseExamYear(year)).toMatch(/^令和\d+年度$/);
    }
  });

  it("令和元年・それ以前", () => {
    expect(formatJapaneseExamYear(2019)).toBe("令和元年度");
    expect(formatJapaneseExamYear(2018)).toBe("2018年度");
  });

  it("Today の年度別100問タスクも同じ表記", () => {
    expect(kakomonActivityFromSpec({ kind: "past_exam_mock", year: 2023 }).title)
      .toBe("令和5年度の公式問題100問に挑戦");
  });
});
