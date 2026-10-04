import type { ReferenceChapter } from "@/types/referenceBook";
import { genRefId } from "@/lib/referenceBook";

// 目次ページのスクショ読み取り（/api/reference-book/read-toc）の共有部分。
// サーバー（AI の出力を整える）とクライアント（章構成に変換して登録する）の両方から使うので、
// ここにはサーバー専用の処理や API キーを置かない。
//
// 方針:
//   - AI の出力は信用しない。件数・文字数を丸め、ページ番号や点線リーダーを落とし、
//     トピック id は実在するものだけ残す。
//   - 読み取った章構成は「下書き」。登録後に設定画面でいつでも直せる前提。

/** 1回に送れる画像の枚数（目次が数ページにまたがる本を想定）。 */
export const TOC_MAX_IMAGES = 4;
/** 画像1枚あたりの上限（base64 文字数）。クライアントで縮小してから送るので通常は届かない。 */
export const TOC_MAX_IMAGE_BASE64 = 2_800_000;
export const TOC_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const MAX_CHAPTERS = 40;
const MAX_SECTIONS_PER_CHAPTER = 40;
const MAX_TITLE_LENGTH = 80;
const MAX_TOPICS_PER_ITEM = 6;

export type TocSection = { title: string; topicIds: string[] };
export type TocChapter = { title: string; topicIds: string[]; sections: TocSection[] };
/** 目次の読み取り結果（AI 出力を整えたもの）。 */
export type TocExtraction = {
  /** 画像から書名が読めたときだけ入る */
  bookTitle?: string;
  chapters: TocChapter[];
};

/**
 * 見出しを整える。末尾のページ番号（「……12」「 p.34」）、点線リーダー、余分な空白を落とす。
 * 章番号（「第1章」「1-2」）は残す。
 */
export function cleanTocTitle(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    // 空白か点線リーダーを挟んだ末尾の数字だけをページ番号として落とす（「1-2」は残る）
    .replace(/(?:\s*[.．・…‥]{2,}\s*|\s+)(?:p\.?\s*)?[0-9０-９]{1,4}$/i, "")
    .replace(/[.．・…‥]{2,}/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, MAX_TITLE_LENGTH);
}

function pickTopicIds(raw: unknown, validTopicIds: ReadonlySet<string>): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw.filter(
    (id): id is string => typeof id === "string" && validTopicIds.has(id),
  );
  return [...new Set(ids)].slice(0, MAX_TOPICS_PER_ITEM);
}

/**
 * AI が返した JSON を TocExtraction に整える。形が崩れていても投げず、拾えた分だけ返す。
 * 期待する形: { bookTitle?: string, chapters: [{ title, topicIds?, sections?: [{ title, topicIds? }] }] }
 */
export function normalizeTocExtraction(
  raw: unknown,
  validTopicIds: ReadonlySet<string>,
): TocExtraction {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawChapters = Array.isArray(obj.chapters) ? obj.chapters : [];

  const chapters: TocChapter[] = [];
  for (const rc of rawChapters) {
    if (chapters.length >= MAX_CHAPTERS) break;
    if (!rc || typeof rc !== "object") continue;
    const c = rc as Record<string, unknown>;
    const title = cleanTocTitle(c.title);
    if (!title) continue;
    const sections: TocSection[] = [];
    for (const rs of Array.isArray(c.sections) ? c.sections : []) {
      if (sections.length >= MAX_SECTIONS_PER_CHAPTER) break;
      if (!rs || typeof rs !== "object") continue;
      const s = rs as Record<string, unknown>;
      const sTitle = cleanTocTitle(s.title);
      if (!sTitle) continue;
      sections.push({ title: sTitle, topicIds: pickTopicIds(s.topicIds, validTopicIds) });
    }
    chapters.push({ title, topicIds: pickTopicIds(c.topicIds, validTopicIds), sections });
  }

  const bookTitle = cleanTocTitle(obj.bookTitle);
  return { ...(bookTitle ? { bookTitle } : {}), chapters };
}

/** 読み取り結果を参考書の章構成（未読の状態）に変換する。 */
export function chaptersFromToc(toc: TocExtraction): ReferenceChapter[] {
  return toc.chapters.map((c) => ({
    id: genRefId("ch"),
    title: c.title,
    keywords: [],
    topicIds: c.topicIds,
    done: false,
    sections: c.sections.map((s) => ({
      id: genRefId("sec"),
      title: s.title,
      keywords: [],
      topicIds: s.topicIds,
    })),
  }));
}

/** 件数の要約（プレビューの見出し用）。 */
export function tocCounts(toc: TocExtraction): {
  chapters: number;
  sections: number;
  linked: number;
} {
  let sections = 0;
  let linked = 0;
  for (const c of toc.chapters) {
    sections += c.sections.length;
    if (c.topicIds.length > 0) linked += 1;
    for (const s of c.sections) if (s.topicIds.length > 0) linked += 1;
  }
  return { chapters: toc.chapters.length, sections, linked };
}
