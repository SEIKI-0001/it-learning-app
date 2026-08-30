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
import PageHeader from "@/components/ui/PageHeader";
import Icon, { type IconName } from "@/components/ui/Icon";

// 単語帳トップ（ハブ）。ITパスポート英略語の学習状況サマリと学習メニューを置く。
// 進捗は localStorage（lib/wordlistProgress）からクライアントで読む。

const ALL_IDS = getAllWords().map((e) => e.id);
const TOTAL = getWordlistCount();

const STAT_META: { key: WordStatus; label: string }[] = [
  { key: "new", label: "未学習" },
  { key: "learning", label: "学習中" },
  { key: "weak", label: "苦手" },
  { key: "mastered", label: "定着済み" },
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
    <main className="min-h-screen pb-24">
      <PageHeader
        title="英略語 単語帳"
        description={`ITパスポートの英略語${TOTAL}語を、意味・正式名称・違いまでまとめて暗記。`}
      >
        <dl className="mt-4 grid grid-cols-4 divide-x divide-gray-200 border-y border-gray-200 text-center">
          {STAT_META.map((s) => (
            <div key={s.key} className="px-2 py-3">
              <dt className="text-[11px] text-gray-600">{s.label}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900">
                {counts[s.key]}
              </dd>
            </div>
          ))}
        </dl>
      </PageHeader>

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        {/* この画面で唯一の強調ブロック。復習が溜まっていれば復習を、なければ通常学習を主役にする */}
        {dueCount > 0 ? (
          <Link
            href="/glossary/study?mode=today"
            className="group block rounded-lg border border-accent-200 border-l-4 border-l-accent-500 bg-accent-50 p-4 transition hover:bg-accent-100 active:scale-[0.99]"
          >
            <p className="text-xs font-semibold text-accent-700">今日の復習対象</p>
            <p className="mt-1 flex items-center justify-between gap-3">
              <span className="text-[15px] font-semibold leading-snug text-gray-900">
                今日の復習を始める
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-accent-700">
                {dueCount}語
              </span>
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-700">
              はじめる
              <Icon
                name="arrow-right"
                className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        ) : (
          <Link
            href="/glossary/study?mode=all"
            className="group block rounded-lg border border-brand-200 border-l-4 border-l-brand-500 bg-brand-50 p-4 transition hover:bg-brand-100 active:scale-[0.99]"
          >
            <p className="text-xs font-semibold text-brand-700">今日の復習はありません</p>
            <p className="mt-1 text-[15px] font-semibold leading-snug text-gray-900">
              新しい語を覚えにいく
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
              はじめる
              <Icon
                name="arrow-right"
                className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        )}

        {/* 学習メニュー */}
        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">学習メニュー</h2>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            <MenuRow
              href="/glossary/study?mode=weak"
              icon="target"
              label="苦手だけ復習"
              meta={`${counts.weak}語`}
            />
            <MenuRow
              href="/glossary/study?mode=all"
              icon="book-open"
              label="すべてから学習"
              meta={`${TOTAL}語`}
            />
            <MenuRow
              href="/glossary/quiz?mode=all"
              icon="circle-check"
              label="4択で確認する"
              meta="4択"
            />
            <MenuRow
              href="/glossary/list"
              icon="list"
              label="単語一覧を見る"
              meta={`${TOTAL}語`}
            />
            <MenuRow
              href="/glossary/collection"
              icon="layers"
              label="図鑑でふりかえる"
              meta={`${counts.mastered}語 定着`}
            />
          </ul>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}

function MenuRow({
  href,
  icon,
  label,
  meta,
}: {
  href: string;
  icon: IconName;
  label: string;
  meta: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-gray-50 active:bg-gray-100"
      >
        <Icon name={icon} className="h-4 w-4 shrink-0 text-gray-500" />
        <span className="min-w-0 flex-1 text-sm font-semibold text-gray-900">
          {label}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-gray-500">{meta}</span>
        <Icon
          name="chevron-right"
          className="h-4 w-4 shrink-0 text-gray-500 transition group-hover:text-brand-600"
        />
      </Link>
    </li>
  );
}
