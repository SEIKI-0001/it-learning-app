// 試験日の選び方（純関数）。
//
// 「何か月後」か「未定」でも選べるようにして、試験日のない人を作らない。
// 試験日が無いと、Today の量を逆算できない（lib/studyPace.ts）。
//   - N か月後: その日付を試験日にする（examPlan="decided"）。日付は下の欄で直せる。
//   - 未定: 3か月後を仮の試験日にする（examPlan="provisional"）。Today に仮であることを出す。
//   - 日付を直接入れた: examPlan="decided"。

import type { UserProfile } from "@/types";

export const EXAM_MONTH_PRESETS = [1, 2, 3] as const;
export const PROVISIONAL_EXAM_MONTHS = 3;

export type ExamDateChoice =
  | { kind: "months"; months: number }
  | { kind: "undecided" }
  | { kind: "date"; date: string };

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** N か月後の日付（"YYYY-MM-DD"）。月末を越える日は、その月の末日に寄せる（1/31 の1か月後 = 2/28）。 */
export function monthsLater(today: Date, months: number): string {
  const target = new Date(today.getFullYear(), today.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(today.getDate(), lastDay));
  return toIso(target);
}

/**
 * 選び方をプロフィールの試験日へ変換する。日付が空なら試験日なし（従来どおり）。
 * current が既に仮の試験日なら、「未定」のまま保存し直しても日付を動かさない
 * （設定を保存するたびに仮の試験日が先へずれるのを防ぐ）。
 */
export function resolveExamDateChoice(
  choice: ExamDateChoice | null,
  today: Date = new Date(),
  current?: Pick<UserProfile, "examDate" | "examPlan">,
): Pick<UserProfile, "examDate" | "examPlan"> {
  if (!choice) return { examDate: undefined, examPlan: "undecided" };
  switch (choice.kind) {
    case "months":
      return { examDate: monthsLater(today, choice.months), examPlan: "decided" };
    case "undecided":
      if (current?.examPlan === "provisional" && current.examDate) {
        return { examDate: current.examDate, examPlan: "provisional" };
      }
      return { examDate: monthsLater(today, PROVISIONAL_EXAM_MONTHS), examPlan: "provisional" };
    case "date":
      return choice.date
        ? { examDate: choice.date, examPlan: "decided" }
        : { examDate: undefined, examPlan: "undecided" };
  }
}

/** 保存済みのプロフィールから、画面で選ばれている状態を復元する。 */
export function examDateChoiceFromProfile(
  profile: Pick<UserProfile, "examDate" | "examPlan"> | undefined,
): ExamDateChoice | null {
  if (!profile?.examDate) return null;
  if (profile.examPlan === "provisional") return { kind: "undecided" };
  return { kind: "date", date: profile.examDate };
}
