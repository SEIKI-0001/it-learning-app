import { describe, expect, it } from "vitest";
import type { Topic } from "@/types/content";
import type { ReferenceBook } from "@/types/referenceBook";
import { getAllTopics } from "@/lib/content";
import {
  buildBookStudyOrder,
  currentBookUnit,
  nextBookTopicIds,
  SUPPLEMENT_UNIT_LABEL,
} from "@/lib/bookStudyOrder";
import { assessBookQuality } from "@/lib/bookQuality";
import {
  effectiveBookOrder,
  parseBookOrderFlag,
  resolveStudyContext,
} from "@/lib/studyContext";
import { findReferenceLocation, normalizeReferenceBook, referenceTargetsForTopics } from "@/lib/referenceBook";
import { listReferenceBookPresets, referenceBookFromPreset } from "@/lib/referenceBookPresets";

// 参考書が「新しく学ぶ順番」を決める層。アプリ順の挙動（本なし）はここでは何も変えない。

function topic(
  id: string,
  field: Topic["field"],
  category: string,
  importance: Topic["importance"] = 3,
  difficulty: Topic["difficulty"] = 1,
): Topic {
  return { id, field, category, importance, difficulty } as Topic;
}

const TOPICS: Topic[] = [
  topic("t-net", "technology", "ネットワーク"),
  topic("t-sec", "technology", "セキュリティ"),
  topic("t-db", "technology", "データベース"),
  topic("t-net2", "technology", "ネットワーク", 2),
  topic("m-pm", "management", "プロジェクト"),
  topic("s-law", "strategy", "法務"),
  topic("s-acc", "strategy", "会計", 2, 2),
];

function book(chapters: ReferenceBook["chapters"]): ReferenceBook {
  return normalizeReferenceBook({
    title: "テスト本",
    active: true,
    updatedAt: "2026-10-01T00:00:00.000Z",
    chapters,
  });
}

