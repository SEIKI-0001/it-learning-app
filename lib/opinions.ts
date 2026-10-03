// 意見箱（「その他」ページ）の共通定義。クライアントとAPIの両方で使う。

export const OPINION_CATEGORIES = ["improvement", "mistake", "bug", "other"] as const;
export type OpinionCategory = (typeof OPINION_CATEGORIES)[number];

export const OPINION_CATEGORY_LABELS: Record<OpinionCategory, string> = {
  improvement: "改善してほしい",
  mistake: "間違いを見つけた",
  bug: "不具合・動かない",
  other: "その他",
};

export const OPINION_BODY_MAX = 2000;
export const OPINION_CONTEXT_MAX = 200;

/** 連投防止: この時間内に送れる件数の上限。 */
export const OPINION_RATE_WINDOW_MINUTES = 10;
export const OPINION_RATE_LIMIT = 5;

export type OpinionInput = {
  category: OpinionCategory;
  body: string;
  context: string | null;
};

export function isOpinionCategory(value: unknown): value is OpinionCategory {
  return typeof value === "string" && (OPINION_CATEGORIES as readonly string[]).includes(value);
}

/** リクエスト本文を検証・正規化する。不正なら理由を返す。 */
export function parseOpinionInput(
  raw: unknown,
): { ok: true; value: OpinionInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "invalid body" };
  const { category, body, context } = raw as Record<string, unknown>;

  if (!isOpinionCategory(category)) return { ok: false, error: "invalid category" };
  if (typeof body !== "string") return { ok: false, error: "body required" };
  const trimmedBody = body.trim();
  if (!trimmedBody) return { ok: false, error: "body required" };
  if (trimmedBody.length > OPINION_BODY_MAX) return { ok: false, error: "body too long" };

  let trimmedContext: string | null = null;
  if (context !== undefined && context !== null) {
    if (typeof context !== "string") return { ok: false, error: "invalid context" };
    trimmedContext = context.trim() || null;
    if (trimmedContext && trimmedContext.length > OPINION_CONTEXT_MAX) {
      return { ok: false, error: "context too long" };
    }
  }

  return { ok: true, value: { category, body: trimmedBody, context: trimmedContext } };
}
