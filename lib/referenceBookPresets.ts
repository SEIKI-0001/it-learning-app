import type { ReferenceBook, ReferenceChapter } from "@/types/referenceBook";
import { referenceBookFromCatalog, type CatalogEntry } from "@/lib/referenceBookCatalog";
import {
  createEmptyReferenceBook,
  genReferenceBookId,
  normalizeReferenceBook,
} from "@/lib/referenceBook";
import presetData from "@/itpass_reference_book.json" with { type: "json" };

// ============================================================================
// 参考書プリセット（itpass_reference_book.json）の読み込みとマッチング。
//
// Webで確認できた公式目次をもとにした初期テンプレート集。参考書名などから該当する
// プリセットを見つけ、その章構成を「編集可能なたたき台」として反映する。
// 反映後はユーザーが自由に編集できる（parseTableOfContents / 手動編集と同じデータ）。
//   - presetIsEditableTemplate: 反映後はユーザーのものとして編集される
//   - doNotOverwriteUserEditedBook: 既存の章があるときは呼び出し側で確認する
// マッチしない参考書は従来どおり目次貼り付け・手動編集・referenceHints で対応する。
// ============================================================================

/** 参考書の種類。教科書 / ドリル / 問題集。 */
export type PresetBookType = "textbook" | "workbook" | "question_bank";

type PresetEntry = {
  id: string;
  matchKeywords?: string[];
  bookType?: PresetBookType;
  /** 章立ての版。上がったら登録済みの本を upgradePresetBook で新しい章立てへ移行する */
  structureVersion?: number;
  book: ReferenceBook;
};

type PresetFile = {
  presets: PresetEntry[];
};

const presets = (presetData as unknown as PresetFile).presets ?? [];

/** 一覧表示用のプリセット要約。 */
export type ReferenceBookPresetSummary = {
  id: string;
  title: string;
  publisher?: string;
  edition?: string;
  bookType: PresetBookType;
  chapterCount: number;
  /** 節の数（0なら章だけの本＝章ごとに進む） */
  sectionCount: number;
};

const BOOK_TYPE_ORDER: PresetBookType[] = [
  "textbook",
  "workbook",
  "question_bank",
];

export const BOOK_TYPE_LABELS: Record<PresetBookType, string> = {
  textbook: "教科書",
  workbook: "ドリル",
  question_bank: "問題集・過去問",
};

/** 登録済みプリセットの一覧（種類→掲載順）。 */
export function listReferenceBookPresets(): ReferenceBookPresetSummary[] {
  return presets
    .map((p) => ({
      id: p.id,
      title: p.book.title,
      publisher: p.book.publisher,
      edition: p.book.edition,
      bookType: p.bookType ?? "textbook",
      chapterCount: p.book.chapters?.length ?? 0,
      sectionCount: countSections(p.book.chapters),
    }))
    .sort(
      (a, b) =>
        BOOK_TYPE_ORDER.indexOf(a.bookType) -
        BOOK_TYPE_ORDER.indexOf(b.bookType),
    );
}

/**
 * プリセット id から参考書アウトラインを作る（正規化済み・active=true）。
 * 返すのはコピーなので、呼び出し側で自由に編集してよい。無ければ null。
 */
export function referenceBookFromPreset(id: string): ReferenceBook | null {
  const entry = presets.find((p) => p.id === id);
  if (!entry) return null;
  // JSON の参照をそのまま返さないよう deep copy してから正規化する。
  const copy = JSON.parse(JSON.stringify(entry.book)) as ReferenceBook;
  return normalizeReferenceBook({
    ...copy,
    id: genReferenceBookId(),
    source: { kind: "preset", id: entry.id, version: entry.structureVersion ?? 1 },
    active: true,
    updatedAt: new Date().toISOString(),
  });
}

function countSections(chapters: ReferenceChapter[] | undefined): number {
  return (chapters ?? []).reduce((sum, c) => sum + (c.sections?.length ?? 0), 0);
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s　・･。、,.'"’”「」『』（）()＆&〖〗\-－―~〜]/g, "");
}

/**
 * 参考書名・出版社・版のテキストから、該当するプリセットを推測する。
 * matchKeywords / タイトルの部分一致で最もそれらしいものを1件返す。無ければ null。
 * 「登録時に該当参考書があれば章構成を自動反映」のための入口。
 */
export function suggestPresetForText(
  query: string,
): ReferenceBookPresetSummary | null {
  const q = normalizeForMatch(query);
  if (q.length < 2) return null;

  let best: { entry: PresetEntry; score: number } | null = null;
  for (const entry of presets) {
    let score = 0;
    for (const kw of entry.matchKeywords ?? []) {
      const nk = normalizeForMatch(kw);
      if (nk && q.includes(nk)) score += Math.max(1, nk.length);
    }
    // タイトルそのものが含まれていれば強く加点。
    const nt = normalizeForMatch(entry.book.title);
    if (nt && (q.includes(nt) || nt.includes(q))) score += 3;
    if (score > 0 && (!best || score > best.score)) {
      best = { entry, score };
    }
  }
  if (!best) return null;
  const e = best.entry;
  return {
    id: e.id,
    title: e.book.title,
    publisher: e.book.publisher,
    edition: e.book.edition,
    bookType: e.bookType ?? "textbook",
    chapterCount: e.book.chapters?.length ?? 0,
    sectionCount: countSections(e.book.chapters),
  };
}

