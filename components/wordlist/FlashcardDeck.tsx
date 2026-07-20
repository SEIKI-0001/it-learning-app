"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WordlistEntry } from "@/types/wordlist";
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
        className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400"
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
        <p className="text-4xl">📭</p>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          {EMPTY_HINT[mode]}
        </p>
        <Link
          href="/glossary"
          className="mt-5 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white"
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
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-4xl">🎉</p>
        <p className="mt-2 text-lg font-bold text-gray-900">
          {total}枚 おつかれさま！
        </p>
        <div className="mx-auto mt-4 grid max-w-xs grid-cols-3 gap-2">
          <div className="rounded-xl bg-green-50 py-3">
            <p className="text-2xl font-bold text-green-600">{remembered}</p>
            <p className="text-xs font-bold text-green-700">覚えた</p>
          </div>
          <div className="rounded-xl bg-amber-50 py-3">
            <p className="text-2xl font-bold text-amber-600">{vague}</p>
            <p className="text-xs font-bold text-amber-700">あいまい</p>
          </div>
          <div className="rounded-xl bg-rose-50 py-3">
            <p className="text-2xl font-bold text-rose-600">{forgot}</p>
            <p className="text-xs font-bold text-rose-700">覚えてない</p>
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          {retryList.length > 0 && (
            <button
              type="button"
              onClick={() => startSession(retryList)}
              className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white transition active:scale-[0.98]"
            >
              あいまい・覚えてない {retryList.length}枚をもう一度
            </button>
          )}
          {pool.length > total && (
            <button
              type="button"
              onClick={() => startSession(pool)}
              className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition active:scale-[0.98]"
            >
              次の{Math.min(SESSION_SIZE, pool.length)}枚へ
            </button>
          )}
          <button
            type="button"
            onClick={() => startSession(deck)}
            className="w-full rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-600 transition active:scale-[0.98]"
          >
            同じ{total}枚をもう一度
          </button>
          <Link
            href="/glossary"
            className="block w-full rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-600 transition active:scale-[0.98]"
          >
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
        <span className="shrink-0 text-xs font-bold text-gray-400">
          {index + 1} / {total}
        </span>
      </div>

      {!flipped ? (
        // 表面：略語を大きく＋「答えを見る」
        <div className="flex min-h-[18rem] flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-white px-6 py-12 shadow-sm">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${CATEGORY_BADGE[current.category]}`}
          >
            {current.acronym}
          </span>
          <p className="text-center text-5xl font-black tracking-wide text-gray-900">
            {current.acronym}
          </p>
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="mt-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            答えを見る ▶
          </button>
        </div>
      ) : (
        // 裏面：正式名称/日本語/英単語分解/一言意味/試験キーワード/似た語との違い
        <div className="space-y-3 rounded-xl border border-brand-200 bg-white px-5 py-5 shadow-sm">
          <div>
            <p className="text-3xl font-black text-gray-900">{current.acronym}</p>
            <p className="mt-1 text-base font-bold text-brand-700">
              {current.fullName}
            </p>
            <p className="text-sm font-bold text-gray-700">{current.japanese}</p>
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

          {/* 一言意味（目立たせる） */}
          <div className="rounded-xl bg-brand-50 p-3">
            <p className="text-xs font-bold text-brand-500">一言でいうと</p>
            <p className="mt-0.5 text-base font-bold leading-snug text-brand-800">
              {current.oneLine}
            </p>
          </div>

          {/* 試験キーワード */}
          {current.examKeywords.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-600">試験キーワード</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {current.examKeywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 似た語との違い */}
          {current.confusedWith.length > 0 && (
            <div className="rounded-xl bg-rose-50 p-3">
              <p className="text-xs font-bold text-rose-600">
                似た語との違い：{current.differenceAxis}
              </p>
              <ul className="mt-1.5 space-y-1">
                {current.confusedWith.map((name) => (
                  <li key={name} className="text-xs leading-relaxed text-gray-700">
                    <span className="font-bold text-rose-600">{name}</span>
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
            className="rounded-xl bg-rose-100 py-3.5 text-sm font-bold text-rose-700 transition active:scale-[0.98]"
          >
            覚えてない
          </button>
          <button
            type="button"
            onClick={() => rate("vague")}
            className="rounded-xl bg-amber-100 py-3.5 text-sm font-bold text-amber-700 transition active:scale-[0.98]"
          >
            あいまい
          </button>
          <button
            type="button"
            onClick={() => rate("remembered")}
            className="rounded-xl bg-green-500 py-3.5 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            覚えた
          </button>
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-gray-400">
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
