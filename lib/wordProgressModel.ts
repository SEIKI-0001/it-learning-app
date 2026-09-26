// 単語帳進捗の型と純粋関数（サーバ・クライアント共用）。
// lib/wordlistProgress は "use client"（localStorage を触る）なので、API ルートや
// Today の純粋ロジックから使う部分はここに分けてある。

export type WordStatus = "new" | "learning" | "weak" | "mastered";

/** カード裏面の自己評価。 */
export type SelfRating = "remembered" | "vague" | "forgot";

export type WordProgress = {
  acronymId: string;
  status: WordStatus;
  correctCount: number;
  wrongCount: number;
  reviewCount: number;
  /** 直近に学習した日時（epoch ms）。 */
  lastReviewedAt: number | null;
  /** 次に復習する目安の日時（epoch ms）。これ以前なら「今日の復習対象」。 */
  nextReviewAt: number | null;
  lastSelfRating: SelfRating | null;
};

export type WordProgressMap = Record<string, WordProgress>;

const WORD_STATUSES: readonly WordStatus[] = ["new", "learning", "weak", "mastered"];
const SELF_RATINGS: readonly SelfRating[] = ["remembered", "vague", "forgot"];

function isFiniteOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

/** 保存・同期してよい形の進捗か（壊れた localStorage を DB へ送らない）。 */
export function isValidWordProgress(value: unknown): value is WordProgress {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Partial<WordProgress>;
  return (
    typeof p.acronymId === "string" &&
    p.acronymId.length > 0 &&
    WORD_STATUSES.includes(p.status as WordStatus) &&
    Number.isInteger(p.correctCount) &&
    Number.isInteger(p.wrongCount) &&
    Number.isInteger(p.reviewCount) &&
    isFiniteOrNull(p.lastReviewedAt) &&
    isFiniteOrNull(p.nextReviewAt) &&
    (p.lastSelfRating === null || SELF_RATINGS.includes(p.lastSelfRating as SelfRating))
  );
}

/**
 * 端末（localStorage）と DB の進捗をマージする純粋関数。
 * - 片方にしか無い単語はそのまま残す（どちらの学習も消さない）。
 * - 両方にある単語は lastReviewedAt が新しい方を採用する（null は 0 扱い、同時刻は DB 優先）。
 * - toUpload は「DB に無い、または端末の方が新しい」進捗。ログイン前や保存失敗で
 *   端末にしか残っていない既存データを、ここで DB へ引き継ぐ。
 */
export function mergeWordProgressMaps(
  local: WordProgressMap,
  remote: WordProgressMap,
): { merged: WordProgressMap; toUpload: WordProgress[] } {
  const merged: WordProgressMap = {};
  const toUpload: WordProgress[] = [];
  for (const [id, r] of Object.entries(remote)) {
    if (isValidWordProgress(r)) merged[id] = r;
  }
  for (const [id, l] of Object.entries(local)) {
    if (!isValidWordProgress(l)) continue;
    const r = merged[id];
    if (!r || (l.lastReviewedAt ?? 0) > (r.lastReviewedAt ?? 0)) {
      merged[id] = l;
      toUpload.push(l);
    }
  }
  return { merged, toUpload };
}

