"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WORDLIST_CATEGORY_LABELS, type WordlistEntry } from "@/types/wordlist";
import { getAllWords } from "@/lib/wordlist";
import {
  getWordProgressMap,
  getWeakIds,
  getDueIds,
  recordSelfRating,
  syncWordProgressFromDb,
  type SelfRating,
} from "@/lib/wordlistProgress";
import { CATEGORY_BADGE } from "@/components/wordlist/ui";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";

// 英略語のカード学習モード。
// 表＝略語を大きく表示＋「答えを見る」。裏＝正式名称/日本語/英単語分解/一言意味/
// 試験キーワード/似た語との違い。裏面表示後に「覚えた/あいまい/覚えていない」で自己評価し、
// localStorage(lib/wordlistProgress)へ保存する。
// 並び順は毎セッション・クライアント側でシャッフル（マウント後に確定＝SSR不整合を避ける）。

export type StudyMode = "today" | "weak" | "all";

const SESSION_SIZE = 8; // 1セッション 5〜10語程度

const EMPTY_HINT: Record<StudyMode, string> = {
  today: "今日の復習対象はありません。「すべてから学習」で新しい単語を覚えましょう。",
  weak: "苦手な単語はまだありません。学習や4択で間違えた単語がここに集まります。",
  all: "単語がありません。",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildPool(mode: StudyMode): WordlistEntry[] {
  const all = getAllWords();
  if (mode === "all") return all;
  const map = getWordProgressMap();
  const ids = new Set(
    mode === "weak"
      ? getWeakIds(all.map((e) => e.id), map)
      : getDueIds(all.map((e) => e.id), map),
  );
  return all.filter((e) => ids.has(e.id));
}

export default function FlashcardDeck({ mode }: { mode: StudyMode }) {
  const [mounted, setMounted] = useState(false);
  const [pool, setPool] = useState<WordlistEntry[]>([]);
  const [deck, setDeck] = useState<WordlistEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // このセッションでの自己評価（id -> rating）。
  const [results, setResults] = useState<Record<string, SelfRating>>({});

  // マウント後に進捗を読んでプール・出題を作る（SSR一致のため）。
  // 先に Supabase 同期を試み、today/weak 判定に DB の進捗を反映する。
  // 同期に失敗しても（未設定・直接アクセス含む）localStorage だけで従来どおり動く。
  useEffect(() => {
    let cancelled = false;
    async function init() {
      await syncWordProgressFromDb();
      if (cancelled) return;
      const p = buildPool(mode);
      setPool(p);
      setDeck(shuffle(p).slice(0, SESSION_SIZE));
      setMounted(true);
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  function startSession(list: WordlistEntry[]) {
    setDeck(shuffle(list).slice(0, SESSION_SIZE));
    setIndex(0);
    setFlipped(false);
    setResults({});
  }

  if (!mounted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500"
      >
        <span
          aria-hidden
          className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600 motion-reduce:animate-none"
        />
        読み込み中…
      </div>
    );
  }

  if (pool.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <Icon name="search" className="mx-auto h-6 w-6 text-gray-300" />
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          {EMPTY_HINT[mode]}
        </p>
        <Link
          href="/glossary"
          className={buttonClass("primary", "sm", "mt-5")}
        >
          単語帳トップへ
        </Link>
      </div>
    );
  }

  const total = deck.length;
  const done = index >= total;
  const current = deck[index];

  function rate(rating: SelfRating) {
    if (!current) return;
    recordSelfRating(current.id, rating);
    setResults((r) => ({ ...r, [current.id]: rating }));
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  if (done) {
    const remembered = Object.values(results).filter(
      (r) => r === "remembered",
    ).length;
    const vague = Object.values(results).filter((r) => r === "vague").length;
    const forgot = Object.values(results).filter((r) => r === "forgot").length;
    const retryIds = new Set(
      Object.entries(results)
        .filter(([, r]) => r !== "remembered")
        .map(([id]) => id),
    );
    const retryList = deck.filter((e) => retryIds.has(e.id));

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <Icon name="award" className="mx-auto h-6 w-6 text-emerald-600" />
        <p className="mt-2 text-base font-semibold text-gray-900">
          {total}枚 おつかれさま
        </p>
        <div className="mx-auto mt-4 grid max-w-xs grid-cols-3 divide-x divide-gray-200 border-y border-gray-200">
          <div className="py-3">
            <p className="text-2xl font-semibold tabular-nums text-emerald-700">
              {remembered}
            </p>
            <p className="mt-0.5 text-xs text-gray-600">覚えた</p>
          </div>
          <div className="py-3">
            <p className="text-2xl font-semibold tabular-nums text-accent-700">
              {vague}
            </p>
            <p className="mt-0.5 text-xs text-gray-600">あいまい</p>
          </div>
          <div className="py-3">
            <p className="text-2xl font-semibold tabular-nums text-rose-700">
              {forgot}
            </p>
            <p className="mt-0.5 text-xs text-gray-600">覚えてない</p>
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          {retryList.length > 0 && (
            <button
              type="button"
              onClick={() => startSession(retryList)}
              className={buttonClass("warn", "md", "w-full")}
            >
              あいまい・覚えてない {retryList.length}枚をもう一度
            </button>
          )}
          {pool.length > total && (
            <button
              type="button"
              onClick={() => startSession(pool)}
              className={buttonClass("primary", "md", "w-full")}
            >
              次の{Math.min(SESSION_SIZE, pool.length)}枚へ
            </button>
          )}
          <button
            type="button"
            onClick={() => startSession(deck)}
            className={buttonClass("secondary", "md", "w-full")}
          >
            同じ{total}枚をもう一度
          </button>
          <Link href="/glossary" className={buttonClass("secondary", "md", "w-full")}>
            単語帳トップへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 進捗バー */}
      <div className="mb-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${(index / total) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-gray-500">
          {index + 1} / {total}
        </span>
      </div>

      {!flipped ? (
        // 表面：略語を大きく＋「答えを見る」
        <div className="flex min-h-[18rem] flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-white px-6 py-12">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${CATEGORY_BADGE[current.category]}`}
          >
            {WORDLIST_CATEGORY_LABELS[current.category]}
          </span>
          <p className="text-center text-5xl font-bold tracking-wide text-gray-900">
            {current.acronym}
          </p>
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className={buttonClass("primary", "lg", "mt-2")}
          >
            答えを見る
          </button>
        </div>
      ) : (
        // 裏面：正式名称/日本語/英単語分解/一言意味/試験キーワード/似た語との違い
        <div className="space-y-3 rounded-xl border border-brand-200 bg-white px-5 py-5">
          <div>
            <p className="text-3xl font-bold text-gray-900">{current.acronym}</p>
            <p className="mt-1 text-base font-semibold text-brand-700">
              {current.fullName}
            </p>
            <p className="text-sm text-gray-700">{current.japanese}</p>
          </div>

          {/* 英単語分解 */}
          <div className="flex flex-wrap gap-1.5">
            {current.words.map((w, i) => (
              <span
                key={`${w.word}-${i}`}
                className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
              >
                <span className="font-bold text-gray-800">{w.word}</span>＝
                {w.meaning}
              </span>
            ))}
          </div>

          {/* 一言意味（このカードで唯一の強調ブロック） */}
          <div className="rounded-lg border border-brand-200 border-l-4 border-l-brand-500 bg-brand-50 p-3">
            <p className="text-xs font-semibold text-brand-700">一言でいうと</p>
            <p className="mt-0.5 text-[15px] font-semibold leading-snug text-gray-900">
              {current.oneLine}
            </p>
          </div>

          {/* 試験キーワード */}
          {current.examKeywords.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-600">試験キーワード</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {current.examKeywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 似た語との違い＝取り違えやすい注意ポイント */}
          {current.confusedWith.length > 0 && (
            <div className="rounded-lg border border-accent-200 bg-accent-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-800">
                <Icon name="alert" className="h-3.5 w-3.5" />
                似た語との違い：{current.differenceAxis}
              </p>
              <ul className="mt-1.5 space-y-1">
                {current.confusedWith.map((name) => (
                  <li key={name} className="text-xs leading-relaxed text-gray-700">
                    <span className="font-semibold text-accent-800">{name}</span>
                    {current.trapExplanations[name]
                      ? `：${current.trapExplanations[name]}`
                      : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 自己評価（裏面表示後のみ） */}
      {flipped ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => rate("forgot")}
            className="rounded-lg border border-rose-200 bg-rose-50 py-3.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-[0.98]"
          >
            覚えてない
          </button>
          <button
            type="button"
            onClick={() => rate("vague")}
            className="rounded-lg border border-accent-200 bg-accent-50 py-3.5 text-sm font-semibold text-accent-700 transition hover:bg-accent-100 active:scale-[0.98]"
          >
            あいまい
          </button>
          <button
            type="button"
            onClick={() => rate("remembered")}
            className="rounded-lg bg-emerald-600 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            覚えた
          </button>
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-gray-500">
          答えを思い出してから「答えを見る」を押そう
        </p>
      )}

      <p className="mt-3 text-center text-xs text-gray-400">
        くわしくは{" "}
        <Link
          href={`/glossary/${current.id}`}
          className="font-bold text-brand-500 underline underline-offset-2"
        >
          詳細ページ
        </Link>
      </p>
    </div>
  );
}
