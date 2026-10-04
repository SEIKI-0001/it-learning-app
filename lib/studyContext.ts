import type { Topic } from "@/types/content";
import type { ReferenceBook } from "@/types/referenceBook";
import { buildBookStudyOrder, type BookStudyOrder } from "@/lib/bookStudyOrder";
import { assessBookQuality, type BookQuality } from "@/lib/bookQuality";
import { hasUsableReferenceBook, referenceBookTitleKey } from "@/lib/referenceBook";
import { stableHash } from "@/lib/stableHash";

// ============================================================================
// 学習コンテキスト = 「いま新規学習の順番を何で決めるか」の唯一の判定（純粋関数）。
//
// Today / 週の計画 / チェックポイント / LINE / 週報 / 計画画面は、それぞれで参考書の
// 有無を判定せず、必ずこの effectiveMode を見る。機能ごとにモードがずれないようにするため。
//
//   preference   … ユーザーの希望（設定）。未設定(null)は従来どおりアプリ順
//   effectiveMode … 実際に使うモード。希望が book でも、機能フラグ・本の有無・品質で app になる
// ============================================================================

export type StudyOrderPreference = "app" | "book";
export type StudyMode = "app" | "book";

/** 参考書順の機能フラグ。off は全員アプリ順（即時ロールバック用）。 */
export type BookOrderFlag = "off" | "optin";

export type StudyContextReason =
  | "flag_off"
  | "not_opted_in"
  | "no_book"
  | "quality_insufficient"
  | "ok";

export type StudyContext = {
  preference: StudyOrderPreference | null;
  effectiveMode: StudyMode;
  reason: StudyContextReason;
  /** 本の identity（effectiveMode に関係なく、使える本があれば入る） */
  bookId?: string;
  /** 本の順序（使える本があれば入る。app でも診断・プレビューに使う） */
  order?: BookStudyOrder;
  quality?: BookQuality;
  /** 計画に依存する保存物（固定ルート・週計画・今日のタスク）が同じ前提で作られたかの鍵 */
  planningKey: string;
};

export type ResolveStudyContextInput = {
  preference: StudyOrderPreference | null | undefined;
  book: ReferenceBook | null | undefined;
  topics: Topic[];
  flag: BookOrderFlag;
  examDate?: string;
  weekdayMinutes?: number;
  holidayMinutes?: number;
  /** 保存済みの参考書計画の改訂番号（予定日の引き直しで変わる） */
  studyPlanRevision?: number;
};

export function parseBookOrderFlag(value: string | undefined | null): BookOrderFlag {
  return value?.trim() === "optin" ? "optin" : "off";
}

/** 本の identity。永続 id があればそれ、無い旧データは正規化した書名＋版。 */
export function referenceBookIdentity(book: ReferenceBook): string {
  const id = (book as ReferenceBook & { id?: string }).id;
  if (id) return id;
  return `title:${referenceBookTitleKey(book)}|${(book.edition ?? "").trim()}`;
}

export function resolveStudyContext(input: ResolveStudyContextInput): StudyContext {
  const preference = input.preference ?? null;
  const book = input.book ?? null;
  const usable = hasUsableReferenceBook(book);
  const order = usable ? buildBookStudyOrder(book, input.topics) ?? undefined : undefined;
  const quality = usable ? assessBookQuality(order ?? null, input.topics) : undefined;
  const bookId = usable && book ? referenceBookIdentity(book) : undefined;

  let reason: StudyContextReason;
  if (input.flag === "off") reason = "flag_off";
  else if (preference !== "book") reason = "not_opted_in";
  else if (!usable || !order) reason = "no_book";
  else if (!quality?.eligible) reason = "quality_insufficient";
  else reason = "ok";
  const effectiveMode: StudyMode = reason === "ok" ? "book" : "app";

  const catalogKey = stableHash(input.topics.map((topic) => topic.id).join(","));
  const keyParts =
    effectiveMode === "book"
      ? [
          "book",
          bookId,
          order?.structureHash,
          String(input.studyPlanRevision ?? 0),
        ]
      : ["app"];
  keyParts.push(
    input.examDate ?? "",
    String(input.weekdayMinutes ?? ""),
    String(input.holidayMinutes ?? ""),
    catalogKey,
  );

  return {
    preference,
    effectiveMode,
    reason,
    ...(bookId ? { bookId } : {}),
    ...(order ? { order } : {}),
    ...(quality ? { quality } : {}),
    planningKey: stableHash(keyParts.join("|")),
  };
}

/** Book mode のときだけ順序を返す（呼び出し側の分岐を1か所にするため）。 */
export function effectiveBookOrder(context: StudyContext | null | undefined): BookStudyOrder | null {
  return context?.effectiveMode === "book" ? context.order ?? null : null;
}
