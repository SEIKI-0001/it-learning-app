"use client";

import { useState } from "react";
import type {
  AuthAuthorizationContent,
  AuthReason,
  MiniGame,
  MiniGameResult,
} from "@/types/minigame";
import MiniGameResultPanel from "./MiniGameResultPanel";

// 認証・認可ゲート: 1問ずつカードで「人」と「行動」を見せ、許可/拒否を選ぶ。
// 回答後に、認証の問題か・認可の問題かを表示して違いを定着させる。

const REASON_LABEL: Record<AuthReason, string> = {
  authentication: "認証の問題（本人確認）",
  authorization: "認可の問題（権限確認）",
  ok: "認証も認可もOK",
};

const REASON_TONE: Record<AuthReason, string> = {
  authentication: "bg-sky-100 text-sky-700",
  authorization: "bg-violet-100 text-violet-700",
  ok: "bg-green-100 text-green-700",
};

export default function AuthAuthorizationGame({
  meta,
  content,
}: {
  meta: MiniGame;
  content: AuthAuthorizationContent;
}) {
  const { cases } = content;
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  const current = cases[index];
  const answered = answer !== null;
  const isCorrect = answered && answer === current.allowed;

  function choose(value: boolean) {
    if (answered) return;
    setAnswer(value);
    if (value === current.allowed) {
      setCorrectCount((c) => c + 1);
    } else {
      setMistakes((m) => [
        ...m,
        `${current.person}が「${current.action}」`,
      ]);
    }
  }

  function next() {
    if (index + 1 >= cases.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setAnswer(null);
  }

  function replay() {
    setIndex(0);
    setAnswer(null);
    setCorrectCount(0);
    setMistakes([]);
    setFinished(false);
  }

  if (finished) {
    const result: MiniGameResult = {
      miniGameId: meta.id,
      score: correctCount,
      maxScore: cases.length,
      completed: true,
      mistakes,
      completedAt: new Date().toISOString(),
    };
    return <MiniGameResultPanel meta={meta} result={result} onReplay={replay} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold text-gray-400">
        ケース {index + 1} / {cases.length}
      </p>

      {/* 人と行動を大きく表示 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-bold text-gray-400">この人は</p>
        <p className="mt-0.5 text-xl font-extrabold text-gray-800">
          {current.person}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-indigo-500">
          {current.personDesc}
        </p>
        <div className="my-3 h-px bg-gray-100" />
        <p className="text-xs font-bold text-gray-400">やろうとしている行動</p>
        <p className="mt-0.5 text-lg font-extrabold leading-snug text-gray-800">
          {current.action}
        </p>
      </div>

      {!answered ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => choose(true)}
            className="rounded-2xl bg-green-500 px-6 py-5 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98]"
          >
            ⭕️ 許可する
          </button>
          <button
            type="button"
            onClick={() => choose(false)}
            className="rounded-2xl bg-rose-500 px-6 py-5 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98]"
          >
            ✗ 拒否する
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className={`rounded-2xl p-4 ${
              isCorrect ? "bg-green-50" : "bg-amber-50"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={`text-sm font-extrabold ${
                  isCorrect ? "text-green-700" : "text-amber-700"
                }`}
              >
                {isCorrect ? "🎉 正解！" : "🌱 おしい！"}
              </p>
              <span className="text-sm font-bold text-gray-600">
                正解は「{current.allowed ? "許可する" : "拒否する"}」
              </span>
            </div>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${
                REASON_TONE[current.reason]
              }`}
            >
              {REASON_LABEL[current.reason]}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              {current.explanation}
            </p>
          </div>

          <button
            type="button"
            onClick={next}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98]"
          >
            {index + 1 >= cases.length ? "結果を見る" : "次のケースへ"}
          </button>
        </div>
      )}
    </div>
  );
}
