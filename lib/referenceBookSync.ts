"use client";

import type {
  ReferenceBook,
  ReferenceBookArchiveEntry,
  ReferenceStudyPlan,
} from "@/types/referenceBook";
import {
  isSameReferenceBook,
  loadReferenceBook,
  loadReferenceBookArchive,
  mergeReferenceBookArchives,
  normalizeReferenceBook,
  pickNewerReferenceBook,
  saveReferenceBook,
  saveReferenceBookArchive,
} from "@/lib/referenceBook";
import { refreshPresetMappings } from "@/lib/referenceBookPresets";
import { getUserId } from "@/lib/userSession";

// ログイン時の参考書アウトラインの DB 同期（クライアント fetch）。
// localStorage が主。ここは fire-and-forget の保存＋別端末向けの読み込み。
// 単語帳（word-progress）と同じ設計。Supabase 未設定でも UI は localStorage で動く。

type DbReferenceBookState = {
  book: ReferenceBook | null;
  archive: ReferenceBookArchiveEntry[];
  studyPlan: ReferenceStudyPlan | null;
};

// ---------------------------------------------------------------------------
// 参考書順の計画（予定日のスナップショット）の端末保存。本の永続 id ごとに持つので、
// 本を切り替えて戻しても、その本の計画がそのまま使える（DB は使用中の本＝study_plan、
// 切替履歴の本＝archived_books[].studyPlan に入る）。
// ---------------------------------------------------------------------------

const STUDY_PLANS_KEY = "fequest:referenceStudyPlans";
const STUDY_PLANS_LIMIT = 8;

export function loadLocalStudyPlans(): Record<string, ReferenceStudyPlan> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STUDY_PLANS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, ReferenceStudyPlan>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocalStudyPlans(plans: Record<string, ReferenceStudyPlan>): void {
  if (typeof window === "undefined") return;
  const kept = Object.values(plans)
    .sort((a, b) => b.revisedAt.localeCompare(a.revisedAt))
    .slice(0, STUDY_PLANS_LIMIT);
  try {
    window.localStorage.setItem(
      STUDY_PLANS_KEY,
      JSON.stringify(Object.fromEntries(kept.map((plan) => [plan.bookId, plan]))),
    );
  } catch {
    /* ignore */
  }
}

/** 計画を端末へ取り込む（同じ本は revisedAt の新しい方）。取り込んだら true。 */
function mergeLocalStudyPlans(incoming: (ReferenceStudyPlan | null | undefined)[]): boolean {
  const plans = loadLocalStudyPlans();
  let changed = false;
  for (const plan of incoming) {
    if (!plan?.bookId) continue;
    const current = plans[plan.bookId];
    if (!current || plan.revisedAt > current.revisedAt) {
      plans[plan.bookId] = plan;
      changed = true;
    }
  }
  if (changed) saveLocalStudyPlans(plans);
  return changed;
}

/**
 * 参考書順の計画を保存する（端末＋ログイン中は DB）。DB は使用中の本の計画だけを受け付ける。
 */
export function persistReferenceStudyPlan(plan: ReferenceStudyPlan): void {
  const plans = loadLocalStudyPlans();
  plans[plan.bookId] = plan;
  saveLocalStudyPlans(plans);
  const userId = getUserId();
  if (!userId) return;
  void fetch("/api/reference-book/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, studyPlan: plan }),
  }).catch(() => {
    /* fire-and-forget */
  });
}

/** 切替履歴に、端末にある各本の計画を添える（DB の archived_books[].studyPlan へ）。 */
function archiveWithPlans(): ReferenceBookArchiveEntry[] {
  const plans = loadLocalStudyPlans();
  return loadReferenceBookArchive().map((entry) =>
    entry.id && plans[entry.id] ? { ...entry, studyPlan: plans[entry.id] } : entry,
  );
}

