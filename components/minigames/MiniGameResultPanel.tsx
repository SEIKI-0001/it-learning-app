"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { MiniGame, MiniGameResult } from "@/types/minigame";
import { saveMiniGameResult } from "@/lib/minigameProgress";

// ミニゲーム共通の結果画面。
// スコア → 間違えたところ → 試験で問われやすいポイント → もう一度／次の学習へ。
// 表示時にローカル保存も行う（DB保存は将来 onComplete 経由で差し替え可能）。

export default function MiniGameResultPanel({
  meta,
  result,
  onReplay,
}: {
  meta: MiniGame;
  result: MiniGameResult;
  onReplay: () => void;
}) {
  // 結果はマウント時に1度だけ保存する。
  useEffect(() => {
    saveMiniGameResult(result);
    // result はこの画面に入った時点で確定しているため依存に含めない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const perfect = result.score >= result.maxScore;
  const ratio = result.maxScore > 0 ? result.score / result.maxScore : 0;
  const praise = perfect
    ? "全問クリア！バッチリです🎉"
    : ratio >= 0.5
      ? "あと少し！解説で復習しよう"
      : "ここからが伸びどころ。もう一度ためそう";

  const nextHref = meta.relatedTopicId
    ? `/topics/${meta.relatedTopicId}`
    : "/topics";

  return (
    <div className="space-y-5">
      <div
        className={`rounded-2xl p-5 text-center ${
          perfect ? "bg-green-50" : "bg-indigo-50"
        }`}
      >
        <p className="text-sm font-bold text-gray-500">スコア</p>
        <p
          className={`mt-1 text-4xl font-extrabold ${
            perfect ? "text-green-600" : "text-indigo-600"
          }`}
        >
          {result.score}
          <span className="text-xl text-gray-400"> / {result.maxScore}</span>
        </p>
        <p className="mt-2 text-sm font-bold text-gray-700">{praise}</p>
      </div>

      {result.mistakes.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-extrabold text-amber-700">
            🌱 まちがえたところ
          </p>
          <ul className="space-y-1.5">
            {result.mistakes.map((m, i) => (
              <li key={i} className="text-sm leading-relaxed text-amber-800">
                ・{m}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm font-extrabold text-gray-800">
          🎯 試験で問われやすいポイント
        </p>
        <ul className="space-y-1.5">
          {meta.examPoints.map((p, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm leading-relaxed text-gray-700"
            >
              <span aria-hidden className="text-indigo-500">
                ✓
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onReplay}
          className="w-full rounded-2xl border-2 border-indigo-200 bg-white px-6 py-3.5 text-base font-extrabold text-indigo-600 transition active:scale-[0.98]"
        >
          🔄 もう一度プレイ
        </button>
        <Link
          href={nextHref}
          className="block w-full rounded-2xl bg-indigo-600 px-6 py-3.5 text-center text-base font-extrabold text-white shadow-lg transition active:scale-[0.98]"
        >
          📖 次の学習へ進む
        </Link>
        <Link
          href="/minigames"
          className="block w-full px-6 py-2 text-center text-sm font-bold text-gray-400"
        >
          ← ミニゲーム一覧へ戻る
        </Link>
      </div>
    </div>
  );
}
