import { describe, expect, it } from "vitest";
import type { ReferenceBook } from "@/types/referenceBook";
import { getAllTopics } from "@/lib/content";
import { normalizeReferenceBook } from "@/lib/referenceBook";
import {
  listReferenceBookPresets,
  referenceBookFromPreset,
  referenceBookType,
  upgradePresetBook,
} from "@/lib/referenceBookPresets";
import { buildBookStudyOrder } from "@/lib/bookStudyOrder";
import { buildReferenceStudyPlan, isReferenceStudyPlanCurrent } from "@/lib/bookStudyPlan";
import { resolveStudyContext } from "@/lib/studyContext";
import legacy from "./fixtures/legacy-presets-v1.json";

// プリセット7冊は出版社（技術評論社）公式目次の章・節に一致させる（2026-10-05 確認）。
// 番号付きの見出しを学習単位（節）にし、それより下の小見出しは節のキーワードにだけ使う。

const topics = getAllTopics();
const NOW = "2026-10-05T09:00:00.000Z";

const book = (id: string) => referenceBookFromPreset(id)!;
const sectionNumbers = (b: ReferenceBook) =>
  b.chapters.map((c) => (c.sections ?? []).map((s) => s.title.split(" ")[0]));

describe("official table of contents", () => {
  it("has the official chapter / section counts for every preset", () => {
    const counts = Object.fromEntries(
      listReferenceBookPresets().map((p) => [p.id, [p.chapterCount, p.sectionCount]]),
    );
    expect(counts).toEqual({
      "gihyo-kayanoki-itpass-r08": [10, 73],
      "gihyo-kitami-itpass-r08": [16, 77],
      "gihyo-gokaku-kyohon-itpass-r08": [6, 26],
      "gihyo-itpass-saisoku-gokaku-jutsu-rev7": [7, 36],
      "gihyo-kayanoki-drill-itpass-r08": [10, 73],
      "gihyo-itpass-pocket-ox": [9, 15],
      "gihyo-itpass-perfect-learning-r08-1h": [3, 18],
    });
  });

  it("follows the official chapter order of キタミ式 (which the old preset got wrong)", () => {
    expect(book("gihyo-kitami-itpass-r08").chapters.map((c) => c.title)).toEqual([
      "Chapter0 ITってなんだ？",
      "Chapter1 コンピュータこと始め",
      "Chapter2 デジタルデータのあらわし方",
      "Chapter3 ファイルとディレクトリ",
      "Chapter4 OSとアプリケーション",
      "Chapter5 表計算ソフト",
      "Chapter6 データベース",
      "Chapter7 ネットワーク",
      "Chapter8 セキュリティ",
      "Chapter9 システム開発",
      "Chapter10 システム周りの各種マネジメント",
      "Chapter11 プログラムの作り方",
      "Chapter12 システム構成と故障対策",
      "Chapter13 企業活動と関連法規",
      "Chapter14 経営戦略のための業務改善と分析手法",
      "Chapter15 財務会計は忘れちゃいけないお金の話",
    ]);
    expect(sectionNumbers(book("gihyo-kitami-itpass-r08")).map((s) => s.length)).toEqual([
      1, 8, 6, 3, 3, 4, 5, 8, 5, 6, 4, 7, 5, 6, 3, 3,
    ]);
  });

  it("numbers sections in official order within each chapter", () => {
    for (const p of listReferenceBookPresets()) {
      if (p.id === "gihyo-itpass-perfect-learning-r08-1h") continue; // 番号の無い3部構成
      const b = book(p.id);
      b.chapters.forEach((chapter, ci) => {
        const numbers = (chapter.sections ?? []).map((s) => s.title.match(/^(\d+)[-.](\d+)/)!.slice(1).map(Number));
        numbers.forEach(([c, n], i) => {
          expect({ preset: p.id, chapter: ci, c }).toEqual({ preset: p.id, chapter: ci, c: numbers[0][0] });
          expect(n).toBe(numbers[0][1] + i);
        });
      });
    }
  });

  it("keeps deeper headings only as section keywords (合格教本の 1.1.1 など)", () => {
    const gokaku = book("gihyo-gokaku-kyohon-itpass-r08");
    const s11 = gokaku.chapters[0].sections![0];
    expect(s11.title).toBe("1.1 会社のお金にまつわるあれこれ");
    expect(s11.keywords).toEqual([
      "1.1.1 損益分岐点",
      "1.1.2 財務諸表",
      "1.1.3 在庫管理と発注方式",
      "1.1.4 減価償却",
      "1.1.5 身近な税金とインボイス",
    ]);
  });
});

describe("book types and book-order eligibility", () => {
  const eligibility = (id: string) =>
    resolveStudyContext({ preference: "book", book: book(id), topics, flag: "optin" });

  it("uses only well-mapped textbooks as the spine of the study order", () => {
    expect(eligibility("gihyo-kayanoki-itpass-r08").effectiveMode).toBe("book");
    expect(eligibility("gihyo-kitami-itpass-r08").effectiveMode).toBe("book");
    expect(eligibility("gihyo-gokaku-kyohon-itpass-r08").effectiveMode).toBe("book");
    // 最速合格術は物語型の節名だけで、扱うトピックを目次から判断できない
    const saisoku = eligibility("gihyo-itpass-saisoku-gokaku-jutsu-rev7");
    expect(saisoku.reason).toBe("quality_insufficient");
    expect(saisoku.quality?.failures).toContain("mapped_ratio");
  });

  it("keeps workbooks and question banks for reading records, not as the study-order spine", () => {
    for (const id of ["gihyo-kayanoki-drill-itpass-r08", "gihyo-itpass-pocket-ox", "gihyo-itpass-perfect-learning-r08-1h"]) {
      const ctx = eligibility(id);
      expect(ctx.effectiveMode, id).toBe("app");
      expect(ctx.quality?.failures, id).toContain("book_type");
    }
    expect(referenceBookType(book("gihyo-kayanoki-drill-itpass-r08"))).toBe("workbook");
    expect(referenceBookType(book("gihyo-itpass-pocket-ox"))).toBe("question_bank");
    // 目次の読み取り・手入力の本は教科書として扱う
    expect(referenceBookType({ title: "自分の本" })).toBe("textbook");
  });
});

