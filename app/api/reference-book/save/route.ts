import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import { referenceBookToRow } from "@/lib/dbMappers";
import { resolveSavedReferenceBookId } from "@/lib/referenceBook";
import {
  isMissingColumnError,
  parseArchivePayload,
  parseStudyPlanPayload,
} from "@/lib/referenceBookPayload";
import type { ReferenceBook } from "@/types/referenceBook";

export const runtime = "nodejs";

type SaveBody = {
  userId?: string;
  book?: ReferenceBook;
  /** 切替履歴（省略時は変更しない） */
  archive?: unknown;
  /** 参考書計画（省略時は変更しない・null で消す） */
  studyPlan?: unknown;
};

/**
 * POST /api/reference-book/save
 * ユーザーの参考書アウトラインを UPSERT する（1ユーザー1冊）。
 * body: { userId?, book, archive?, studyPlan? }（production ではセッション / fq_line Cookie からのみ解決）
 *       { userId?, studyPlan } だけなら、使用中の本の計画だけを更新する（本が違えば 409）
 * 返却: { ok: true, bookId?: string }  … DB 上の本の永続 id（クライアントはこれに揃える）
 *
 * book_id は同じ本なら既存の id を保ち、別の本へ切り替えたら新しい id にする（resolveSavedReferenceBookId）。
 * migration 20261004120000 の適用前の環境では、追加列を送らずに従来どおり保存する。
 *
 * Supabase 未設定: 503 / userId なし: 401 / 入力不正: 400 / 保存失敗: 500
 */
export async function POST(request: Request) {
  let body: SaveBody = {};
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const book = body.book;
  const planOnly = !book && body.studyPlan !== undefined && body.studyPlan !== null;
  if (!planOnly && (!book || !Array.isArray(book.chapters))) {
    return NextResponse.json({ ok: false, error: "book invalid" }, { status: 400 });
  }
  const archive = body.archive === undefined ? undefined : parseArchivePayload(body.archive);
  if (archive === null) {
    return NextResponse.json({ ok: false, error: "archive invalid" }, { status: 400 });
  }
  const studyPlan =
    body.studyPlan === undefined || body.studyPlan === null
      ? body.studyPlan
      : parseStudyPlanPayload(body.studyPlan);
  if (studyPlan === null && body.studyPlan !== null) {
    return NextResponse.json({ ok: false, error: "study plan invalid" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  const { data: existing, error: readError } = await supabase
    .from("user_reference_books")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  if (planOnly || !book) {
    // 計画だけの保存。使用中の本の計画でなければ受け付けない（切替直後の古い計画で上書きしない）。
    const storedId = (existing as { book_id?: string | null } | null)?.book_id;
    if (!studyPlan || !storedId || storedId !== studyPlan.bookId) {
      return NextResponse.json({ ok: false, error: "book mismatch" }, { status: 409 });
    }
    const { error: planError } = await supabase
      .from("user_reference_books")
      .update({ study_plan: studyPlan })
      .eq("user_id", userId);
    if (planError) {
      return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, bookId: storedId });
  }

  const bookId = resolveSavedReferenceBookId(
    (existing as { book_id?: string | null; title?: string | null; edition?: string | null } | null) ?? null,
    book,
  );
  const legacyRow = referenceBookToRow(userId, { ...book, id: undefined, source: undefined });
  const fullRow = {
    ...referenceBookToRow(userId, { ...book, id: bookId }),
    ...(archive !== undefined ? { archived_books: archive } : {}),
    ...(studyPlan !== undefined ? { study_plan: studyPlan } : {}),
  };

  let { error } = await supabase
    .from("user_reference_books")
    .upsert(fullRow, { onConflict: "user_id" });
  let savedBookId = bookId;
  let legacy = false;
  if (isMissingColumnError(error)) {
    // 追加列がまだ無い環境（migration 適用前）。従来の列だけで保存する。
    ({ error } = await supabase
      .from("user_reference_books")
      .upsert(legacyRow, { onConflict: "user_id" }));
    savedBookId = undefined;
    legacy = true;
  }

  if (error) {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  if (!savedBookId && !legacy) {
    // 新規行で id を送らなかったときは DB の default が採番した id を返す。
    const { data } = await supabase
      .from("user_reference_books")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    savedBookId = (data as { book_id?: string | null } | null)?.book_id ?? undefined;
  }

  return NextResponse.json({ ok: true, ...(savedBookId ? { bookId: savedBookId } : {}) });
}
