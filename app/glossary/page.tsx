"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GlossaryTerm, TopicField } from "@/types/content";
import { FIELD_LABELS } from "@/types/content";
import { getAllGlossaryTerms } from "@/lib/content";
import {
  getGlossaryStatuses,
  subscribeGlossaryProgress,
  countKnown,
  type GlossaryStatusMap,
} from "@/lib/glossaryProgress";
import BottomNav from "@/components/BottomNav";

// 単語帳のハブ画面。上部に「カードで覚える」導線、下に全用語を分野別に一覧。
// 「覚えた」状態はローカル(localStorage)から読み、バッジで表示する。

const FIELD_ORDER: TopicField[] = ["technology", "management", "strategy"];

const FIELD_BADGE: Record<TopicField, string> = {
  technology: "bg-sky-100 text-sky-700",
  management: "bg-amber-100 text-amber-700",
  strategy: "bg-violet-100 text-violet-700",
};

export default function GlossaryPage() {
  const terms = getAllGlossaryTerms();
  const [statuses, setStatuses] = useState<GlossaryStatusMap>({});

  // ローカル保存はクライアントでのみ読む（SSRでは空＝未操作扱い）。
  useEffect(() => {
    const load = () => setStatuses(getGlossaryStatuses());
    load();
    return subscribeGlossaryProgress(load);
  }, []);

  const known = countKnown(statuses);
  const total = terms.length;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-6 text-white">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-extrabold">📇 単語帳</h1>
          <p className="mt-1 text-sm text-white/90">
            ITパスポートの頻出用語{total}語を、カードでサクッと覚えよう。
          </p>

          <Link
            href="/glossary/study"
            className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 text-indigo-700 shadow-sm transition active:scale-[0.99]"
          >
            <span className="text-base font-extrabold">カードで覚える ▶</span>
            <span className="text-xs font-bold text-indigo-400">
              覚えた {known}/{total}
            </span>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-8 px-4 py-7">
        {FIELD_ORDER.map((field) => {
          const list = terms.filter((t) => t.field === field);
          if (list.length === 0) return null;
          return (
            <section key={field}>
              <h2 className="mb-3 text-lg font-extrabold text-gray-800">
                {FIELD_LABELS[field]}
              </h2>
              <ul className="space-y-2">
                {list.map((t) => (
                  <GlossaryRow
                    key={t.id}
                    term={t}
                    isKnown={statuses[t.id] === "known"}
                    fieldBadge={FIELD_BADGE[field]}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <BottomNav />
    </main>
  );
}

function GlossaryRow({
  term,
  isKnown,
  fieldBadge,
}: {
  term: GlossaryTerm;
  isKnown: boolean;
  fieldBadge: string;
}) {
  return (
    <li>
      <Link
        href={`/glossary/${term.id}`}
        className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 transition active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-bold text-gray-800">
              {term.term}
            </p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${fieldBadge}`}
            >
              {term.category}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-gray-500">
            {term.oneLine}
          </p>
        </div>
        {isKnown && (
          <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
            ✓ 覚えた
          </span>
        )}
      </Link>
    </li>
  );
}