/** 参考書の選び方（オンボーディング・設定画面で共通）。 */
export type ReferenceBookChoice =
  | { kind: "preset"; presetId: string }
  // chapters: 目次のスクショから読み取った章立て（読み取っていなければ省略）
  | { kind: "other"; title: string; chapters?: ReferenceChapter[] }
  // ほかの利用者が目次の読み取りで登録した章立て（共有カタログ）を使う
  | { kind: "catalog"; entry: CatalogEntry }
  | { kind: "later" };

/**
 * 選択から保存する参考書を作る。「あとで」や空欄の「その他」は null（保存しない）。
 * 「その他」は書名と、目次のスクショから読み取った章立て（あれば）を登録する。
 * 章立てが無ければ設定画面で登録してもらう（未登録のあいだは Topic.referenceHints のキーワード案内で学習できる）。
 */
export function referenceBookFromChoice(
  choice: ReferenceBookChoice,
): ReferenceBook | null {
  if (choice.kind === "preset") return referenceBookFromPreset(choice.presetId);
  if (choice.kind === "catalog") return referenceBookFromCatalog(choice.entry);
  if (choice.kind === "other") {
    const title = choice.title.trim();
    if (!title) return null;
    return { ...createEmptyReferenceBook(), title, chapters: choice.chapters ?? [] };
  }
  return null;
}

/**
 * プリセットから作った参考書に、プリセット側で増えたトピックの紐づけと節を取り込む。
 * 登録済みユーザーの本は登録時点のコピーなので、プリセットの紐づけを拡充しても
 * そのままでは反映されない。作成元（source）か書名が一致するプリセットの章・節 id を手がかりに、
 *   - 既存の章・節には topicIds を足す（ユーザーが付けた紐づけは消さない）
 *   - プリセットにあって手元に無い節は、その章の末尾に足す（未読として）
 * 読了状態・タイトル・並び順などユーザーの編集には触れない。変化が無ければ同じ参照を返す。
 */
export function refreshPresetMappings(book: ReferenceBook): ReferenceBook {
  const entry = presetForBook(book);
  if (!entry) return book;
  // 章立ての版が違う本には足さない（旧い章立てに新しい節が混ざらないように）。移行は upgradePresetBook。
  if (bookStructureVersion(book) !== (entry.structureVersion ?? 1)) return book;
  let changed = false;
  const merge = (current: string[] | undefined, extra: string[] | undefined) => {
    const base = current ?? [];
    const add = (extra ?? []).filter((id) => !base.includes(id));
    if (add.length === 0) return base;
    changed = true;
    return [...base, ...add];
  };

  const chapters = book.chapters.map((chapter) => {
    const presetChapter = entry.book.chapters.find((c) => c.id === chapter.id);
    if (!presetChapter) return chapter;
    const sections = (chapter.sections ?? []).map((section) => {
      const presetSection = presetChapter.sections?.find((s) => s.id === section.id);
      if (!presetSection) return section;
      const topicIds = merge(section.topicIds, presetSection.topicIds);
      return topicIds === section.topicIds ? section : { ...section, topicIds };
    });
    for (const presetSection of presetChapter.sections ?? []) {
      if (sections.some((s) => s.id === presetSection.id)) continue;
      changed = true;
      sections.push({
        id: presetSection.id,
        title: presetSection.title,
        keywords: [...(presetSection.keywords ?? [])],
        topicIds: [...(presetSection.topicIds ?? [])],
      });
    }
    return {
      ...chapter,
      topicIds: merge(chapter.topicIds, presetChapter.topicIds),
      sections,
    };
  });

  return changed ? { ...book, chapters } : book;
}

// ---------------------------------------------------------------------------
// プリセットの章立ての版の移行・本の種類
// ---------------------------------------------------------------------------

/** 作成元のプリセット（source が分かればそれ、旧データは書名の完全一致）。 */
function presetForBook(book: Pick<ReferenceBook, "source" | "title">): PresetEntry | undefined {
  if (book.source?.kind === "catalog") return undefined;
  return book.source?.kind === "preset"
    ? presets.find((p) => p.id === book.source?.id)
    : presets.find((p) => p.book.title === book.title);
}

function bookStructureVersion(book: ReferenceBook): number {
  return book.source?.kind === "preset" ? book.source.version ?? 1 : 1;
}

/**
 * 本の種類。プリセットから作った本はそのプリセットの種類、それ以外（目次の読み取り・手入力・
 * 共有カタログ）は教科書として扱う。参考書順（新規学習の順番の背骨）に使えるのは教科書だけ。
 */