describe("buildBookStudyOrder", () => {
  it("returns null without a usable book or without any mapped topic", () => {
    expect(buildBookStudyOrder(null, TOPICS)).toBeNull();
    expect(buildBookStudyOrder(book([]), TOPICS)).toBeNull();
    expect(
      buildBookStudyOrder({ ...book([{ id: "c", title: "第1章", topicIds: ["t-net"] }]), active: false }, TOPICS),
    ).toBeNull();
    expect(buildBookStudyOrder(book([{ id: "c", title: "第1章", topicIds: ["nope"] }]), TOPICS)).toBeNull();
  });

  it("uses chapter units for a chapter-only book, keeping the listed order", () => {
    const order = buildBookStudyOrder(
      book([
        { id: "c1", title: "第1章 法務", topicIds: ["s-law"] },
        { id: "c2", title: "第2章 技術", topicIds: ["t-sec", "t-net"] },
      ]),
      TOPICS,
    )!;
    const bookUnits = order.units.filter((u) => u.level !== "supplement");
    expect(bookUnits.map((u) => [u.unitId, u.level, u.topicIds])).toEqual([
      ["ch:c1", "chapter", ["s-law"]],
      ["ch:c2", "chapter", ["t-sec", "t-net"]],
    ]);
    expect(order.orderIndex.get("s-law")).toBe(0);
    expect(order.orderIndex.get("t-sec")!).toBeLessThan(order.orderIndex.get("t-net")!);
  });

  it("uses section units when sections exist, and a chapter-rest unit for chapter-level leftovers", () => {
    const order = buildBookStudyOrder(
      book([
        {
          id: "c1",
          title: "第1章 技術",
          topicIds: ["t-db"],
          sections: [
            { id: "s1", title: "1-1 ネット", topicIds: ["t-net"] },
            { id: "s2", title: "1-2 セキュリティ", topicIds: ["t-sec"] },
            { id: "s3", title: "1-3 コラム" },
          ],
        },
      ]),
      TOPICS,
    )!;
    const bookUnits = order.units.filter((u) => u.level !== "supplement");
    expect(bookUnits.map((u) => [u.unitId, u.level, u.topicIds, u.readingOnly])).toEqual([
      ["sec:s1", "section", ["t-net"], false],
      ["sec:s2", "section", ["t-sec"], false],
      ["sec:s3", "section", [], true],
      ["chr:c1", "chapter_rest", ["t-db"], false],
    ]);
    expect(bookUnits[0].label).toBe("第1章 技術 ／ 1-1 ネット");
  });

  it("assigns duplicated topics by the same rule as findReferenceLocation (section wins)", () => {
    const b = book([
      { id: "c1", title: "第1章", topicIds: ["t-net"] },
      { id: "c2", title: "第2章", sections: [{ id: "s2", title: "2-1", topicIds: ["t-net", "t-sec"] }] },
    ]);
    const order = buildBookStudyOrder(b, TOPICS)!;
    expect(order.unitOfTopic.get("t-net")).toBe("sec:s2");
    expect(findReferenceLocation(b, "t-net")?.section?.id).toBe("s2");
    // 第1章は紐づくトピックが無くなり「読むだけ」
    expect(order.units.find((u) => u.unitId === "ch:c1")?.readingOnly).toBe(true);
  });

  it("matches the reading targets used by ReadingCheck for section units", () => {
    const b = book([
      { id: "c1", title: "第1章", sections: [{ id: "s1", title: "1-1", topicIds: ["t-net", "t-sec"] }] },
    ]);
    const order = buildBookStudyOrder(b, TOPICS)!;
    const unit = order.units[0];
    expect(referenceTargetsForTopics(b, unit.topicIds)).toEqual([{ chapterId: "c1", sectionId: "s1" }]);
  });

  it("drops unknown ids, reads legacy aliases, and reports unknown ids", () => {
    const real = getAllTopics();
    const order = buildBookStudyOrder(
      book([{ id: "c1", title: "第1章", topicIds: ["tech-network-lan-wan", "strat-dx"] }]),
      real,
    )!;
    expect(order.mappedTopicIds).toEqual(["tech-lan-wan"]);
    expect(order.unknownTopicIds).toEqual(["strat-dx"]);
  });

  it("places supplements after the last unit of the same category, then field, then the end", () => {
    const order = buildBookStudyOrder(
      book([
        { id: "c1", title: "第1章", topicIds: ["t-net"] },
        { id: "c2", title: "第2章", topicIds: ["m-pm"] },
        { id: "c3", title: "第3章", topicIds: ["t-sec"] },
      ]),
      TOPICS,
    )!;
    const ids = order.units.map((u) => u.unitId);
    // t-net2(同じ中分類) → 第1章の後 / t-db(同分野) → 技術の最後=第3章の後 / 戦略2件(どちらも無い) → 末尾
    expect(ids).toEqual(["ch:c1", "sup:ch:c1", "ch:c2", "ch:c3", "sup:ch:c3"]);
    expect(order.units[1].topicIds).toEqual(["t-net2"]);
    expect(order.units[1].label).toBe(SUPPLEMENT_UNIT_LABEL);
    // 末尾の補足は重要度→難易度→id の順
    expect(order.units[4].topicIds).toEqual(["s-law", "t-db", "s-acc"]);
    expect(order.supplementTopicIds.sort()).toEqual(["s-acc", "s-law", "t-db", "t-net2"]);
    expect(order.orderIndex.size).toBe(TOPICS.length);
  });

  it("keeps the structure hash stable for the same structure and changes it when the order changes", () => {
    const chapters = [
      { id: "c1", title: "第1章", topicIds: ["t-net"] },
      { id: "c2", title: "第2章", topicIds: ["t-sec"] },
    ];
    const a = buildBookStudyOrder(book(chapters), TOPICS)!;
    const b = buildBookStudyOrder({ ...book(chapters), updatedAt: "2026-10-02T00:00:00.000Z" }, TOPICS)!;
    const c = buildBookStudyOrder(book([chapters[1], chapters[0]]), TOPICS)!;
    expect(a.structureHash).toBe(b.structureHash);
    expect(a.structureHash).not.toBe(c.structureHash);
  });

  it("finds the current unit and next topics, skipping reading-only units", () => {
    const mappedOnly = TOPICS.filter((t) => ["t-net", "t-sec", "m-pm"].includes(t.id));
    const order = buildBookStudyOrder(
      book([
        { id: "c0", title: "はじめに" },
        { id: "c1", title: "第1章", topicIds: ["t-net", "t-sec"] },
        { id: "c2", title: "第2章", topicIds: ["m-pm"] },
      ]),
      mappedOnly,
    )!;
    expect(currentBookUnit(order, [])?.unitId).toBe("ch:c1");
    expect(currentBookUnit(order, ["t-net"])?.unitId).toBe("ch:c1");
    expect(currentBookUnit(order, ["t-net", "t-sec"])?.unitId).toBe("ch:c2");
    expect(nextBookTopicIds(order, ["t-net"], 2)).toEqual(["t-sec", "m-pm"]);
    expect(currentBookUnit(order, mappedOnly.map((t) => t.id))).toBeNull();
  });

  it("builds an order from every bundled preset with the real topic catalog", () => {
    const topics = getAllTopics();
    for (const preset of listReferenceBookPresets()) {
      const order = buildBookStudyOrder(referenceBookFromPreset(preset.id)!, topics);
      expect(order, preset.id).not.toBeNull();
      // すべてのトピックがちょうど1回ずつ並ぶ
      const all = order!.units.flatMap((u) => u.topicIds);
      expect(new Set(all).size, preset.id).toBe(topics.length);
      expect(all.length, preset.id).toBe(topics.length);
    }
  });
});

