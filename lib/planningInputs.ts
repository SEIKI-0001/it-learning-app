import type { UserProfile } from "@/types";

// ============================================================================
// 学習計画の入力（planning inputs）。
// ----------------------------------------------------------------------------
// 試験予定日・平日/休日の学習可能時間は、統合進捗（integrated_learning_status）・
// 立て直し案（plan_adjustment_proposals）・今週の計画（weeklyPlan）など
// 学習計画の派生データすべての前提になる。これらが変わったら単なるプロフィール保存ではなく
// 「学習計画の再計算イベント」として扱う（/api/progress/save・設定画面で共有する判定）。
//
// サーバー（API Route）とクライアント（設定画面・studyPlanner）の両方から使うため、
// DB にも React にも依存しない純粋関数だけを置く。
// ============================================================================

export type PlanningInputs = {
  examDate: string | null;
  weekdayMinutes: number | null;
  holidayMinutes: number | null;
};

/** user_profiles のうち planning inputs に当たる列。 */
export type PlanningInputsRow = {
  exam_date?: string | null;
  weekday_minutes?: number | null;
  holiday_minutes?: number | null;
};

/** 保存時に比較するため user_profiles から読む列（PlanningInputsRow と対応）。 */
export const PLANNING_INPUT_COLUMNS = "exam_date, weekday_minutes, holiday_minutes";

function normalizeDate(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function normalizeMinutes(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function planningInputsFromProfile(
  profile: Pick<UserProfile, "examDate" | "weekdayMinutes" | "holidayMinutes"> | null | undefined,
): PlanningInputs | null {
  if (!profile) return null;
  return {
    examDate: normalizeDate(profile.examDate),
    weekdayMinutes: normalizeMinutes(profile.weekdayMinutes),
    holidayMinutes: normalizeMinutes(profile.holidayMinutes),
  };
}

export function planningInputsFromRow(
  row: PlanningInputsRow | null | undefined,
): PlanningInputs | null {
  if (!row) return null;
  return {
    examDate: normalizeDate(row.exam_date),
    weekdayMinutes: normalizeMinutes(row.weekday_minutes),
    holidayMinutes: normalizeMinutes(row.holiday_minutes),
  };
}

/**
 * planning inputs が変わったか。
 * 変更前プロフィールが無い（初回保存）ときは、何か1つでも値があれば「変わった」とみなす
 * （プロフィール無しで作られた派生データを新しい前提で作り直すため）。
 */
export function havePlanningInputsChanged(
  before: PlanningInputs | null,
  after: PlanningInputs | null,
): boolean {
  if (!after) return false;
  if (!before) {
    return (
      after.examDate !== null ||
      after.weekdayMinutes !== null ||
      after.holidayMinutes !== null
    );
  }
  return (
    before.examDate !== after.examDate ||
    before.weekdayMinutes !== after.weekdayMinutes ||
    before.holidayMinutes !== after.holidayMinutes
  );
}

/**
 * 試験日（"YYYY-MM-DD"）までの残り日数。未設定・不正なら null、過去日は 0。
 * 試験日当日 0 時（実行環境のローカル時刻）までの残りを日単位で切り上げる。
 * aiPlanner（画面の学習ペース・今週のゴール）と統合進捗・立て直し案で同じ計算を使う。
 */
export function daysUntilExamDate(
  examDate: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!examDate) return null;
  const exam = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(exam.getTime())) return null;
  return Math.max(0, Math.ceil((exam.getTime() - now.getTime()) / 86_400_000));
}
