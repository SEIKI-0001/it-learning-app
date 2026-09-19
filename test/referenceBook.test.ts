import { describe, expect, it } from "vitest";
import type { ReferenceBook } from "@/types/referenceBook";
import { getAllTopics } from "@/lib/content";
import {
  LEGACY_TOPIC_ID_ALIASES,
  applyReadingLevel,
  canonicalTopicId,
  findReferenceLocation,
  isChapterRead,
  normalizeReferenceBook,
  pickNewerReferenceBook,
  referenceBookProgress,
  referenceBookRatioFromRow,
  referenceTargetsForTopics,
  resolveReferenceGuide,
  setChapterRead,
  setSectionRead,
} from "@/lib/referenceBook";
import {
  listReferenceBookPresets,
  referenceBookFromChoice,
  referenceBookFromPreset,
} from "@/lib/referenceBookPresets";

// 参考書 = 「サービスが決めた今日のトピック」を、ユーザーの参考書の章・節へ変換する層。
// ここでは変換（場所の解決・フォールバック）と、/today の回答からの読了状態の更新を確かめる。

const NOW = "2026-09-19T09:00:00.000Z";
const LATER = "2026-09-20T09:00:00.000Z";

function book(): ReferenceBook {
  return normalizeReferenceBook({
    title: "テスト参考書",
    active: true,
    updatedAt: "2026-09-01T00:00:00.000Z",
    chapters: [
      {
        id: "ch1",
        title: "第1章 ネットワーク",
        topicIds: ["topic-net"],
        keywords: ["ネットワーク"],
        sections: [
          { id: "s1", title: "IPアドレス", topicIds: ["topic-ip", "topic-ip-2"], keywords: ["IPアドレス"] },
          { id: "s2", title: "DNS", topicIds: ["topic-dns"], keywords: ["DNS", "ドメイン名"] },
        ],
      },
      {
        id: "ch2",
        title: "第2章 セキュリティ",
        keywords: ["セキュリティ"],
        sections: [
          { id: "s3", title: "暗号化", topicIds: ["topic-crypto"], keywords: ["暗号化"] },
        ],
      },
      // 節のない章（旧形式・目次貼り付けなしの手入力を想定）
      { id: "ch3", title: "第3章 経営", topicIds: ["topic-strategy"], keywords: ["SWOT分析"] },
    ],
  });
}

const hints = (...keywords: string[]) => [{ keywords }];

describe("プリセット参考書", () => {
  it("登録済みプリセットを一覧でき、選ぶと章・節構成つきの参考書になる", () => {
    const presets = listReferenceBookPresets();
    expect(presets.length).toBeGreaterThanOrEqual(7);
    const kitami = presets.find((p) => p.id === "gihyo-kitami-itpass-r08");
    expect(kitami).toBeDefined();

    const chosen = referenceBookFromChoice({ kind: "preset", presetId: kitami!.id });
    expect(chosen?.title).toBe(kitami!.title);
    expect(chosen?.active).toBe(true);
    expect(chosen?.chapters.length).toBe(kitami!.chapterCount);
  });

  it("「あとで設定する」と空欄の「その他」は何も保存しない", () => {
    expect(referenceBookFromChoice({ kind: "later" })).toBeNull();
    expect(referenceBookFromChoice({ kind: "other", title: "  " })).toBeNull();
  });

  it("「その他」は書名だけの参考書になる（章立ては後から）", () => {
    const other = referenceBookFromChoice({ kind: "other", title: "独自の参考書" });
    expect(other?.title).toBe("独自の参考書");
    expect(other?.chapters).toEqual([]);
  });
});

describe("トピック → 参考書の場所", () => {
  it("Topic ID から節を優先して章・節を取得する", () => {
    const loc = findReferenceLocation(book(), "topic-ip");
    expect(loc?.chapter.id).toBe("ch1");
    expect(loc?.section?.id).toBe("s1");
  });

  it("プリセットでも Topic ID から章・節を引ける", () => {
    const kitami = referenceBookFromPreset("gihyo-kitami-itpass-r08");
    const loc = findReferenceLocation(kitami, "tech-network-address");
    expect(loc?.chapter.title).toContain("ネットワーク");
    expect(loc?.section?.title).toContain("IPアドレス");
  });

  it("紐づけがあれば mapped（断定）で案内する", () => {
    const guide = resolveReferenceGuide(book(), {
      id: "topic-dns",
      title: "DNS",
      referenceHints: hints("DNS"),
    });
    expect(guide.kind).toBe("mapped");
    if (guide.kind === "mapped") expect(guide.location.section?.id).toBe("s2");
  });

  it("紐づけが無ければ章・節のキーワード一致を「候補」として返す", () => {
    const guide = resolveReferenceGuide(book(), {
      id: "topic-unmapped",
      title: "ドメイン名の仕組み",
      referenceHints: hints("ドメイン名"),
    });
    expect(guide.kind).toBe("candidate");
    if (guide.kind === "candidate") {
      expect(guide.location.section?.id).toBe("s2");
      expect(guide.keywords).toEqual(["ドメイン名"]);
    }
  });

  it("キーワード一致が別々の章で同点なら断定せず referenceHints へフォールバックする", () => {
    const guide = resolveReferenceGuide(book(), {
      id: "topic-unmapped",
      title: "混在",
      referenceHints: hints("DNS", "暗号化"),
    });
    expect(guide).toEqual({ kind: "keywords", keywords: ["DNS", "暗号化"] });
  });

  it("参考書未登録なら referenceHints のキーワードで案内する", () => {
    const guide = resolveReferenceGuide(null, {
      id: "topic-ip",
      title: "IPアドレス",
      referenceHints: hints("IPアドレス", "サブネット"),
    });
    expect(guide).toEqual({ kind: "keywords", keywords: ["IPアドレス", "サブネット"] });
  });

  it("キーワードも無ければ索引でトピック名を探す案内にする", () => {
    const guide = resolveReferenceGuide(null, { id: "x", title: "RAID", referenceHints: [] });
    expect(guide).toEqual({ kind: "index", term: "RAID" });
  });

  it("使用中でない参考書は案内に使わない", () => {
    const inactive = { ...book(), active: false };
    const guide = resolveReferenceGuide(inactive, {
      id: "topic-ip",
      title: "IPアドレス",
      referenceHints: hints("IPアドレス"),
    });
    expect(guide.kind).toBe("keywords");
  });
});

