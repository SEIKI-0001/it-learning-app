"use client";

import { useEffect, useState } from "react";
import type { ChoiceKey } from "@/types";
import type { CheckQuestion } from "@/types/content";
import ChoiceButton from "@/components/ChoiceButton";

// トピック詳細の確認問題1問。クリックで回答し、正誤と解説を表示する。
// クエストの ChoiceButton をそのまま再利用して見た目・挙動をそろえる。
//
// 選択肢は表示時にシャッフルする（データ上は正解が先頭でも、画面では位置が変わる）。
// - 初期描画: トピックIDで決まる固定シャッフル（SSRとクライアントで一致＝ハイドレーション不整合を防ぐ。
//   かつ「正解が必ず先頭」にはならない）
// - マウント後: 毎回ランダムに再シャッフル（リロードごとに順序が変わる）

const KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

type ShuffledChoices = {
  choices: { key: ChoiceKey; text: string }[];
  correctChoice: ChoiceKey;
};

/** 文字列から決定的なシード値を作る（FNV-1a） */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** シード付き擬似乱数（mulberry32） */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 正解のテキストを保ったまま表示順をシャッフルし、キー(A〜D)を位置順に振り直す。
 * 振り直し後の正解キーも返す。
 */
function shuffleChoices(q: CheckQuestion, rnd: () => number): ShuffledChoices {
  const correctText = q.choices.find((c) => c.key === q.correctChoice)?.text;
  const texts = q.choices.map((c) => c.text);
  // Fisher-Yates
  for (let i = texts.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [texts[i], texts[j]] = [texts[j], texts[i]];
  }
  const choices = texts.map((text, i) => ({ key: KEYS[i], text }));
  const correctChoice =
    choices.find((c) => c.text === correctText)?.key ?? q.correctChoice;
  return { choices, correctChoice };
}

export default function CheckQuestionCard({
  q,
  number,
}: {
  q: CheckQuestion;
  number: number;
}) {
  // 初期はIDシードで決定的に（SSR一致）。
  const [shuffled, setShuffled] = useState<ShuffledChoices>(() =>
    shuffleChoices(q, mulberry32(hashSeed(q.id))),
  );
  const [selected, setSelected] = useState<ChoiceKey | null>(null);

  // マウント後にランダムで並べ直す（リロードごとに順序が変わる）。
  // クライアント限定の乱数で初期表示を更新する処理（外部ストアとの同期）。
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShuffled(shuffleChoices(q, Math.random.bind(Math)));
    setSelected(null);
  }, [q]);

  const revealed = selected !== null;
  const isCorrect = selected === shuffled.correctChoice;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3">
      <p className="mb-2 text-sm font-bold text-gray-800">
        Q{number}. {q.prompt}
      </p>

      <div className="space-y-1.5">
        {shuffled.choices.map((c) => (
          <ChoiceButton
            key={c.key}
            choiceKey={c.key}
            text={c.text}
            onClick={() => setSelected(c.key)}
            disabled={revealed}
            isSelected={selected === c.key}
            isCorrect={c.key === shuffled.correctChoice}
            revealed={revealed}
            dense
          />
        ))}
      </div>

      {revealed && (
        <div
          className={`animate-pop-in mt-2 rounded-2xl p-2.5 ${
            isCorrect ? "bg-green-50" : "bg-amber-50"
          }`}
        >
          <p
            className={`mb-1 text-sm font-extrabold ${
              isCorrect ? "text-green-700" : "text-amber-700"
            }`}
          >
            {isCorrect
              ? "🎉 正解！"
              : `🌱 正解は「${shuffled.correctChoice}」でした`}
          </p>
          <p className="text-sm leading-relaxed text-gray-700">
            {q.explanation}
          </p>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mt-2 text-xs font-bold text-indigo-600 underline underline-offset-2"
          >
            もう一度ためす
          </button>
        </div>
      )}
    </div>
  );
}
