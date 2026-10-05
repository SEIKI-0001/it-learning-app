"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OPINION_CATEGORY_LABELS, isOpinionCategory } from "@/lib/opinions";

// 意見箱（「その他」ページ）に届いた声の一覧（proxy.ts の Basic 認証）。
// 対応状況は 未読 → 既読 → 対応済み を運営が手で進める。

type OpinionStatus = "new" | "read" | "done";

type AdminOpinion = {
  id: string;
  userId: string;
  displayName: string | null;
  category: string;
  body: string;
  context: string | null;
  status: OpinionStatus;
  createdAt: string;
};

const STATUS_LABEL: Record<OpinionStatus, string> = {
  new: "未読",
  read: "既読",
  done: "対応済み",
};

const STATUS_ACTION: Record<OpinionStatus, string> = {
  new: "未読に戻す",
  read: "既読にする",
  done: "対応済みにする",
};

type Filter = "all" | OpinionStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "new", label: "未読" },
  { value: "read", label: "既読" },
  { value: "done", label: "対応済み" },
];

function categoryLabel(category: string): string {
  return isOpinionCategory(category) ? OPINION_CATEGORY_LABELS[category] : category;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OpinionsAdminPage() {
  const [opinions, setOpinions] = useState<AdminOpinion[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("new");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/opinions", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { opinions: AdminOpinion[] };
      setOpinions(data.opinions);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/opinions", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { opinions: AdminOpinion[] }) => {
        if (!cancelled) setOpinions(data.opinions);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function setStatus(id: string, status: OpinionStatus) {
    setBusy(id);
    await fetch("/api/admin/opinions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => {});
    setBusy(null);
    await load();
  }

  const counts = {
    all: opinions?.length ?? 0,
    new: opinions?.filter((o) => o.status === "new").length ?? 0,
    read: opinions?.filter((o) => o.status === "read").length ?? 0,
    done: opinions?.filter((o) => o.status === "done").length ?? 0,
  };
  const visible = opinions?.filter((o) => filter === "all" || o.status === filter) ?? [];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md md:max-w-5xl">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">意見箱</h1>
          <Link href="/admin" className="text-sm font-medium text-brand-500">
            管理ビューへ
          </Link>
        </div>
        <p className="mb-6 text-xs text-gray-400">
          「その他」ページの意見箱に届いた投稿（新しい順・最大200件）。読んだら既読、直したら対応済みにします。
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-full border px-3 py-1 text-xs ${
                filter === value
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {label} {counts[value]}
            </button>
          ))}
        </div>

        {failed && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">読み込めませんでした。</p>}
        {!opinions && !failed && <p className="text-sm text-gray-400">読み込み中…</p>}
        {opinions && visible.length === 0 && (
          <p className="text-sm text-gray-500">
            {opinions.length === 0 ? "まだ投稿はありません。" : "この状態の投稿はありません。"}
          </p>
        )}
        <ul className="space-y-3">
          {visible.map((opinion) => (
            <li key={opinion.id} className="rounded-xl bg-white p-4 text-sm shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-gray-800">{categoryLabel(opinion.category)}</p>
                <span className="text-xs text-gray-500">
                  {STATUS_LABEL[opinion.status]}・{formatDate(opinion.createdAt)}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {opinion.displayName ?? "(名前なし)"}
                <span className="ml-1 font-mono text-gray-400">{opinion.userId.slice(0, 8)}</span>
              </p>
              {opinion.context && (
                <p className="mt-2 text-xs text-gray-600">対象: {opinion.context}</p>
              )}
              <p className="mt-2 whitespace-pre-wrap break-words text-gray-800">{opinion.body}</p>
              <div className="mt-3 flex gap-2">
                {(["read", "done", "new"] as const)
                  .filter((status) => status !== opinion.status)
                  .map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy === opinion.id}
                      onClick={() => void setStatus(opinion.id, status)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
                    >
                      {STATUS_ACTION[status]}
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