export function referenceBookType(book: Pick<ReferenceBook, "source" | "title"> | null): PresetBookType {
  if (!book) return "textbook";
  return presetForBook(book)?.bookType ?? "textbook";
}

function coreTitle(title: string): string {
  return title
    .normalize("NFKC")
    .replace(/^(第\s*\d+\s*章|chapter\s*\d+|\d+\s*章)/i, "")
    .replace(/[\s［］\[\]()（）]/g, "")
    .toLowerCase();
}

/**
 * プリセットから作った本を、プリセットの新しい章立て（structureVersion）へ移行する。
 *   - 章・節はプリセットの新しい章立てに置き換える（アプリ向けにまとめた旧い節は残さない）
 *   - 読了は次の範囲で引き継ぐ:
 *       ・旧い本で読了だった節・章に入っていたトピックをすべて含む新しい節は読了
 *       ・同じ章（章名が同じ）が旧い本で読了だった場合、その章の新しい節はすべて読了
 *       ・読み始め（startedAt）は、旧い本で読み始めた節のトピックを含む節に付ける
 *     学習の実績（Topic の完了）は本とは別に保存されているので失われない
 *   - 章・節を自分で追加・編集した本（プリセット由来でない id を含む）は作り直さない
 *   - 本の id・書名・メモ・使用中かどうかは保つ。参考書計画は構造の変化として自動で引き直される
 * 変化が無ければ同じ参照を返す。
 */
export function upgradePresetBook(book: ReferenceBook, now: string = new Date().toISOString()): ReferenceBook {
  const entry = presetForBook(book);
  if (!entry) return book;
  const target = entry.structureVersion ?? 1;
  const current = bookStructureVersion(book);
  if (current >= target) return refreshPresetMappings(book);

  const prefix = entry.book.chapters[0]?.id.replace(/-c\d+$/, "") ?? "";
  const customized = book.chapters.some(
    (c) => !c.id.startsWith(`${prefix}-`) || (c.sections ?? []).some((s) => !s.id.startsWith(`${prefix}-`)),
  );
  const source = { kind: "preset" as const, id: entry.id, version: target };
  if (customized) {
    // 自分で編集した本は章立てを変えない（新しい章立てへは設定画面で選び直してもらう）。
    return { ...book, source };
  }

  const read = new Set<string>();
  const started = new Map<string, string>();
  const readChapterTitles = new Set<string>();
  const completedAtOf = new Map<string, string>();
  for (const chapter of book.chapters) {
    const sections = chapter.sections ?? [];
    const chapterRead = chapter.done === true || (sections.length > 0 && sections.every((s) => s.done === true));
    if (chapterRead) readChapterTitles.add(coreTitle(chapter.title));
    const chapterTopics = [...(chapter.topicIds ?? []), ...sections.flatMap((s) => s.topicIds ?? [])];
    if (chapterRead) for (const id of chapterTopics) {
      read.add(id);
      if (chapter.completedAt) completedAtOf.set(id, chapter.completedAt);
    }
    for (const section of sections) {
      if (section.done || chapter.done) for (const id of section.topicIds ?? []) {
        read.add(id);
        const at = section.completedAt ?? chapter.completedAt;
        if (at) completedAtOf.set(id, at);
      }
      if (section.startedAt) for (const id of section.topicIds ?? []) {
        const prev = started.get(id);
        if (!prev || section.startedAt < prev) started.set(id, section.startedAt);
      }
    }
  }

  const copy = JSON.parse(JSON.stringify(entry.book.chapters)) as ReferenceChapter[];
  const chapters: ReferenceChapter[] = copy.map((chapter) => {
    const wholeChapterRead = readChapterTitles.has(coreTitle(chapter.title));
    const oldChapter = book.chapters.find((c) => coreTitle(c.title) === coreTitle(chapter.title));
    const sections = (chapter.sections ?? []).map((section) => {
      const ids = section.topicIds ?? [];
      const done = wholeChapterRead || (ids.length > 0 && ids.every((id) => read.has(id)));
      const startedAt = ids.map((id) => started.get(id)).filter((v): v is string => Boolean(v)).sort()[0];
      const completedAt = ids.map((id) => completedAtOf.get(id)).filter((v): v is string => Boolean(v)).sort().pop();
      return {
        ...section,
        ...(done ? { done: true, completedAt: completedAt ?? now } : {}),
        ...(startedAt ? { startedAt } : {}),
      };
    });
    const allRead = sections.length > 0 && sections.every((s) => s.done === true);
    return {
      ...chapter,
      ...(oldChapter?.note ? { note: oldChapter.note } : {}),
      done: allRead,
      ...(allRead ? { completedAt: oldChapter?.completedAt ?? now } : {}),
      sections,
    };
  });

  return normalizeReferenceBook({ ...book, source, chapters, updatedAt: now });
}
