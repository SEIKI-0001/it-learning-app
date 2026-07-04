"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { GlossaryTerm, TopicField } from "@/types/content";
import {
  setGlossaryStatus,
  type GlossaryStatus,
} from "@/lib/glossaryProgress";

// 単語帳のフラッシュカード学習モード。
// 表＝用語名、タップで裏返すと意味・たとえ・試験ポイント・間違えやすい用語が出る。
// 1枚ごとに「覚えた / まだ」で仕分けし、ローカルに保存する（lib/glossaryProgress）。
// 並び順は毎セッション・クライアント側でシャッフルする（マウント後に確定＝SSR不整合を避ける）。

type FilterKey = "all" | TopicField;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "technology", label: "テクノロジ" },
  { key: "management", label: "マネジメント" },
  { key: "strategy", label: "ストラテジ" },
];

const FIELD_BADGE: Record<TopicField, string> = {
  technology: "bg-sky-100 text-sky-700",
  management: "bg-amber-100 text-amber-700",
  strategy: "bg-violet-100 text-violet-700",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardDeck({ terms }: { terms: GlossaryTerm[] }) {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  // セッション（出題の並び）。filter 変更や「もう一度」で作り直す。
  const [deck, setDeck] = useState<GlossaryTerm[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // このセッションでの仕分け結果（id -> 覚えた/まだ）。
  const [results, setResults] = useState<Record<string, GlossaryStatus>>({});

  const pool = useMemo(
    () => (filter === "all" ? terms : terms.filter((t) => t.field === filter)),
    [terms, filter],
  );

  // マウント後にシャッフルして最初のセッションを作る（SSR一致のため）。
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  function startSession(list: GlossaryTerm[]) {
    setDeck(shuffle(list));
    setIndex(0);
    setFlipped(false);
    setResults({});
  }

  // filter が変わったら出題し直す。
  useEffect(() => {
    if (!mounted) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startSession(pool);
  }, [mounted, pool]);

  if (!mounted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-3 rounded-3xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400"
      >
        <span
          aria-hidden
          className="h-7 w-7 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600 motion-reduce:animate-none"
        />
        読み込み中…
      </div>
    );
  }

  const total = deck.length;
  const done = index >= total;
  const current = deck[index];

  function mark(status: GlossaryStatus) {
    if (!current) return;
    setGlossaryStatus(current.id, status);
    setResults((r) => ({ ...r, [current.id]: status }));
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  const knownCount = Object.values(results).filter((s) => s === "known").length;
  const learningCount = total - knownCount;

  return (
    <div>
      {/* 分野フィルタ */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition active:scale-[0.97] ${
                active
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-500 ring-1 ring-gray-200"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {total === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
          この分野の用語はまだありません。
        </div>
      ) : done ? (
        <SessionSummary
          total={total}
          knownCount={knownCount}
          learningCount={learningCount}
          onRetry={() => startSession(pool)}
          onReviewLearning={() => {
            const stillLearning = deck.filter(
              (t) => results[t.id] === "learning",
            );
            if (stillLearning.length > 0) startSession(stillLearning);
          }}
          canReviewLearning={learningCount > 0}
        />
      ) : (
        <div>
          {/* 進捗バー */}
          <div className="mb-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${(index / total) * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-bold text-gray-400">
              {index + 1} / {total}
            </span>
          </div>

          {/* カード本体（タップで裏返す） */}
          <button
            type="button"
            onClick={() => setFlipped((v) => !v)}
            className="block w-full text-left"
          >
            {!flipped ? (
              <div className="flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-3xl border border-gray-200 bg-white px-6 py-10 shadow-sm">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    current.field ? FIELD_BADGE[current.field] : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {current.category}
                </span>
                <p className="text-center text-3xl font-extrabold text-gray-900">
                  {current.term}
                </p>
                {current.reading && (
                  <p className="text-sm text-gray-400">{current.reading}</p>
                )}
                <p className="mt-2 text-xs font-medium text-indigo-400">
                  タップで答えを見る
                </p>
              </div>
            ) : (
              <div className="min-h-[15rem] space-y-3 rounded-3xl border border-indigo-200 bg-indigo-50/40 px-5 py-6 shadow-sm">
                <p className="text-base font-extrabold text-gray-900">
                  {current.term}
                </p>
                <p className="text-lg font-bold leading-snug text-indigo-700">
                  {current.oneLine}
                </p>
                <p className="text-sm leading-relaxed text-gray-700">
                  {current.beginnerExplanation}
                </p>
                <div className="rounded-2xl bg-white/70 p-3">
                  <p className="text-xs font-bold text-gray-500">たとえると</p>
                  <p className="mt-0.5 text-sm text-gray-700">
                    {current.analogy}
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3">
                  <p className="text-xs font-bold text-amber-700">
                    試験ポイント
                  </p>
                  <p className="mt-0.5 text-sm text-gray-700">
                    {current.examPoint}
                  </p>
                </div>
                {current.confusedWith.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-rose-500">
                      間違えやすい：
                    </span>
                    {current.confusedWith.map((w) => (
                      <span
                        key={w}
                        className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </button>

          {/* 仕分けボタン */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => mark("learning")}
              className="rounded-2xl bg-amber-100 py-3.5 text-sm font-extrabold text-amber-700 transition active:scale-[0.98]"
            >
              🔁 まだ
            </button>
            <button
              type="button"
              onClick={() => mark("known")}
              className="rounded-2xl bg-green-500 py-3.5 text-sm font-extrabold text-white transition active:scale-[0.98]"
            >
              ✓ 覚えた
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-gray-400">
            くわしい解説と確認問題は{" "}
            <Link
              href={`/glossary/${current.id}`}
              className="font-bold text-indigo-500 underline underline-offset-2"
            >
              用語ページ
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

function SessionSummary({
  total,
  knownCount,
  learningCount,
  onRetry,
  onReviewLearning,
  canReviewLearning,
}: {
  total: number;
  knownCount: number;
  learningCount: number;
  onRetry: () => void;
  onReviewLearning: () => void;
  canReviewLearning: boolean;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm">
      <p className="text-4xl">🎉</p>
      <p className="mt-2 text-lg font-extrabold text-gray-900">
        {total}枚 おつかれさま！
      </p>
      <div className="mx-auto mt-4 flex max-w-xs justify-center gap-3">
        <div className="flex-1 rounded-2xl bg-green-50 py-3">
          <p className="text-2xl font-extrabold text-green-600">{knownCount}</p>
          <p className="text-xs font-bold text-green-700">覚えた</p>
        </div>
        <div className="flex-1 rounded-2xl bg-amber-50 py-3">
          <p className="text-2xl font-extrabold text-amber-600">
            {learningCount}
          </p>
          <p className="text-xs font-bold text-amber-700">まだ</p>
        </div>
      </div>

      <div className="mt-6 space-y-2.5">
        {canReviewLearning && (
          <button
            type="button"
            onClick={onReviewLearning}
            className="w-full rounded-2xl bg-amber-500 py-3 text-sm font-extrabold text-white transition active:scale-[0.98]"
          >
            「まだ」の{learningCount}枚をもう一度
          </button>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-extrabold text-white transition active:scale-[0.98]"
        >
          最初からやり直す
        </button>
        <Link
          href="/glossary"
          className="block w-full rounded-2xl bg-gray-100 py-3 text-sm font-extrabold text-gray-600 transition active:scale-[0.98]"
        >
          一覧にもどる
        </Link>
      </div>
    </div>
  );
}
