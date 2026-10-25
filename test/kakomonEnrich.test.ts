// 公開過去問ページに足す独自の中身（選択肢ごとの解説・解説スライドの静止画）のデータを守るテスト。
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getKakomonQuestionsByYear } from "@/lib/publicPages/kakomon";
import { getKakomonChoiceNotes, getKakomonSlideFigure } from "@/lib/publicPages/kakomonEnrich";
import { getKaisetsuTopic } from "@/lib/publicPages/kaisetsu";
import slideFigures from "@/data/kakomon/slideFigures.json";

const ROOT = path.resolve(__dirname, "..");

describe("kakomon choice notes (令和8年度)", () => {
  const questions = getKakomonQuestionsByYear(2026);

  it("covers all 100 questions", () => {
    expect(questions).toHaveLength(100);
    for (const q of questions) {
      expect(getKakomonChoiceNotes(2026, q.view.questionNumber, q.view.correctChoice), `問${q.view.questionNumber}`).not.toBeNull();
    }
  });

  it("gives one note per choice and marks exactly the official answer as correct", () => {
    for (const q of questions) {
      const notes = getKakomonChoiceNotes(2026, q.view.questionNumber, q.view.correctChoice)!;
      expect(notes.point.length).toBeGreaterThan(10);
      if (notes.kind === "choices") {
        expect(notes.items.map((i) => i.label), `問${q.view.questionNumber}`).toEqual(["ア", "イ", "ウ", "エ"]);
        expect(notes.items.filter((i) => i.correct)).toHaveLength(1);
      }
    }
  });

  it("uses statement notes only for questions that list statements a, b, c…, with the same labels", () => {
    for (const q of questions) {
      const notes = getKakomonChoiceNotes(2026, q.view.questionNumber, q.view.correctChoice)!;
      const labels = [...q.view.prompt.matchAll(/^([a-d]) /gm)].map((m) => m[1]);
      if (notes.kind === "statements") {
        expect(notes.items.map((i) => i.label), `問${q.view.questionNumber}`).toEqual(labels);
      }
    }
  });

  it("returns null for years without notes", () => {
    expect(getKakomonChoiceNotes(2022, 1, "A")).toBeNull();
  });
});

describe("kakomon slide figures", () => {
  const map = slideFigures as unknown as Record<string, Record<string, [string, number]>>;

  it("has a captured image file for every mapped question, from an existing topic", () => {
    for (const [year, byNo] of Object.entries(map)) {
      for (const [no, [topicId]] of Object.entries(byNo)) {
        const fig = getKakomonSlideFigure(Number(year), Number(no));
        expect(fig, `${year}/${no}`).not.toBeNull();
        expect(existsSync(path.join(ROOT, "public", fig!.src)), fig!.src).toBe(true);
        expect(fig!.caption.length).toBeGreaterThan(0);
        expect(getKaisetsuTopic(topicId), topicId).not.toBeNull();
      }
    }
  });

  it("returns null for questions without a mapped slide", () => {
    expect(getKakomonSlideFigure(2026, 1)).toBeNull();
  });
});
