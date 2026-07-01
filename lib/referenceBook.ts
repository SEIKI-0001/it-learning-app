import type {
  ReferenceBook,
  ReferenceBookProgress,
  ReferenceChapter,
  ReferenceLocation,
  ReferenceSection,
} from "@/types/referenceBook";

// ============================================================================
// 参考書アウトラインの localStorage 操作・目次パース・トピック紐づけ検索。
// ここは純粋関数＋localStorage 隠蔽レイヤー。UI からはここ経由で参照する。
// ログイン時の DB 同期は lib/referenceBookSync.ts（クライアント fetch）が担う。
// ============================================================================

const STORAGE_KEY = "fequest:referenceBook";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** ゆるいユニークID（章・節用）。 */
export function genRefId(prefix = "ch"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/** 空の参考書アウトラインを作る。 */
export function createEmptyReferenceBook(): ReferenceBook {
  return {
    title: "",
    publisher: "",
    edition: "",
    active: true,
    note: "",
    chapters: [],
    updatedAt: new Date().toISOString(),
  };
}

/** localStorage から参考書を読み込む（無ければ null）。 */
export function loadReferenceBook(): ReferenceBook | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeReferenceBook(JSON.parse(raw) as ReferenceBook);
  } catch {
    return null;
  }
}

/** 欠けたフィールドを補完する（後方互換）。 */
export function normalizeReferenceBook(book: ReferenceBook): ReferenceBook {
  return {
    title: book.title ?? "",
    publisher: book.publisher ?? "",
    edition: book.edition ?? "",
    active: book.active ?? true,
    note: book.note ?? "",
    chapters: (book.chapters ?? []).map((ch) => ({
      id: ch.id || genRefId("ch"),
      title: ch.title ?? "",
      note: ch.note ?? "",
      keywords: ch.keywords ?? [],
      topicIds: ch.topicIds ?? [],
      done: ch.done ?? false,
      sections: (ch.sections ?? []).map((s) => ({
        id: s.id || genRefId("sec"),
        title: s.title ?? "",
        keywords: s.keywords ?? [],
        topicIds: s.topicIds ?? [],
      })),
    })),
    updatedAt: book.updatedAt ?? new Date().toISOString(),
  };
}

/** localStorage へ保存する。 */
export function saveReferenceBook(book: ReferenceBook): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...book, updatedAt: new Date().toISOString() }),
    );
  } catch {
    /* ignore */
  }
}

