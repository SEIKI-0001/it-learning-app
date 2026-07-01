"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllWords, getWordlistCount } from "@/lib/wordlist";
import {
  getWordProgressMap,
  countByStatus,
  getDueIds,
  subscribeWordProgress,
  type WordStatus,
} from "@/lib/wordlistProgress";
import BottomNav from "@/components/BottomNav";

// 単語帳トップ（ハブ）。ITパスポート英略語の学習状況サマリと学習メニューを置く。
// 進捗は localStorage（lib/wordlistProgress）からクライアントで読む。

const ALL_IDS = getAllWords().map((e) => e.id);
const TOTAL = getWordlistCount();

const STAT_META: { key: WordStatus | "due"; label: string; color: string }[] = [
  { key: "new", label: "未学習", color: "text-gray-500" },
  { key: "learning", label: "学習中", color: "text-amber-600" },
  { key: "weak", label: "苦手", color: "text-rose-600" },
  { key: "mastered", label: "定着済み", color: "text-green-600" },
];

export default function WordlistHubPage() {
  const [counts, setCounts] = useState<Record<WordStatus, number>>({
    new: TOTAL,
    learning: 0,
    weak: 0,
    mastered: 0,
  });
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    const load = () => {
      const map = getWordProgressMap();
      setCounts(countByStatus(ALL_IDS, map));
      setDueCount(getDueIds(ALL_IDS, map).length);
    };
    load();
    return subscribeWordProgress(load);
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-4 pt-4 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <h1 className="text-xl font-extrabold">📇 英略語 単語帳</h1>
          <p className="mt-0.5 text-xs text-white/90">
            ITパスポートの英略語{TOTAL}語を、意味・正式名称・違いまでまとめて暗記。
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-6 px-4 py-5 md:max-w-2xl">
        {/* 学習状況サマリ */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-extrabold text-gray-800">学習状況</h2>
            <span className="text-xs font-bold text-gray-400">
              全{TOTAL}語
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {STAT_META.map((s) => (
              <div key={s.key} className="rounded-xl bg-gray-50 py-2.5">
                <p className={`text-xl font-extrabold ${s.color}`}>
                  {counts[s.key as WordStatus]}
                </p>
                <p className="text-[11px] font-bold text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-xl bg-indigo-50 px-3 py-2.5">
            <span className="text-xs font-bold text-indigo-500">
              今日の復習対象
            </span>
            <span className="ml-2 text-base font-extrabold text-indigo-700">
              {dueCount}語
            </span>
          </div>
        </section>

        {/* 学習メニュー */}
        <section className="grid gap-2.5 sm:grid-cols-2">
          <Link
            href="/glossary/study?mode=today"
            className="flex items-center justify-between rounded-2xl bg-indigo-600 px-4 py-3.5 text-white shadow-sm transition active:scale-[0.99]"
          >
            <span className="text-base font-extrabold">🔁 今日の復習を始める</span>
            <span className="text-xs font-bold text-white/80">{dueCount}語</span>
          </Link>
          <Link
            href="/glossary/study?mode=weak"
            className="flex items-center justify-between rounded-2xl bg-rose-500 px-4 py-3.5 text-white shadow-sm transition active:scale-[0.99]"
          >
            <span className="text-base font-extrabold">⚡ 苦手だけ復習</span>
            <span className="text-xs font-bold text-white/80">
              {counts.weak}語
            </span>
          </Link>
          <Link
            href="/glossary/study?mode=all"
            className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-white px-4 py-3.5 text-indigo-700 shadow-sm transition active:scale-[0.99]"
          >
            <span className="text-base font-extrabold">📚 すべてから学習</span>
            <span className="text-xs font-bold text-indigo-400">{TOTAL}語</span>
          </Link>
          <Link
            href="/glossary/quiz?mode=all"
            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-gray-700 shadow-sm transition active:scale-[0.99]"
          >
            <span className="text-base font-extrabold">✅ 4択確認をする</span>
            <span className="text-xs font-bold text-gray-400">4択</span>
          </Link>
        </section>

        <Link
          href="/glossary/list"
          className="block rounded-2xl bg-gray-100 px-4 py-3 text-center text-sm font-extrabold text-gray-600 transition active:scale-[0.99]"
        >
          単語一覧を見る →
        </Link>
      </div>

      <BottomNav />
    </main>
  );
}
