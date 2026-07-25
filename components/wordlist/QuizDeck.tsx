"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ChoiceKey } from "@/types";
import {
  buildQuizSession,
  getAllWords,
  type QuizQuestion,
} from "@/lib/wordlist";
import {
  getWordProgressMap,
  getWeakIds,
  getDueIds,
  recordQuizResult,
  syncWordProgressFromDb,
} from "@/lib/wordlistProgress";
import ChoiceButton from "@/components/ChoiceButton";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";

// 英略語の4択確認モード。
// 略語→意味 / 意味→略語 / 英単語パーツ / 混同語比較 の4形式を wordlist から生成する。
// 正誤を localStorage(lib/wordlistProgress)に記録し、解説には oneLine/examKeywords/
// differenceAxis/trapExplanations を使う（生成は lib/wordlist 側）。
// 出題はクライアントでマウント後に生成する（SSR不整合を避ける）。

export type QuizMode = "all" | "weak" | "today";

const SESSION_SIZE = 8;

const TYPE_LABEL: Record<QuizQuestion["type"], string> = {
  acronym_to_meaning: "略語 → 意味",
  meaning_to_acronym: "意味 → 略語",
  word_part: "英単語パーツ",
  confusion: "混同語の見分け",
};

const EMPTY_HINT: Record<QuizMode, string> = {
  today: "今日の復習対象はありません。「すべてから学習」で単語を増やしましょう。",
  weak: "苦手な単語はまだありません。",
  all: "単語がありません。",
};

function buildPool() {
  const all = getAllWords();
  const map = getWordProgressMap();
  const ids = all.map((e) => e.id);
  return {
    all,
    weakSet: new Set(getWeakIds(ids, map)),
    dueSet: new Set(getDueIds(ids, map)),
  };
}

export default function QuizDeck({ mode }: { mode: QuizMode }) {
  const [mounted, setMounted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<ChoiceKey | null>(null);
  // id -> 正誤（このセッションでの結果）。
  const [results, setResults] = useState<Record<string, boolean>>({});

  function buildQuestions(): QuizQuestion[] {
    const { all, weakSet, dueSet } = buildPool();
    let pool;
    if (mode === "weak") {
      pool = all.filter((e) => weakSet.has(e.id));
    } else if (mode === "today") {
      pool = all.filter((e) => dueSet.has(e.id));
    } else {
      // all: 苦手・今日の復習を優先して前に並べ、残りを後ろに。
      const priority = all.filter((e) => weakSet.has(e.id) || dueSet.has(e.id));
      const rest = all.filter((e) => !weakSet.has(e.id) && !dueSet.has(e.id));
      // それぞれ軽くシャッフルしてから連結。
      pool = [...shuffle(priority), ...shuffle(rest)];
    }
    if (mode !== "all") pool = shuffle(pool);
    return buildQuizSession(pool, SESSION_SIZE);
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      // 先に Supabase 同期を試みてから出題を生成（weak/today に DB 進捗を反映）。
      // 失敗しても localStorage だけで従来どおり動く。
      await syncWordProgressFromDb();
      if (cancelled) return;
      setQuestions(buildQuestions());
      setMounted(true);
    }
    void init();
    return () => {
      cancelled = true;
    };
    // mode は固定（ページ遷移で再マウント）。初回のみ生成。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function restart() {
    setQuestions(buildQuestions());
    setIndex(0);
    setSelected(null);
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

  if (questions.length === 0) {
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

  const total = questions.length;
  const done = index >= total;

  if (done) {
    const correct = Object.values(results).filter(Boolean).length;
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <Icon name="circle-check" className="mx-auto h-6 w-6 text-emerald-600" />
        <p className="mt-2 text-base font-semibold text-gray-900">
          {total}問 おつかれさま
        </p>
        <p className="mt-3 text-3xl font-semibold tabular-nums text-gray-900">
          {correct}
          <span className="ml-0.5 text-base font-normal text-gray-500">
            {" "}/ {total} 正解
          </span>
        </p>
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={restart}
            className={buttonClass("primary", "md", "w-full")}
          >
            もう一度
          </button>
          <Link href="/glossary" className={buttonClass("secondary", "md", "w-full")}>
            単語帳トップへ
          </Link>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const revealed = selected !== null;
  const isCorrect = selected === q.correctKey;

  function answer(key: ChoiceKey) {
    if (selected !== null) return;
    setSelected(key);
    // 1問につき1回だけ記録する。
    if (!(q.entryId in results)) {
      const correct = key === q.correctKey;
      recordQuizResult(q.entryId, correct);
      setResults((r) => ({ ...r, [q.entryId]: correct }));
    }
  }

  function next() {
    setSelected(null);
    setIndex((i) => i + 1);
  }

  return (
    <div>
      {/* 進捗バー */}
      <div className="mb-2 flex items-center gap-3">
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

      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <span className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
          {TYPE_LABEL[q.type]}
        </span>
        <p className="mt-1.5 whitespace-pre-line text-base font-semibold leading-snug text-gray-900">
          {q.prompt}
        </p>

        <div className="mt-2.5 space-y-2">
          {q.choices.map((c) => (
            <ChoiceButton
              key={c.key}
              choiceKey={c.key}
              text={c.text}
              onClick={() => answer(c.key)}
              disabled={revealed}
              isSelected={selected === c.key}
              isCorrect={c.key === q.correctKey}
              revealed={revealed}
              dense
            />
          ))}
        </div>

        {revealed && (
          <div
            className={`animate-pop-in mt-3 rounded-lg border p-3 ${
              isCorrect
                ? "border-emerald-200 bg-emerald-50"
                : "border-rose-200 bg-rose-50"
            }`}
          >
            <p
              className={`mb-1 flex items-center gap-1.5 text-sm font-semibold ${
                isCorrect ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              <Icon
                name={isCorrect ? "circle-check" : "x"}
                className="h-4 w-4 shrink-0"
              />
              {isCorrect ? "正解" : `正解は「${q.correctKey}」でした`}
            </p>
            <p className="text-sm leading-relaxed text-gray-700">
              {q.explanation}
            </p>
            <button
              type="button"
              onClick={next}
              className={buttonClass("primary", "md", "mt-3 w-full")}
            >
              {index + 1 >= total ? "結果を見る" : "次の問題"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