describe("migrating books registered with the old (v1) preset structure", () => {
  const legacyBook = (id: string): ReferenceBook =>
    normalizeReferenceBook(JSON.parse(JSON.stringify(legacy.books[id as keyof typeof legacy.books])) as ReferenceBook);

  it("rebuilds キタミ式 to the official structure and carries reading over by topic", () => {
    const old = legacyBook("gihyo-kitami-itpass-r08");
    old.id = "my-book";
    old.note = "自分のメモ";
    // 本番の利用者と同じく、旧い章を3つ読了・ネットワークの節を読み始め
    const read = ["Chapter 0 ITってなんだ？", "Chapter 1 コンピュータ", "Chapter 5 データベース"];
    for (const c of old.chapters) {
      if (read.includes(c.title)) {
        c.done = true;
        c.completedAt = "2026-09-20T00:00:00.000Z";
        for (const s of c.sections ?? []) s.done = true;
      }
    }
    const network = old.chapters.find((c) => c.title === "Chapter 6 ネットワーク")!;
    network.sections![0].startedAt = "2026-09-25T00:00:00.000Z";

    const upgraded = upgradePresetBook(old, NOW);
    expect(upgraded.id).toBe("my-book");
    expect(upgraded.note).toBe("自分のメモ");
    expect(upgraded.source).toEqual({ kind: "preset", id: "gihyo-kitami-itpass-r08", version: 2 });
    expect(upgraded.chapters.map((c) => c.title)).toEqual(book("gihyo-kitami-itpass-r08").chapters.map((c) => c.title));

    const section = (id: string) => upgraded.chapters.flatMap((c) => c.sections ?? []).find((s) => s.id === id)!;
    // 同じ章（ITってなんだ？）は章ごと読了を引き継ぐ
    expect(section("kitami-r08-0-1").done).toBe(true);
    // 旧い「データベース」章で読んだトピックの節は読了
    expect(section("kitami-r08-6-1").done).toBe(true);
    expect(section("kitami-r08-6-2").done).toBe(true);
    // 旧いコンピュータ章（2進数・ハードウェア）で読んだトピックの節は読了
    expect(section("kitami-r08-1-1").done).toBe(true);
    expect(section("kitami-r08-2-1").done).toBe(true);
    // 扱うトピックの無い節は、同じ章の読了が無ければ推測で読了にしない
    expect(section("kitami-r08-1-3").done).toBeUndefined();
    // 読んでいない章のトピックは未読のまま、読み始めは引き継ぐ
    expect(section("kitami-r08-8-1").done).toBeUndefined();
    expect(section("kitami-r08-7-1").startedAt).toBe("2026-09-25T00:00:00.000Z");
    expect(section("kitami-r08-7-1").done).toBeUndefined();
  });

  it("carries whole-chapter reading for かやのき (same chapters, finer sections)", () => {
    const old = legacyBook("gihyo-kayanoki-itpass-r08");
    old.chapters[2].done = true; // 第3章 システム構成
    const upgraded = upgradePresetBook(old, NOW);
    const ch3 = upgraded.chapters[2];
    expect(ch3.title).toBe("第3章 システム構成［テクノロジ系］");
    expect(ch3.sections).toHaveLength(6);
    expect(ch3.sections!.every((s) => s.done)).toBe(true);
    expect(ch3.done).toBe(true);
    expect(upgraded.chapters[3].sections!.some((s) => s.done)).toBe(false);
  });

  it("does not rebuild a book the user edited, and never mixes old and new sections", () => {
    const old = legacyBook("gihyo-kitami-itpass-r08");
    old.chapters.push({ id: "ch-mine", title: "自分で追加した章", sections: [] });
    const upgraded = upgradePresetBook(old, NOW);
    expect(upgraded.chapters.map((c) => c.id)).toEqual(old.chapters.map((c) => c.id));
    expect(upgraded.chapters.flatMap((c) => c.sections ?? []).every((s) => !/-\d+-\d+$/.test(s.id))).toBe(true);
    expect(upgraded.source?.version).toBe(2);
  });

  it("is idempotent and leaves current books untouched", () => {
    const fresh = book("gihyo-kitami-itpass-r08");
    expect(upgradePresetBook(fresh, NOW)).toBe(fresh);
    const once = upgradePresetBook(legacyBook("gihyo-kitami-itpass-r08"), NOW);
    expect(upgradePresetBook(once, NOW)).toBe(once);
  });

  it("re-plans the reference study plan because the structure changed (learning progress is kept elsewhere)", () => {
    const old = legacyBook("gihyo-kitami-itpass-r08");
    const oldOrder = buildBookStudyOrder(old, topics)!;
    const plan = buildReferenceStudyPlan({ order: oldOrder, bookId: "b", topics, profile: undefined, completedTopicIds: [], now: new Date(NOW) });
    const newOrder = buildBookStudyOrder(upgradePresetBook(old, NOW), topics)!;
    expect(isReferenceStudyPlanCurrent(plan, { bookId: "b", order: newOrder, profile: undefined })).toBe(false);
  });
});
