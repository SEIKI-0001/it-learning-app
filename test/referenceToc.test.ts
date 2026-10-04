import { describe, expect, it } from "vitest";
import { getAllTopics } from "@/lib/content";
import { switchReferenceBook } from "@/lib/referenceBook";
import { referenceBookFromChoice } from "@/lib/referenceBookPresets";
import {
  chaptersFromToc,
  cleanTocTitle,
  normalizeTocExtraction,
  tocCounts,
} from "@/lib/referenceToc";

// 目次のスクショ読み取り: AI の出力を整える層と、読み取った章立てを参考書へ登録する経路。

const validIds = new Set(getAllTopics().map((t) => t.id));
const someTopicId = getAllTopics()[0].id;

describe("cleanTocTitle", () => {
  it("末尾のページ番号と点線リーダーを落とす", () => {
    expect(cleanTocTitle("第1章 企業活動 ……………… 12")).toBe("第1章 企業活動");
    expect(cleanTocTitle("1-2 経営組織  34")).toBe("1-2 経営組織");
    expect(cleanTocTitle("1-1 財務諸表 p.56")).toBe("1-1 財務諸表");
  });

  it("番号だけの見出しや番号を含む見出しは残す", () => {
    expect(cleanTocTitle("1-2")).toBe("1-2");
    expect(cleanTocTitle("2進数と16進数")).toBe("2進数と16進数");
  });

  it("文字列以外は空", () => {
    expect(cleanTocTitle(undefined)).toBe("");
    expect(cleanTocTitle(3)).toBe("");
  });
});

describe("normalizeTocExtraction", () => {
  it("章・節を整え、実在しないトピック id と空の見出しを落とす", () => {
    const toc = normalizeTocExtraction(
      {
        bookTitle: " かんたん合格 ITパスポート ",
        chapters: [
          {
            title: "第1章 企業と法務 …… 10",
            topicIds: ["no-such-topic"],
            sections: [
              { title: "1-1 企業活動", topicIds: [someTopicId, someTopicId, "bogus"] },
              { title: "  " },
              "broken",
            ],
          },
          { title: "" },
          null,
        ],
      },
      validIds,
    );
    expect(toc.bookTitle).toBe("かんたん合格 ITパスポート");
    expect(toc.chapters).toEqual([
      {
        title: "第1章 企業と法務",
        topicIds: [],
        sections: [{ title: "1-1 企業活動", topicIds: [someTopicId] }],
      },
    ]);
    expect(tocCounts(toc)).toEqual({ chapters: 1, sections: 1, linked: 1 });
  });

  it("形が崩れた出力でも投げずに空を返す", () => {
    expect(normalizeTocExtraction(null, validIds)).toEqual({ chapters: [] });
    expect(normalizeTocExtraction({ chapters: "x" }, validIds)).toEqual({ chapters: [] });
  });

  it("章数を上限で切る", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ title: `第${i + 1}章` }));
    expect(normalizeTocExtraction({ chapters: many }, validIds).chapters).toHaveLength(40);
  });
});

describe("読み取った章立ての登録", () => {
  const toc = normalizeTocExtraction(
    {
      chapters: [
        { title: "第1章 A", sections: [{ title: "1-1 a", topicIds: [someTopicId] }] },
        { title: "第2章 B" },
      ],
    },
    validIds,
  );

  it("chaptersFromToc は未読の章・節を作り、紐づけを引き継ぐ", () => {
    const chapters = chaptersFromToc(toc);
    expect(chapters.map((c) => c.title)).toEqual(["第1章 A", "第2章 B"]);
    expect(chapters[0].done).toBe(false);
    expect(chapters[0].sections?.[0]).toMatchObject({ title: "1-1 a", topicIds: [someTopicId] });
    expect(chapters[0].sections?.[0].done).toBeUndefined();
    expect(new Set(chapters.map((c) => c.id)).size).toBe(2);
  });

  it("「その他」の選択に章立てがあれば、それごと参考書になる", () => {
    const book = referenceBookFromChoice({
      kind: "other",
      title: "マイ参考書",
      chapters: chaptersFromToc(toc),
    });
    expect(book?.title).toBe("マイ参考書");
    expect(book?.chapters).toHaveLength(2);
  });

  it("章立ての無い使用中の本を選び直すと、読み取った章立てが入る", () => {
    const current = referenceBookFromChoice({ kind: "other", title: "マイ参考書" })!;
    const next = referenceBookFromChoice({
      kind: "other",
      title: "マイ参考書",
      chapters: chaptersFromToc(toc),
    })!;
    expect(switchReferenceBook(current, next, { keepHistory: true }).chapters).toHaveLength(2);
  });

  it("章立てのある使用中の本は、選び直しても今の章立てを保つ", () => {
    const current = referenceBookFromChoice({
      kind: "other",
      title: "マイ参考書",
      chapters: chaptersFromToc(toc),
    })!;
    const next = referenceBookFromChoice({
      kind: "other",
      title: "マイ参考書",
      chapters: chaptersFromToc({ chapters: [{ title: "別", topicIds: [], sections: [] }] }),
    })!;
    expect(switchReferenceBook(current, next, { keepHistory: true }).chapters).toBe(
      current.chapters,
    );
  });
});
