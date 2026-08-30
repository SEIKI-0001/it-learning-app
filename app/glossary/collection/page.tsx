"use client";

// 単語帳図鑑（GF-P1-008）。
//
// 既存の wordlist progress を読み、カテゴリ別グリッドとコンプ率を出すだけ。
// 新しい進捗も報酬も作らず、コンプ率は学習評価へ渡さない。
// 未学習語も略語を伏せずに並べ、図鑑化で教材としての検索性を落とさない。

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  buildGlossaryCollection,
  collectionCompletionPct,
  WORD_STATUS_LABELS,
  type CollectionCategory,
} from "@/lib/glossaryCollection";
import {
  getWordProgressMap,
  subscribeWordProgress,
  type WordStatus,
} from "@/lib/wordlistProgress";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/ui/PageHeader";
import Icon, { type IconName } from "@/components/ui/Icon";

/** 状態は色だけでなくアイコン形状でも区別する（色覚に依存させない）。 */
const STATUS_ICONS: Record<WordStatus, IconName> = {
  mastered: "circle-check",
  weak: "alert",
  learning: "circle-dot",
  new: "circle",
};

const STATUS_CLASS: Record<WordStatus, string> = {
  mastered: "border-emerald-200 bg-emerald-50 text-emerald-800",
  weak: "border-accent-200 bg-accent-50 text-accent-800",
  learning: "border-brand-200 bg-brand-50 text-brand-800",
  new: "border-gray-200 bg-white text-gray-600",
};

export default function GlossaryCollectionPage() {
  const [categories, setCategories] = useState<CollectionCategory[]>([]);

  useEffect(() => {
    const load = () => setCategories(buildGlossaryCollection(getWordProgressMap()));
    load();
    return subscribeWordProgress(load);
  }, []);

  const overallPct = collectionCompletionPct(categories);

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/glossary", label: "単語帳へ" }}
        title="英略語 図鑑"
        description="カテゴリごとに、覚えた語と これからの語 を一覧します。"
      >
        <dl className="mt-4 border-y border-gray-200 py-3">
          <dt className="text-xs text-gray-600">定着ずみ</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
            {overallPct}
            <span className="ml-0.5 text-sm font-normal text-gray-500">%</span>
          </dd>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-label="図鑑の定着率"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overallPct}
          >
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${overallPct}%` }} />
          </div>
        </dl>
      </PageHeader>

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        {categories.map((category) => (
          <section key={category.category} aria-labelledby={`category-${category.category}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id={`category-${category.category}`}
                className="text-base font-semibold text-gray-900"
              >
                {category.label}
              </h2>
              <p className="shrink-0 text-xs tabular-nums text-gray-600">
                定着 {category.masteredCount}/{category.total}・{category.completionPct}%
              </p>
            </div>

            <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {category.entries.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={`/glossary/${entry.id}`}
                    className={`flex h-full items-start gap-1.5 rounded-lg border px-2.5 py-2 transition hover:border-brand-300 ${
                      STATUS_CLASS[entry.status]
                    }`}
                  >
                    <Icon name={STATUS_ICONS[entry.status]} className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{entry.acronym}</span>
                      <span className="mt-0.5 block truncate text-[11px] opacity-80">
                        {entry.japanese}
                      </span>
                      <span className="sr-only">{WORD_STATUS_LABELS[entry.status]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="text-center text-xs leading-relaxed text-gray-500">
          図鑑は覚えた語の記録です。ここでの達成が合格準備度やバッジを直接動かすことはありません。
        </p>
      </div>

      <BottomNav />
    </main>
  );
}