/** DB から参考書と切替履歴を取得（取れなければ null）。userId が無ければ呼ばない。 */
export async function loadReferenceBookFromDb(
  userId: string,
): Promise<DbReferenceBookState | null> {
  try {
    const res = await fetch("/api/reference-book/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok: boolean;
      book?: ReferenceBook | null;
      archive?: ReferenceBookArchiveEntry[];
      studyPlan?: ReferenceStudyPlan | null;
    };
    if (!data.ok) return null;
    return {
      book: data.book ?? null,
      archive: Array.isArray(data.archive) ? data.archive : [],
      studyPlan: data.studyPlan ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * DB が決めた本の永続 id を端末の本に写す（同じ本のときだけ）。
 * 同じ本を端末ごとに別 id で作っても、DB 側の id に揃う。
 */
function adoptSavedBookId(saved: ReferenceBook, bookId: string): void {
  const local = loadReferenceBook();
  if (!local || local.id === bookId) return;
  if (local.id && local.id !== saved.id) return; // 保存後に別の本へ切り替えた
  if (!isSameReferenceBook({ ...local, id: undefined }, { ...saved, id: undefined })) return;
  saveReferenceBook({ ...local, id: bookId }, { touch: false });
}

/** DB へ参考書（＋端末の切替履歴）を保存（fire-and-forget。失敗しても UI は止めない）。 */
export function saveReferenceBookToDb(
  userId: string,
  book: ReferenceBook,
): void {
  void fetch("/api/reference-book/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      book,
      archive: archiveWithPlans(),
      // 端末にこの本の計画があれば一緒に送る（無ければ DB の計画をそのまま残す）。
      ...(book.id && loadLocalStudyPlans()[book.id] ? { studyPlan: loadLocalStudyPlans()[book.id] } : {}),
    }),
  })
    .then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as { ok?: boolean; bookId?: string };
      if (data.ok && data.bookId) adoptSavedBookId(book, data.bookId);
    })
    .catch(() => {
      /* fire-and-forget */
    });
}

/**
 * 参考書を端末と DB の両方へ保存する（既存の保存経路をまとめた入口）。
 * 未ログインなら localStorage のみ。保存した版（updatedAt 更新済み）を返す。
 */
export function persistReferenceBook(book: ReferenceBook): ReferenceBook {
  const next = { ...book, updatedAt: new Date().toISOString() };
  saveReferenceBook(next, { touch: false });
  const userId = getUserId();
  if (userId) saveReferenceBookToDb(userId, next);
  notifyReferenceBookChanged(next);
  return next;
}

// ---------------------------------------------------------------------------
// 参考書の変更通知（学習コンテキストを持つ画面へ、保存した本を即座に反映するため）
// ---------------------------------------------------------------------------

const bookListeners = new Set<(book: ReferenceBook | null) => void>();

export function subscribeReferenceBookChanges(listener: (book: ReferenceBook | null) => void): () => void {
  bookListeners.add(listener);
  return () => {
    bookListeners.delete(listener);
  };
}

function notifyReferenceBookChanged(book: ReferenceBook | null): void {
  for (const listener of bookListeners) listener(book);
}

/**
 * 参考書を読み込む。まず端末の版を返し、ログイン中なら DB と比べて新しい方に揃える。
 *   - DB が新しい: 端末へ写す（別端末で「全部」を押した結果を取り込む）
 *   - 端末が新しい: DB へ送り直す（前回の DB 保存が失敗していた場合の回復）
 */
export async function loadReferenceBookSynced(): Promise<ReferenceBook | null> {
  const picked = await pickSyncedReferenceBook();
  if (!picked) return null;
  // プリセットの紐づけ拡充を、登録済みの本にも取り込む（取り込んだら保存し直す）。
  const refreshed = refreshPresetMappings(picked);
  return refreshed === picked ? picked : persistReferenceBook(refreshed);
}

async function pickSyncedReferenceBook(): Promise<ReferenceBook | null> {
  let local = loadReferenceBook();
  const userId = getUserId();
  if (!userId) return local;
  const fetched = await loadReferenceBookFromDb(userId);
  const remote = fetched?.book ? normalizeReferenceBook(fetched.book) : null;

  // 参考書順の計画: DB の計画（使用中の本・切替履歴の本）を端末へ取り込む。
  if (fetched) {
    mergeLocalStudyPlans([fetched.studyPlan, ...fetched.archive.map((entry) => entry.studyPlan)]);
  }

  // 切替履歴: 端末と DB を合わせる（DB 版を取得できたときだけ）。
  let archiveChanged = false;
  if (fetched) {
    const localArchive = loadReferenceBookArchive();
    const merged = mergeReferenceBookArchives(localArchive, fetched.archive);
    saveReferenceBookArchive(merged);
    archiveChanged = JSON.stringify(merged) !== JSON.stringify(fetched.archive);
  }

  // 旧データ（id 無し）の端末の本は、同じ本なら DB の id を受け取る。
  if (local && remote?.id && local.id !== remote.id && isSameReferenceBook({ ...local, id: undefined }, remote)) {
    local = { ...local, id: remote.id };
    saveReferenceBook(local, { touch: false });
  }

  const picked = pickNewerReferenceBook(local, remote);
  if (remote && picked === remote) {
    saveReferenceBook(remote, { touch: false });
    if (archiveChanged) saveReferenceBookToDb(userId, remote);
  } else if (local && picked === local && (remote || archiveChanged)) {
    saveReferenceBookToDb(userId, local);
  }
  return picked;
}
