"use client";

import { useState } from "react";
import type { MiniGame, MiniGameResult, SqlTreasureContent } from "@/types/minigame";
import MiniGameResultPanel from "./MiniGameResultPanel";

// SQL宝探し: 条件に合う行をタップで選び、判定する。1ラウンドずつ進める。
// ドラッグ不要・タップのみ。スマホで横スクロールしすぎないよう列は最小限。

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((x) => setB.has(x));
}

export default function SqlTreasureGame({
  meta,
  content,
}: {
  meta: MiniGame;
  content: SqlTreasureContent;
}) {
  const { rounds } = content;
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [judged, setJudged] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  const round = rounds[roundIndex];
  const isCorrect = judged && sameSet(selected, round.correctRowIds);

  function toggle(id: number) {
    if (judged) return;
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }

  function judge() {
    if (judged) return;
    const ok = sameSet(selected, round.correctRowIds);
    setJudged(true);
    if (ok) {
      setCorrectCount((c) => c + 1);
    } else {
      setMistakes((m) => [...m, round.mission]);
    }
  }

  function next() {
    if (roundIndex + 1 >= rounds.length) {
      setFinished(true);
      return;
    }
    setRoundIndex((i) => i + 1);
    setSelected([]);
    setJudged(false);
  }

  function replay() {
    setRoundIndex(0);
    setSelected([]);
    setJudged(false);
    setCorrectCount(0);
    setMistakes([]);
    setFinished(false);
  }

  if (finished) {
    const result: MiniGameResult = {
      miniGameId: meta.id,
      score: correctCount,
      maxScore: rounds.length,
      completed: true,
      mistakes,
      completedAt: new Date().toISOString(),
    };
    return <MiniGameResultPanel meta={meta} result={result} onReplay={replay} />;
  }

  // 不正解時のヒント: 見落とし（足りない）／選びすぎ（条件に合わない）を出し分ける。
  const missed = round.correctRowIds.filter((id) => !selected.includes(id));
  const extra = selected.filter((id) => !round.correctRowIds.includes(id));

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold text-gray-400">
        問題 {roundIndex + 1} / {rounds.length}
      </p>

      {/* 今日のミッション */}
      <div className="rounded-2xl bg-indigo-50 p-4">
        <p className="text-xs font-bold text-indigo-500">ミッション</p>
        <p className="mt-1 text-base font-extrabold leading-snug text-gray-800">
          {round.mission}
        </p>
      </div>

      {/* テーブル（行タップで選択） */}
      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="w-8 px-1 py-2" aria-label="選択" />
              {round.table.columns.map((c) => (
                <th key={c.key} className="px-2 py-2 text-left font-bold">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {round.table.rows.map((r) => {
              const isSel = selected.includes(r.id);
              const isAns = round.correctRowIds.includes(r.id);
              let rowTone = "bg-white";
              if (judged) {
                if (isAns) rowTone = "bg-green-50";
                else if (isSel) rowTone = "bg-rose-50";
              } else if (isSel) {
                rowTone = "bg-indigo-50";
              }
              return (
                <tr
                  key={r.id}
                  onClick={() => toggle(r.id)}
                  className={`cursor-pointer border-t border-gray-100 transition ${rowTone} ${
                    judged ? "cursor-default" : "active:bg-indigo-100"
                  }`}
                >
                  <td className="px-1 py-2.5 text-center">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                        isSel
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-gray-300 text-transparent"
                      }`}
                      aria-hidden
                    >
                      ✓
                    </span>
                  </td>
                  {r.values.map((v, i) => (
                    <td key={i} className="px-2 py-2.5 font-medium text-gray-800">
                      {v}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!judged ? (
        <button
          type="button"
          onClick={judge}
          disabled={selected.length === 0}
          className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98] disabled:bg-gray-300"
        >
          {selected.length === 0 ? "行をタップして選ぼう" : "この行で判定する"}
        </button>
      ) : (
        <div className="space-y-4">
          <div
            className={`rounded-2xl p-4 ${
              isCorrect ? "bg-green-50" : "bg-amber-50"
            }`}
          >
            <p
              className={`text-sm font-extrabold ${
                isCorrect ? "text-green-700" : "text-amber-700"
              }`}
            >
              {isCorrect ? "🎉 正解！その通り" : "🌱 おしい！条件を見直そう"}
            </p>

            {/* 不正解時: どの条件を見落としたか */}
            {!isCorrect && (
              <div className="mt-2 space-y-1.5 text-sm text-amber-800">
                <p className="font-bold">満たすべき条件:</p>
                <ul className="space-y-0.5">
                  {round.conditions.map((c, i) => (
                    <li key={i}>・{c}</li>
                  ))}
                </ul>
                {missed.length > 0 && (
                  <p>条件に合う行を {missed.length} つ選び忘れています。</p>
                )}
                {extra.length > 0 && (
                  <p>条件に合わない行を {extra.length} つ選んでいます。</p>
                )}
              </div>
            )}

            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              {round.explanation}
            </p>
          </div>

          {/* SQLで書くとどうなるか */}
          <div className="rounded-2xl bg-gray-900 p-4">
            <p className="mb-1.5 text-xs font-bold text-gray-400">
              SQLで書くと
            </p>
            <pre className="overflow-x-auto text-sm leading-relaxed text-green-300">
              <code>{round.sql}</code>
            </pre>
          </div>

          <button
            type="button"
            onClick={next}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98]"
          >
            {roundIndex + 1 >= rounds.length ? "結果を見る" : "次の問題へ"}
          </button>
        </div>
      )}
    </div>
  );
}
