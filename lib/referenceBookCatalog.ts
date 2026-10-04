import type { ReferenceBook, ReferenceChapter } from "@/types/referenceBook";
import { canonicalTopicId, createEmptyReferenceBook, genRefId } from "@/lib/referenceBook";
import { getAllTopics } from "@/lib/content";
import { stableHash } from "@/lib/stableHash";

// ============================================================================
// 目次の共有カタログ（純粋関数）。
//
// ユーザーが目次の読み取りで登録した章立てを、他のユーザーが同じ本を登録するときに使えるようにする。
// 共有するのは「本の目次そのもの」だけ: 章・節の名前・キーワード・トピックの紐づけ。
// メモ・読了状況・計画・誰が登録したかは共有しない（sanitizeCatalogChapters で必ず落とす）。
// ============================================================================

const MAX_CHAPTERS = 60;
const MAX_SECTIONS = 60;
const MAX_TITLE = 120;
const MAX_KEYWORDS = 20;
const MAX_TOPICS = 12;
const MAX_META = 100;

/** カタログに保存する章（共有してよい項目だけ）。 */
export type CatalogChapter = {
  title: string;
  keywords: string[];
  topicIds: string[];
  sections: { title: string; keywords: string[]; topicIds: string[] }[];
};

export type CatalogEntry = {
  id: string;
  title: string;
  publisher: string | null;
  edition: string | null;
  chapters: CatalogChapter[];
  chapterCount: number;
  sectionCount: number;
};

export type CatalogStatus = "pending" | "approved" | "hidden";

/** 他のユーザーに見せる最低限の独立提出数（運営の承認が無い場合）。 */
export const CATALOG_AUTO_PUBLISH_SUBMITTERS = 2;

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function cleanList(value: unknown, max: number, itemMax: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const text = cleanText(item, itemMax);
    if (text && !out.includes(text)) out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

function cleanTopicIds(value: unknown, known: Set<string>): string[] {
  return cleanList(value, MAX_TOPICS * 2, 80)
    .map(canonicalTopicId)
    .filter((id, index, all) => known.has(id) && all.indexOf(id) === index)
    .slice(0, MAX_TOPICS);
}

/**
 * 章立てから共有してよい項目だけを取り出す。名前の無い章・節は落とす。
 * メモ・読了（done/completedAt/startedAt）・id は含めない。実在しないトピック id も落とす。
 */
export function sanitizeCatalogChapters(chapters: unknown): CatalogChapter[] {
  if (!Array.isArray(chapters)) return [];
  const known = new Set(getAllTopics().map((t) => t.id));
  const out: CatalogChapter[] = [];
  for (const raw of chapters.slice(0, MAX_CHAPTERS)) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as Record<string, unknown>;
    const title = cleanText(c.title, MAX_TITLE);
    if (!title) continue;
    const sections = (Array.isArray(c.sections) ? c.sections : [])
      .slice(0, MAX_SECTIONS)
      .flatMap((s) => {
        if (!s || typeof s !== "object") return [];
        const r = s as Record<string, unknown>;
        const sectionTitle = cleanText(r.title, MAX_TITLE);
        if (!sectionTitle) return [];
        return [{
          title: sectionTitle,
          keywords: cleanList(r.keywords, MAX_KEYWORDS, 40),
          topicIds: cleanTopicIds(r.topicIds, known),
        }];
      });
    out.push({
      title,
      keywords: cleanList(c.keywords, MAX_KEYWORDS, 40),
      topicIds: cleanTopicIds(c.topicIds, known),
      sections,
    });
  }
  return out;
}

function normalizeForKey(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[\s・･。、,.'"’”「」『』（）()＆&〖〗【】\-－―~〜]/g, "");
}

/** 照合キー（正規化した書名＋版）。 */
export function catalogKey(title: string, edition?: string | null): string {
  return `${normalizeForKey(title)}|${normalizeForKey(edition ?? "")}`.slice(0, 200);
}

/** 章立ての指紋（章・節の名前と紐づけ）。同じ目次の提出を1行にまとめる。 */
export function catalogStructureHash(chapters: CatalogChapter[]): string {
  return stableHash(
    JSON.stringify(
      chapters.map((c) => [
        normalizeForKey(c.title),
        [...c.topicIds].sort(),
        c.sections.map((s) => [normalizeForKey(s.title), [...s.topicIds].sort()]),
      ]),
    ),
  );
}

/** 他のユーザーに見せてよいか（運営の承認、または別々の2人以上から同じ構造の提出）。 */
export function isCatalogVisible(row: { status: CatalogStatus; submit_count: number }): boolean {
  if (row.status === "hidden") return false;
  return row.status === "approved" || row.submit_count >= CATALOG_AUTO_PUBLISH_SUBMITTERS;
}

/** 提出のメタ情報（書名・出版社・版）を整える。書名が無ければ null。 */
export function sanitizeCatalogMeta(input: { title?: unknown; publisher?: unknown; edition?: unknown }): {
  title: string;
  publisher: string | null;
  edition: string | null;
} | null {
  const title = cleanText(input.title, 200);
  if (!title) return null;
  return {
    title,
    publisher: cleanText(input.publisher, MAX_META) || null,
    edition: cleanText(input.edition, MAX_META) || null,
  };
}

export function countCatalogSections(chapters: CatalogChapter[]): number {
  return chapters.reduce((sum, c) => sum + c.sections.length, 0);
}

/** カタログの目次から自分用の本を作る（コピー。以後の編集は自分の本だけに反映）。 */
export function referenceBookFromCatalog(entry: CatalogEntry): ReferenceBook {
  const chapters: ReferenceChapter[] = entry.chapters.map((c) => ({
    id: genRefId("ch"),
    title: c.title,
    note: "",
    keywords: [...c.keywords],
    topicIds: [...c.topicIds],
    done: false,
    sections: c.sections.map((s) => ({
      id: genRefId("sec"),
      title: s.title,
      keywords: [...s.keywords],
      topicIds: [...s.topicIds],
    })),
  }));
  return {
    ...createEmptyReferenceBook(),
    source: { kind: "catalog", id: entry.id },
    title: entry.title,
    publisher: entry.publisher ?? "",
    edition: entry.edition ?? "",
    chapters,
  };
}
