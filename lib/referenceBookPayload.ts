import type {
  ReferenceBookArchiveEntry,
  ReferenceStudyPlan,
} from "@/types/referenceBook";

// /api/reference-book/save に送られてくる追加データ（切替履歴・参考書計画）の検証。
// 中身はユーザー自身のデータなので深い検証はしないが、形と大きさだけは確かめて
// 壊れた値や過大な値を DB に入れない。

export const ARCHIVE_MAX_BOOKS = 5;
const ARCHIVE_MAX_JSON_LENGTH = 400_000;
const PLAN_MAX_UNITS = 2000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 不正なら null。空配列は有効（履歴を消した状態）。 */
export function parseArchivePayload(value: unknown): ReferenceBookArchiveEntry[] | null {
  if (!Array.isArray(value) || value.length > ARCHIVE_MAX_BOOKS) return null;
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const e = entry as Record<string, unknown>;
    if (typeof e.title !== "string" || !Array.isArray(e.chapters)) return null;
    if (typeof e.updatedAt !== "string") return null;
    if (e.studyPlan != null && !parseStudyPlanPayload(e.studyPlan)) return null;
  }
  if (JSON.stringify(value).length > ARCHIVE_MAX_JSON_LENGTH) return null;
  return value as ReferenceBookArchiveEntry[];
}

/** 不正なら null。 */
export function parseStudyPlanPayload(value: unknown): ReferenceStudyPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  if (typeof p.bookId !== "string" || !p.bookId) return null;
  if (typeof p.structureHash !== "string") return null;
  if (typeof p.revision !== "number" || !Number.isInteger(p.revision) || p.revision < 0) return null;
  if (typeof p.revisedAt !== "string") return null;
  if (typeof p.startDate !== "string" || !DATE_RE.test(p.startDate)) return null;
  if (typeof p.inputEndDate !== "string" || !DATE_RE.test(p.inputEndDate)) return null;
  if (!Array.isArray(p.units) || p.units.length > PLAN_MAX_UNITS) return null;
  for (const unit of p.units) {
    if (!unit || typeof unit !== "object") return null;
    const u = unit as Record<string, unknown>;
    if (typeof u.unitId !== "string" || typeof u.plannedDate !== "string" || !DATE_RE.test(u.plannedDate)) {
      return null;
    }
  }
  return value as ReferenceStudyPlan;
}

/** PostgREST / Postgres が「列が無い」と返したか（migration 適用前の環境）。 */
export function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204" || /column .* does not exist|Could not find the '.*' column/i.test(error.message ?? "");
}