/** 参考書設定を削除する。 */
export function clearReferenceBook(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// 目次テキストのパース
// ---------------------------------------------------------------------------

const CHAPTER_KANJI = /^第\s*([0-9０-９一二三四五六七八九十百]+)\s*章[\s:：.．、]*(.*)$/;
const CHAPTER_NUM_KANJI = /^([0-9０-９]+)\s*章[\s:：.．、]*(.*)$/;
const CHAPTER_EN = /^chapter\s*([0-9]+)[\s:：.．、]*(.*)$/i;
// トップレベルの「1 概要」「1. 概要」「1章」など（節の "1.1" とは別に扱う）
const CHAPTER_TOPLEVEL = /^([0-9]+)[.．]?\s+(\S.*)$/;

const SECTION_KANJI = /^第\s*([0-9０-９一二三四五六七八九十]+)\s*節[\s:：.．、]*(.*)$/;
const SECTION_DOTTED = /^([0-9]+)[.\-－―]([0-9]+)(?:[.\-－―]?[0-9]*)[\s:：.．、]*(.*)$/;

/**
 * 目次テキストを章構成に変換する（簡易）。
 * 検出: 第○章 / ○章 / Chapter○ / CHAPTER○ / 1.1 / 1-1 / 第○節。
 * 完璧な変換は狙わず、生成後にユーザーが編集する前提。
 */
export function parseTableOfContents(text: string): ReferenceChapter[] {
  const chapters: ReferenceChapter[] = [];
  let current: ReferenceChapter | null = null;

  const pushChapter = (title: string) => {
    current = {
      id: genRefId("ch"),
      title: title.trim(),
      keywords: [],
      topicIds: [],
      done: false,
      sections: [],
    };
    chapters.push(current);
  };

  const pushSection = (title: string) => {
    if (!current) {
      // 章が未検出のまま節が来たら、器の章を1つ作る。
      pushChapter("第1章");
    }
    current!.sections!.push({
      id: genRefId("sec"),
      title: title.trim(),
      keywords: [],
      topicIds: [],
    });
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // --- 節（先に判定: "1.1" "1-1" が章の数字判定に食われないように）---
    let m = line.match(SECTION_KANJI);
    if (m) {
      pushSection(joinTitle(`第${m[1]}節`, m[2]));
      continue;
    }
    m = line.match(SECTION_DOTTED);
    if (m) {
      const marker = `${m[1]}.${m[2]}`;
      pushSection(joinTitle(marker, m[3]));
      continue;
    }

    // --- 章 ---
    m = line.match(CHAPTER_KANJI);
    if (m) {
      pushChapter(joinTitle(`第${m[1]}章`, m[2]));
      continue;
    }
    m = line.match(CHAPTER_NUM_KANJI);
    if (m) {
      pushChapter(joinTitle(`${m[1]}章`, m[2]));
      continue;
    }
    m = line.match(CHAPTER_EN);
    if (m) {
      pushChapter(joinTitle(`Chapter ${m[1]}`, m[2]));
      continue;
    }
    m = line.match(CHAPTER_TOPLEVEL);
    if (m) {
      pushChapter(joinTitle(`${m[1]}.`, m[2]));
      continue;
    }

    // --- どのパターンにも当てはまらない行は、直前の章の節として拾う ---
    if (current) {
      pushSection(line);
    } else {
      pushChapter(line);
    }
  }

  return chapters;
}

function joinTitle(marker: string, rest: string): string {
  const r = (rest ?? "").trim();
  return r ? `${marker} ${r}` : marker;
}

// ---------------------------------------------------------------------------
// トピック紐づけ検索・進捗
// ---------------------------------------------------------------------------

/**
 * トピック id に紐づく参考書の場所（章・節）を探す。
 * 節→章の順で topicIds を照合し、最初に見つかった場所を返す。無ければ null。
 */
export function findReferenceLocation(
  book: ReferenceBook | null,
  topicId: string,
): ReferenceLocation | null {
  if (!book) return null;
  for (const chapter of book.chapters) {
    for (const section of chapter.sections ?? []) {
      if ((section.topicIds ?? []).includes(topicId)) {
        return { chapter, section };
      }
    }
  }
  for (const chapter of book.chapters) {
    if ((chapter.topicIds ?? []).includes(topicId)) {
      return { chapter };
    }
  }
  return null;
}

/** 参考書1周の進捗（読み終えた章の割合）。章が無ければ null。 */
export function referenceBookProgress(
  book: ReferenceBook | null,
): ReferenceBookProgress | null {
  if (!book || book.chapters.length === 0) return null;
  const total = book.chapters.length;
  const done = book.chapters.filter((c) => c.done).length;
  return { done, total, ratio: total > 0 ? done / total : 0 };
}

/** その参考書が「使用中」で章を持っているか。 */
export function hasUsableReferenceBook(book: ReferenceBook | null): boolean {
  return Boolean(book && book.active && book.chapters.length > 0);
}

/** 章に紐づくトピック id をすべて集める（章直下＋節）。 */
export function chapterTopicIds(chapter: ReferenceChapter): string[] {
  const ids = new Set<string>(chapter.topicIds ?? []);
  for (const s of chapter.sections ?? []) {
    for (const id of s.topicIds ?? []) ids.add(id);
  }
  return Array.from(ids);
}

export type { ReferenceSection };
