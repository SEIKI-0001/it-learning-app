"use client";

import { useEffect, useState } from "react";
import type {
  MiniGame,
  MiniGameResult,
  NetworkRouteContent,
  NetworkStep,
} from "@/types/minigame";
import MiniGameResultPanel from "./MiniGameResultPanel";

// 通信ルートをつなげ: カードを上下ボタンで並べ替え、正しい順番を作る。
// ドラッグは使わず、スマホで押しやすい上下ボタン＋判定ボタンで操作する。

/** SSRと一致させるための決定的な初期順（正解と必ず違う＝逆順）。 */
function reversed(steps: NetworkStep[]): NetworkStep[] {
  return [...steps].reverse();
}

/** マウント後に正解と違う順番へシャッフルする。 */
function shuffle(steps: NetworkStep[]): NetworkStep[] {
  const order = [...steps];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const sameAsCorrect = order.every((s, i) => s.id === steps[i].id);
  return sameAsCorrect ? reversed(steps) : order;
}

export default function NetworkRouteGame({
  meta,
  content,
}: {
  meta: MiniGame;
  content: NetworkRouteContent;
}) {
  const correct = content.steps;
  const [order, setOrder] = useState<NetworkStep[]>(() => reversed(correct));
  const [judged, setJudged] = useState(false);
  const [firstResult, setFirstResult] = useState<{
    score: number;
    mistakes: string[];
  } | null>(null);
  const [finished, setFinished] = useState(false);

  // マウント後にシャッフル（SSRハイドレーション不一致を避けるため初期は決定的）。
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrder(shuffle(correct));
  }, [correct]);

  const correctById = (i: number, s: NetworkStep) => correct[i].id === s.id;
  const allCorrect = order.every((s, i) => correctById(i, s));

  function move(from: number, dir: -1 | 1) {
    if (judged) return; // 判定後は再判定するまで固定
    const to = from + dir;
    if (to < 0 || to >= order.length) return;
    setOrder((prev) => {
      const copy = [...prev];
      [copy[from], copy[to]] = [copy[to], copy[from]];
      return copy;
    });
  }

  function judge() {
    setJudged(true);
    if (firstResult === null) {
      const score = order.filter((s, i) => correctById(i, s)).length;
      const mistakes = order
        .filter((s, i) => !correctById(i, s))
        .map((s) => s.label);
      setFirstResult({ score, mistakes });
    }
  }

  function retry() {
    // 並べ替えを続ける（マークを消して編集可能に戻す）。
    setJudged(false);
  }

  function replay() {
    setOrder(shuffle(correct));
    setJudged(false);
    setFirstResult(null);
    setFinished(false);
  }

  if (finished && firstResult) {
    const result: MiniGameResult = {
      miniGameId: meta.id,
      score: firstResult.score,
      maxScore: correct.length,
      completed: true,
      mistakes: firstResult.mistakes,
      completedAt: new Date().toISOString(),
    };
    return <MiniGameResultPanel meta={meta} result={result} onReplay={replay} />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-indigo-50 p-4">
        <p className="text-xs font-bold text-indigo-500">ミッション</p>
        <p className="mt-1 text-base font-extrabold leading-snug text-gray-800">
          URLを入れてからページが表示されるまでを、正しい順に並べよう
        </p>
      </div>

      <ul className="space-y-2.5">
        {order.map((s, i) => {
          const ok = correctById(i, s);
          let tone = "border-gray-200 bg-white";
          if (judged) {
            tone = ok
              ? "border-green-300 bg-green-50"
              : "border-rose-300 bg-rose-50";
          }
          return (
            <li
              key={s.id}
              className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-3 transition ${tone}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-bold leading-snug text-gray-800">
                {s.label}
                {judged && (
                  <span aria-hidden className="ml-1">
                    {ok ? "✅" : "🔁"}
                  </span>
                )}
              </span>
              {!judged && (
                <span className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="ひとつ上へ"
                    className="flex h-7 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition active:scale-95 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === order.length - 1}
                    aria-label="ひとつ下へ"
                    className="flex h-7 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition active:scale-95 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {!judged ? (
        <button
          type="button"
          onClick={judge}
          className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98]"
        >
          この順番で判定する
        </button>
      ) : allCorrect ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-green-50 p-4">
            <p className="text-sm font-extrabold text-green-700">
              🎉 正解！全部つながった
            </p>
            <ul className="mt-3 space-y-2">
              {correct.map((s, i) => (
                <li key={s.id} className="text-sm leading-relaxed text-gray-700">
                  <span className="font-bold text-gray-800">
                    {i + 1}. {s.label}
                  </span>
                  <br />
                  <span className="text-gray-600">{s.detail}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 rounded-xl bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-gray-700">
              {content.summary}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFinished(true)}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98]"
          >
            結果を見る
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-extrabold text-amber-700">🌱 もう少し！</p>
            <p className="mt-1 leading-relaxed">
              🔁 がついたカードがずれています。緑(✅)はそのまま、🔁を動かして並べ直そう。
            </p>
          </div>
          <button
            type="button"
            onClick={retry}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98]"
          >
            並べ直す
          </button>
        </div>
      )}
    </div>
  );
}