describe("assessBookQuality", () => {
  it("rejects a book where only a few topics are mapped", () => {
    const topics = getAllTopics();
    const order = buildBookStudyOrder(
      book([{ id: "c1", title: "第1章", topicIds: [topics[0].id] }]),
      topics,
    );
    const quality = assessBookQuality(order, topics);
    expect(quality.eligible).toBe(false);
    expect(quality.failures).toEqual(
      expect.arrayContaining(["mapped_ratio", "important_mapped_ratio", "field_coverage", "unit_count"]),
    );
    expect(quality.supplementCount).toBe(topics.length - 1);
  });

  it("rejects when there is no order", () => {
    const quality = assessBookQuality(null, TOPICS);
    expect(quality.eligible).toBe(false);
    expect(quality.failures.length).toBeGreaterThan(0);
  });

  it("accepts a well-mapped book", () => {
    const order = buildBookStudyOrder(
      book([
        { id: "c1", title: "第1章", topicIds: ["t-net", "t-sec", "t-db"] },
        { id: "c2", title: "第2章", topicIds: ["m-pm"] },
        { id: "c3", title: "第3章", topicIds: ["s-law", "s-acc"] },
      ]),
      TOPICS,
    );
    const quality = assessBookQuality(order, TOPICS);
    expect(quality.failures).toEqual([]);
    expect(quality.eligible).toBe(true);
    expect(quality.mappedByField).toEqual({ technology: 3, management: 1, strategy: 2 });
  });

  it("accepts the bundled textbook presets", () => {
    const topics = getAllTopics();
    for (const id of ["gihyo-kayanoki-itpass-r08", "gihyo-kitami-itpass-r08"]) {
      const order = buildBookStudyOrder(referenceBookFromPreset(id)!, topics);
      expect(assessBookQuality(order, topics).eligible, id).toBe(true);
    }
  });
});

describe("resolveStudyContext", () => {
  const good = book([
    { id: "c1", title: "第1章", topicIds: ["t-net", "t-sec", "t-db"] },
    { id: "c2", title: "第2章", topicIds: ["m-pm"] },
    { id: "c3", title: "第3章", topicIds: ["s-law", "s-acc"] },
  ]);
  const base = { topics: TOPICS, book: good, preference: "book" as const, flag: "optin" as const };

  it("parses the flag safely", () => {
    expect(parseBookOrderFlag(undefined)).toBe("off");
    expect(parseBookOrderFlag("on")).toBe("off");
    expect(parseBookOrderFlag(" optin ")).toBe("optin");
  });

  it("resolves each reason, and only 'ok' becomes book mode", () => {
    expect(resolveStudyContext({ ...base, flag: "off" }).reason).toBe("flag_off");
    expect(resolveStudyContext({ ...base, preference: null }).reason).toBe("not_opted_in");
    expect(resolveStudyContext({ ...base, preference: "app" }).reason).toBe("not_opted_in");
    expect(resolveStudyContext({ ...base, book: null }).reason).toBe("no_book");
    expect(
      resolveStudyContext({ ...base, book: book([{ id: "c", title: "第1章", topicIds: ["t-net"] }]) }).reason,
    ).toBe("quality_insufficient");
    const ok = resolveStudyContext(base);
    expect(ok.reason).toBe("ok");
    expect(ok.effectiveMode).toBe("book");
    expect(effectiveBookOrder(ok)).not.toBeNull();
    for (const reason of ["flag_off", "not_opted_in"] as const) {
      const ctx = resolveStudyContext({ ...base, ...(reason === "flag_off" ? { flag: "off" as const } : { preference: null }) });
      expect(ctx.effectiveMode).toBe("app");
      expect(effectiveBookOrder(ctx)).toBeNull();
      // 診断・プレビュー用に順序と品質は持つ
      expect(ctx.order).toBeDefined();
      expect(ctx.quality?.eligible).toBe(true);
    }
  });

  it("keeps the app planning key independent of the book", () => {
    const a = resolveStudyContext({ ...base, preference: null });
    const b = resolveStudyContext({ ...base, preference: null, book: null });
    expect(a.planningKey).toBe(b.planningKey);
  });

  it("changes the planning key when mode, structure, plan revision or study time changes", () => {
    const ok = resolveStudyContext(base);
    const keys = new Set([
      ok.planningKey,
      resolveStudyContext({ ...base, preference: "app" }).planningKey,
      resolveStudyContext({ ...base, studyPlanRevision: 2 }).planningKey,
      resolveStudyContext({ ...base, weekdayMinutes: 30 }).planningKey,
      resolveStudyContext({ ...base, examDate: "2026-12-01" }).planningKey,
      resolveStudyContext({
        ...base,
        book: book([...good.chapters].reverse()),
      }).planningKey,
    ]);
    expect(keys.size).toBe(6);
    expect(resolveStudyContext(base).planningKey).toBe(ok.planningKey);
  });
});
