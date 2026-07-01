import type { ReferenceBook } from "@/types/referenceBook";
import { normalizeReferenceBook } from "@/lib/referenceBook";
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
