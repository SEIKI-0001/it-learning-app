"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  WORDLIST_CATEGORY_LABELS,
  WORDLIST_CATEGORY_ORDER,
  type WordlistCategory,
} from "@/types/wordlist";
import { getAllWords } from "@/lib/wordlist";
import {
  getWordProgressMap,
  subscribeWordProgress,
  type WordProgressMap,
  type WordStatus,
} from "@/lib/wordlistProgress";
import { STATUS_META, CATEGORY_BADGE } from "@/components/wordlist/ui";
import BottomNav from "@/components/BottomNav";

// 単語一覧。wordlist の全単語をカード表示し、カテゴリと習得状態で絞り込む。

const WORDS = getAllWords();

type CategoryFilter = "all" | WordlistCategory;
type StatusFilter = "all" | WordStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "new", label: "未学習" },
  { key: "learning", label: "学習中" },
  { key: "weak", label: "苦手" },
  { key: "mastered", label: "定着済み" },
];

export default function WordlistListPage() {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [progress, setProgress] = useState<WordProgressMap>({});

  useEffect(() => {
    const load = () => setProgress(getWordProgressMap());
    load();
    return subscribeWordProgress(load);
  }, []);

  const list = useMemo(() => {
    return WORDS.filter((w) => {
      if (category !== "all" && w.category !== category) return false;
      if (status !== "all") {
        const st = progress[w.id]?.status ?? "new";
        if (st !== status) return false;
      }
      return true;
    });
  }, [category, status, progress]);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-3 pt-3 text-white">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 md:max-w-4xl">
          <Link href="/glossary" className="text-sm font-medium text-white/80">
            ←
          </Link>
          <h1 className="text-lg font-extrabold">単語一覧</h1>
          <span className="ml-auto text-xs font-bold text-white/80">
            全{WORDS.length}語
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-4 px-4 py-4 md:max-w-4xl">
        {/* カテゴリフィルタ */}
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={category === "all"}
            onClick={() => setCategory("all")}
          >
            すべて
          </FilterChip>
          {WORDLIST_CATEGORY_ORDER.map((c) => (
            <FilterChip
              key={c}
              active={category === c}
              onClick={() => setCategory(c)}
            >
              {WORDLIST_CATEGORY_LABELS[c]}
            </FilterChip>
          ))}
        </div>

        {/* 習得状態フィルタ */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <FilterChip
              key={s.key}
              active={status === s.key}
              tone="status"
              onClick={() => setStatus(s.key)}
            >
              {s.label}
            </FilterChip>
          ))}
        </div>

        <p className="text-xs font-bold text-gray-400">{list.length}語</p>

        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((w) => {
            const st = progress[w.id]?.status ?? "new";
            return (
              <li key={w.id}>
                <Link
                  href={`/glossary/${w.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 transition active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-extrabold text-gray-900">
                        {w.acronym}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${CATEGORY_BADGE[w.category]}`}
                      >
                        {WORDLIST_CATEGORY_LABELS[w.category]}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-bold text-gray-700">
                      {w.japanese}
                    </p>
                    <p className="truncate text-xs text-gray-500">{w.oneLine}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_META[st].badge}`}
                  >
                    {STATUS_META[st].label}
                  </span>
                </Link>
              </li>
            );
          })}
          {list.length === 0 && (
            <li className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
              該当する単語がありません。
            </li>
          )}
        </ul>
      </div>

      <BottomNav />
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  tone = "category",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "category" | "status";
}) {
  const activeCls =
    tone === "status" ? "bg-gray-800 text-white" : "bg-indigo-600 text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition active:scale-[0.97] ${
        active ? activeCls : "bg-white text-gray-500 ring-1 ring-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
