import type { ReferenceBook } from "@/types/referenceBook";
import { createEmptyReferenceBook, normalizeReferenceBook } from "@/lib/referenceBook";
import presetData from "@/itpass_reference_book.json";

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
    active: true,
    updatedAt: new Date().toISOString(),
  });
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
  };
}

/** 参考書の選び方（オンボーディング・設定画面で共通）。 */
export type ReferenceBookChoice =
  | { kind: "preset"; presetId: string }
  | { kind: "other"; title: string }
  | { kind: "later" };

/**
 * 選択から保存する参考書を作る。「あとで」や空欄の「その他」は null（保存しない）。
 * 「その他」は書名だけ登録し、章立ては設定画面で登録してもらう
 * （未登録のあいだは Topic.referenceHints のキーワード案内で学習できる）。
 */
export function referenceBookFromChoice(
  choice: ReferenceBookChoice,
): ReferenceBook | null {
  if (choice.kind === "preset") return referenceBookFromPreset(choice.presetId);
  if (choice.kind === "other") {
    const title = choice.title.trim();
    if (!title) return null;
    return { ...createEmptyReferenceBook(), title };
  }
  return null;
}

/**
 * プリセットから作った参考書に、プリセット側で増えたトピックの紐づけと節を取り込む。
 * 登録済みユーザーの本は登録時点のコピーなので、プリセットの紐づけを拡充しても
 * そのままでは反映されない。書名が一致するプリセットの章・節 id を手がかりに、
 *   - 既存の章・節には topicIds を足す（ユーザーが付けた紐づけは消さない）
 *   - プリセットにあって手元に無い節は、その章の末尾に足す（未読として）
 * 読了状態・タイトル・並び順などユーザーの編集には触れない。変化が無ければ同じ参照を返す。
 */
export function refreshPresetMappings(book: ReferenceBook): ReferenceBook {
  const entry = presets.find((p) => p.book.title === book.title);
  if (!entry) return book;
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
