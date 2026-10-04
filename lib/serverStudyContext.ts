import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/types";
import { getAllTopics } from "@/lib/content";
import { bookOrderFlag } from "@/lib/bookOrderFlag";
import { referenceBookRowToBook, type ReferenceBookRow } from "@/lib/dbMappers";
import { parseStudyPlanPayload } from "@/lib/referenceBookPayload";
import {
  referenceBookIdentity,
  resolveStudyContext,
  studyOrderKey,
  type StudyContext,
} from "@/lib/studyContext";
import { supplementDeadlineFor, type BookQueueOptions } from "@/lib/bookStudyPlan";

// サーバー側（LINE の返信・週報）の学習コンテキスト。Web と同じ resolveStudyContext で決める。
// アプリ順のユーザー（希望が未設定・機能フラグ off）は参考書を読まない（従来と同じ問い合わせ数・結果）。

export type ServerStudyContext = {
  context: StudyContext;
  bookQueue: BookQueueOptions | null;
  orderKey: string;
};

const APP_ONLY = (profile: UserProfile | undefined): ServerStudyContext => {
  const context = resolveStudyContext({
    preference: profile?.studyOrderPreference,
    book: null,
    topics: getAllTopics(),
    flag: bookOrderFlag(),
    examDate: profile?.examDate,
    weekdayMinutes: profile?.weekdayMinutes,
    holidayMinutes: profile?.holidayMinutes,
  });
  return { context, bookQueue: null, orderKey: "app" };
};

export async function loadServerStudyContext(
  supabase: SupabaseClient | null,
  userId: string | null,
  profile: UserProfile | undefined,
): Promise<ServerStudyContext> {
  if (!supabase || !userId || bookOrderFlag() !== "optin" || profile?.studyOrderPreference !== "book") {
    return APP_ONLY(profile);
  }
  try {
    const { data } = await supabase
      .from("user_reference_books")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const row = (data as ReferenceBookRow | null) ?? null;
    if (!row) return APP_ONLY(profile);
    const book = referenceBookRowToBook(row);
    const parsed = row.study_plan ? parseStudyPlanPayload(row.study_plan) : null;
    // 使用中の本の計画だけを使う（切替直後に前の本の計画が残っていても混ぜない）。
    const plan = parsed && parsed.bookId === referenceBookIdentity(book) ? parsed : null;
    const context = resolveStudyContext({
      preference: profile.studyOrderPreference,
      book,
      topics: getAllTopics(),
      flag: bookOrderFlag(),
      examDate: profile.examDate,
      weekdayMinutes: profile.weekdayMinutes,
      holidayMinutes: profile.holidayMinutes,
      studyPlanRevision: plan?.revision,
    });
    if (context.effectiveMode !== "book" || !context.order) {
      return { context, bookQueue: null, orderKey: "app" };
    }
    const deadline = supplementDeadlineFor(plan);
    return {
      context,
      bookQueue: { order: context.order, ...(deadline ? { supplementDeadline: deadline } : {}) },
      orderKey: studyOrderKey(context, plan?.revision),
    };
  } catch {
    // 参考書を読めなくても学習案内は止めない（アプリ順で返す）。
    return APP_ONLY(profile);
  }
}
