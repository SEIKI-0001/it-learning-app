"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CatalogEntry } from "@/lib/referenceBookCatalog";

// 目次の共有カタログの管理（proxy.ts の Basic 認証）。
// 他の利用者に出るのは「承認済み」か「別々の2人以上が同じ目次を提出」したもの。
// 誤り・不適切な内容は「非表示」にする。提出者は表示しない。

type AdminEntry = CatalogEntry & {
  status: "pending" | "approved" | "hidden";
  submitCount: number;
  useCount: number;
  visible: boolean;
  updatedAt: string;
};

const STATUS_LABEL: Record<AdminEntry["status"], string> = {
  pending: "未確認",
  approved: "承認済み",
  hidden: "非表示",
};

export default function BookCatalogAdminPage() {
  const [entries, setEntries] = useState<AdminEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/book-catalog", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { entries: AdminEntry[] };
      setEntries(data.entries);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/book-catalog", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { entries: AdminEntry[] }) => {
        if (!cancelled) setEntries(data.entries);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function setStatus(id: string, status: AdminEntry["status"]) {
    setBusy(id);
    await fetch("/api/admin/book-catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => {});
    setBusy(null);
    await load();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md md:max-w-5xl">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">目次の共有カタログ</h1>
          <Link href="/admin" className="text-sm font-medium text-brand-500">
            管理ビューへ
          </Link>
        </div>
        <p className="mb-6 text-xs text-gray-400">
          利用者が目次の読み取りで登録した章立て。承認済み、または別々の2人以上が同じ目次を提出したものが、他の利用者の登録画面に出ます。
        </p>
        {failed && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">読み込めませんでした。</p>}
        {!entries && !failed && <p className="text-sm text-gray-400">読み込み中…</p>}
        {entries?.length === 0 && <p className="text-sm text-gray-500">まだ提出はありません。</p>}
        <ul className="space-y-3">
          {entries?.map((entry) => (
            <li key={entry.id} className="rounded-xl bg-white p-4 text-sm shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-gray-800">{entry.title}</p>
                <span className="text-xs text-gray-500">
                  {STATUS_LABEL[entry.status]}・{entry.visible ? "公開中" : "非公開"}・提出 {entry.submitCount}人・利用 {entry.useCount}回
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {[entry.publisher, entry.edition, `${entry.chapterCount}章・${entry.sectionCount}節`].filter(Boolean).join("・")}
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-gray-600">目次を見る</summary>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs text-gray-700">
                  {entry.chapters.map((chapter, i) => (
                    <li key={i}>
                      {chapter.title}
                      {chapter.sections.length > 0 && (
                        <ul className="list-disc pl-4 text-gray-500">
                          {chapter.sections.map((section, j) => (
                            <li key={j}>{section.title}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </details>
              <div className="mt-2 flex gap-2">
                {(["approved", "hidden", "pending"] as const)
                  .filter((status) => status !== entry.status)
                  .map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy === entry.id}
                      onClick={() => void setStatus(entry.id, status)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
                    >
                      {status === "approved" ? "承認する" : status === "hidden" ? "非表示にする" : "未確認に戻す"}
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
