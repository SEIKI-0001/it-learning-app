// 公開過去問ページに足す独自の中身（選択肢ごとの解説・解説スライドの静止画）のデータを守るテスト。
// 選択肢ごとの解説の書き方は docs/content/kakomon-choice-notes.md。
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getKakomonQuestionsByYear } from "@/lib/publicPages/kakomon";
import { getKakomonChoiceNotes, getKakomonSlideFigure, parseNoteText } from "@/lib/publicPages/kakomonEnrich";
import { getKaisetsuTopic } from "@/lib/publicPages/kaisetsu";
import { wordPath } from "@/lib/publicPages/words";
import { getAllWords } from "@/lib/wordlist";
import notes2025 from "@/data/kakomon/choiceNotes/2025.json";
import notes2026 from "@/data/kakomon/choiceNotes/2026.json";
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

  it("returns null for years without notes", () => {
    expect(getKakomonChoiceNotes(2022, 1, "A")).toBeNull();
  });
});

// 選択肢ごとの解説を書いた年度すべてに当てる形式のチェック。
const NOTE_FILES: Record<number, Record<string, unknown>> = { 2025: notes2025, 2026: notes2026 };
// 2026-11 の書き方（1項目60〜120字・中身のない定型句なし）で書き直し済みの年度。
// 令和8年度は書き直しが終わったらここに足す。
const STYLE_CHECKED_YEARS = [2025];
const MIN_CHARS = 60;
const MAX_CHARS = 120;
// 理由を書かずに済ませる言い回し。これだけで終わる解説を防ぐ。
const EMPTY_PHRASES = ["よく出題", "頻出です", "これは誤りです", "誤りです。", "正しいです。", "覚えておきましょう"];

describe.each(Object.keys(NOTE_FILES).map(Number))("kakomon choice notes format (%i)", (year) => {
  const questions = getKakomonQuestionsByYear(year);
  const notedNumbers = Object.keys(NOTE_FILES[year]).map(Number);

  it("is keyed by existing question numbers", () => {
    const existing = new Set(questions.map((q) => q.view.questionNumber));
    for (const no of notedNumbers) expect(existing.has(no), `問${no}`).toBe(true);
  });

  it("gives one note per choice and marks exactly the official answer as correct", () => {
    for (const q of questions.filter((x) => notedNumbers.includes(x.view.questionNumber))) {
      const notes = getKakomonChoiceNotes(year, q.view.questionNumber, q.view.correctChoice)!;
      if (notes.kind === "choices") {
        expect(notes.items.map((i) => i.label), `問${q.view.questionNumber}`).toEqual(["ア", "イ", "ウ", "エ"]);
        expect(notes.items.filter((i) => i.correct)).toHaveLength(1);
      }
    }
  });

  it("uses statement notes only for questions that list statements a, b, c…, with the same labels", () => {
    for (const q of questions.filter((x) => notedNumbers.includes(x.view.questionNumber))) {
      const notes = getKakomonChoiceNotes(year, q.view.questionNumber, q.view.correctChoice)!;
      const labels = [...q.view.prompt.matchAll(/^([a-d]) /gm)].map((m) => m[1]);
      if (notes.kind === "statements") {
        expect(notes.items.map((i) => i.label), `問${q.view.questionNumber}`).toEqual(labels);
      } else {
        expect(labels, `問${q.view.questionNumber}: 記述 a〜 がある問題は記述ごとに書く`).toEqual([]);
      }
    }
  });

  it("links only to existing word and kaisetsu pages", () => {
    const words = new Set(getAllWords().map((w) => wordPath(w.id)));
    for (const q of questions.filter((x) => notedNumbers.includes(x.view.questionNumber))) {
      const notes = getKakomonChoiceNotes(year, q.view.questionNumber, q.view.correctChoice)!;
      for (const item of notes.items) {
        expect(item.text, `問${q.view.questionNumber} ${item.label}: リンク記法の書き損じ`).not.toMatch(/[[\]]\(?|\]\(/);
        for (const seg of item.segments) {
          if (!seg.href) continue;
          const ok = seg.href.startsWith("/words/")
            ? words.has(seg.href)
            : getKaisetsuTopic(seg.href.replace("/kaisetsu/", "")) !== null;
          expect(ok, `問${q.view.questionNumber} ${item.label}: ${seg.href}`).toBe(true);
        }
      }
    }
  });

  if (STYLE_CHECKED_YEARS.includes(year)) {
    it(`keeps each note between ${MIN_CHARS} and ${MAX_CHARS} characters, without empty phrases`, () => {
      for (const q of questions.filter((x) => notedNumbers.includes(x.view.questionNumber))) {
        const notes = getKakomonChoiceNotes(year, q.view.questionNumber, q.view.correctChoice)!;
        for (const item of notes.items) {
          const where = `問${q.view.questionNumber} ${item.label}（${item.text.length}字）`;
          expect(item.text.length, where).toBeGreaterThanOrEqual(MIN_CHARS);
          expect(item.text.length, where).toBeLessThanOrEqual(MAX_CHARS);
          for (const phrase of EMPTY_PHRASES) expect(item.text, where).not.toContain(phrase);
        }
      }
    });
  }
});

describe("parseNoteText", () => {
  it("splits word and kaisetsu links out of the text", () => {
    expect(parseNoteText("[ISMS](/words/isms)の規格。[4P](/kaisetsu/strat-marketing-4p)とは違う")).toEqual([
      { text: "ISMS", href: "/words/isms" },
      { text: "の規格。" },
      { text: "4P", href: "/kaisetsu/strat-marketing-4p" },
      { text: "とは違う" },
    ]);
  });

  it("leaves text without links as one segment", () => {
    expect(parseNoteText("リンクなし")).toEqual([{ text: "リンクなし" }]);
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