describe("読了の対象（その日のトピック → 章・節）", () => {
  it("同じ節に紐づく複数トピックは1件にまとめ、複数の節はすべて対象にする", () => {
    const targets = referenceTargetsForTopics(book(), [
      "topic-ip",
      "topic-ip-2",
      "topic-crypto",
      "topic-strategy",
    ]);
    expect(targets).toEqual([
      { chapterId: "ch1", sectionId: "s1" },
      { chapterId: "ch2", sectionId: "s3" },
      { chapterId: "ch3" },
    ]);
  });

  it("節のある章に章単位でだけ紐づくトピックは、章全体を読了にしない", () => {
    expect(referenceTargetsForTopics(book(), ["topic-net"])).toEqual([]);
  });

  it("参考書未登録なら対象なし", () => {
    expect(referenceTargetsForTopics(null, ["topic-ip"])).toEqual([]);
  });
});

describe("ReadingCheck の回答 → 参考書の読了状態", () => {
  const targets = [{ chapterId: "ch1", sectionId: "s1" }];

  it("「全部」で対象の節が読了になる", () => {
    const next = applyReadingLevel(book(), targets, "all", NOW);
    const s1 = next.chapters[0].sections![0];
    expect(s1.done).toBe(true);
    expect(s1.completedAt).toBe(NOW);
    expect(next.updatedAt).toBe(NOW);
  });

  it("「半分」「少し」では読了にならない（部分読了の印だけ付く）", () => {
    for (const level of ["half", "little"] as const) {
      const next = applyReadingLevel(book(), targets, level, NOW);
      const s1 = next.chapters[0].sections![0];
      expect(s1.done).toBeUndefined();
      expect(s1.startedAt).toBe(NOW);
    }
  });

  it("「まだ」「今日は読まない」では何も変えない", () => {
    const b = book();
    expect(applyReadingLevel(b, targets, "none", NOW)).toBe(b);
    expect(applyReadingLevel(b, targets, "rest", NOW)).toBe(b);
  });

  it("一度読了にした節は、日次回答を「半分」「まだ」に変えても未読に戻らない", () => {
    const read = applyReadingLevel(book(), targets, "all", NOW);
    for (const level of ["half", "little", "none", "rest"] as const) {
      const next = applyReadingLevel(read, targets, level, LATER);
      expect(next.chapters[0].sections![0].done).toBe(true);
      expect(next.chapters[0].sections![0].completedAt).toBe(NOW);
    }
  });

  it("同じ日に「全部」を押し直しても重複更新しない", () => {
    const read = applyReadingLevel(book(), targets, "all", NOW);
    expect(applyReadingLevel(read, targets, "all", LATER)).toBe(read);
  });

  it("節のない章は章単位で読了になる", () => {
    const next = applyReadingLevel(book(), [{ chapterId: "ch3" }], "all", NOW);
    expect(next.chapters[2].done).toBe(true);
    expect(next.chapters[2].completedAt).toBe(NOW);
  });
});

describe("章の読了は節から算出する", () => {
  it("章内の全節が読了になると章も読了になる", () => {
    let b = applyReadingLevel(book(), [{ chapterId: "ch1", sectionId: "s1" }], "all", NOW);
    expect(isChapterRead(b.chapters[0])).toBe(false);
    expect(b.chapters[0].done).toBe(false);

    b = applyReadingLevel(b, [{ chapterId: "ch1", sectionId: "s2" }], "all", LATER);
    expect(isChapterRead(b.chapters[0])).toBe(true);
    expect(b.chapters[0].done).toBe(true);
    expect(b.chapters[0].completedAt).toBe(LATER);
  });

  it("設定画面で節を未読に戻すと章の読了も外れる（旧データの章 done は他の節を読了として残す）", () => {
    const legacy = setChapterRead(book(), "ch1", false);
    legacy.chapters[0] = { ...legacy.chapters[0], done: true }; // 旧データ: 章だけ done
    const next = setSectionRead(legacy, "ch1", "s1", false, NOW);
    expect(next.chapters[0].done).toBe(false);
    expect(next.chapters[0].sections![0].done).toBe(false);
    expect(next.chapters[0].sections![1].done).toBe(true);
  });

  it("設定画面で章を読了にすると節もすべて読了になる", () => {
    const next = setChapterRead(book(), "ch1", true, NOW);
    expect(next.chapters[0].sections!.every((s) => s.done)).toBe(true);
  });
});

describe("参考書の進捗", () => {
  it("節単位（節のない章は章単位）で数える", () => {
    const b = applyReadingLevel(
      book(),
      [
        { chapterId: "ch1", sectionId: "s1" },
        { chapterId: "ch3" },
      ],
      "all",
      NOW,
    );
    // 単位: s1, s2, s3, ch3 = 4。読了: s1, ch3 = 2
    expect(referenceBookProgress(b)).toEqual({
      done: 2,
      total: 4,
      ratio: 0.5,
      doneChapters: 1,
      totalChapters: 3,
    });
  });

  it("節のない旧形式の参考書でも章単位で動く", () => {
    const legacy = normalizeReferenceBook({
      title: "旧形式",
      active: true,
      updatedAt: NOW,
      chapters: [
        { id: "a", title: "1章", done: true },
        { id: "b", title: "2章" },
      ],
    });
    expect(referenceBookProgress(legacy)).toMatchObject({ done: 1, total: 2, ratio: 0.5 });
  });

  it("旧データの chapters[].done は、その章の節を読了として数える（0% に戻らない）", () => {
    const b = book();
    b.chapters[0] = { ...b.chapters[0], done: true }; // 節には done が無い旧データ
    const progress = referenceBookProgress(b)!;
    expect(progress.done).toBe(2);
    expect(progress.doneChapters).toBe(1);
  });

  it("DB 行からの進捗率も同じ計算（/plan と合格準備度の入力が一致する）", () => {
    const b = applyReadingLevel(book(), [{ chapterId: "ch3" }], "all", NOW);
    expect(referenceBookRatioFromRow({ active: true, chapters: b.chapters })).toBe(
      Math.round(referenceBookProgress(b)!.ratio * 100),
    );
    expect(referenceBookRatioFromRow({ active: false, chapters: b.chapters })).toBeNull();
    expect(referenceBookRatioFromRow({ active: true, chapters: [] })).toBeNull();
    expect(referenceBookRatioFromRow(null)).toBeNull();
  });

  it("normalize は節の読了状態を保持する（DB・端末の往復で消えない）", () => {
    const read = applyReadingLevel(book(), [{ chapterId: "ch1", sectionId: "s1" }], "all", NOW);
    const roundTrip = normalizeReferenceBook(JSON.parse(JSON.stringify(read)));
    expect(roundTrip.chapters[0].sections![0]).toMatchObject({ done: true, completedAt: NOW });
  });
});

describe("端末と DB の参考書", () => {
  it("updatedAt が新しい方を採用する", () => {
    const older = { ...book(), updatedAt: NOW };
    const newer = { ...book(), updatedAt: LATER };
    expect(pickNewerReferenceBook(older, newer)).toBe(newer);
    expect(pickNewerReferenceBook(newer, older)).toBe(newer);
    expect(pickNewerReferenceBook(null, older)).toBe(older);
    expect(pickNewerReferenceBook(older, null)).toBe(older);
  });
});

describe("プリセットの旧トピック id", () => {
  it("改名済みの旧 id は現行トピックとして照合される", () => {
    const kitami = referenceBookFromPreset("gihyo-kitami-itpass-r08");
    // プリセットには旧 id "tech-network-lan-wan" で入っている
    const loc = findReferenceLocation(kitami, "tech-lan-wan");
    expect(loc?.section?.id).toBe("kitami-r08-ch06-s01");
  });

  it("読み替え先はすべて実在するトピックで、プリセットの未解決 id は曖昧な strat-dx だけ", () => {
    const ids = new Set(getAllTopics().map((t) => t.id));
    for (const to of Object.values(LEGACY_TOPIC_ID_ALIASES)) expect(ids.has(to)).toBe(true);

    const unresolved = new Set<string>();
    for (const summary of listReferenceBookPresets()) {
      const b = referenceBookFromPreset(summary.id)!;
      for (const c of b.chapters) {
        for (const id of [...(c.topicIds ?? []), ...(c.sections ?? []).flatMap((s) => s.topicIds ?? [])]) {
          if (!ids.has(canonicalTopicId(id))) unresolved.add(id);
        }
      }
    }
    expect([...unresolved]).toEqual(["strat-dx"]);
  });
});
