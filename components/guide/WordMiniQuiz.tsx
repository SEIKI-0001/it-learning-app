"use client";

import { useState } from "react";
import { FUNNEL_PLACEMENTS } from "@/lib/growth/funnel";
import { LP_PATH } from "@/lib/guide/seo";
import type { WordMiniQuizData } from "@/lib/publicPages/words";
import type { ChoiceKey } from "@/types";

/**
 * 公開英略語ページの「1問で確認」。辞書として読んで帰る人に、その場で1問解いてもらい、
 * 解いた直後に「この形式でアプリなら毎日続けられる」と登録へつなぐ。
 * 問題と選択肢はサーバーで決めて渡す（lib/publicPages/words.ts の wordMiniQuiz）。
 * 計測は FunnelTracker が data-funnel-event / data-funnel を拾う（答えたら answer_open、登録は click）。
 * 答えたあとはボタンを無効にするので、answer_open は1表示につき1回だけ送られる。
 */
export default function WordMiniQuiz({
  quiz,
  wordCount,
}: {
  quiz: WordMiniQuizData;
  wordCount: number;
}) {
  const [picked, setPicked] = useState<ChoiceKey | null>(null);
  const answered = picked !== null;
  const correct = picked === quiz.correctKey;
  const pickedChoice = quiz.choices.find((c) => c.key === picked);
  const correctChoice = quiz.choices.find((c) => c.key === quiz.correctKey);

  return (
    <section className="w-quiz" aria-labelledby="w-quiz-title">
      <p id="w-quiz-title" className="w-quiz-label">
        1問で確認
      </p>
      <p className="w-quiz-prompt">{quiz.prompt}</p>
      <ul className="w-quiz-choices">
        {quiz.choices.map((c) => {
          const state = !answered
            ? ""
            : c.key === quiz.correctKey
              ? "is-correct"
              : c.key === picked
                ? "is-wrong"
                : "is-muted";
          return (
            <li key={c.key}>
              <button
                type="button"
                className={state}
                disabled={answered}
                onClick={() => setPicked(c.key)}
                data-funnel-event="answer_open"
                data-funnel={FUNNEL_PLACEMENTS.wordsQuiz}
              >
                {c.text}
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div className="w-quiz-result" role="status">
          <p className={correct ? "w-quiz-verdict ok" : "w-quiz-verdict ng"}>
            {correct ? "正解です" : `正解は「${correctChoice?.text}」です`}
          </p>
          {!correct && pickedChoice?.note && <p>{pickedChoice.note}</p>}
          {correctChoice?.note && <p>{correctChoice.note}</p>}
          <p>{quiz.takeaway}</p>

          <div className="w-quiz-next">
            <p>
              アプリの英略語カードなら、{wordCount}語をこの形式で毎日少しずつ確認できます。
              間違えた語は復習に回り、その日のうちにもう一度出ます。最初の7日間は学習記録も無料です。
            </p>
            <div className="g-cta-actions">
              <a className="g-btn" href="/login" data-funnel={FUNNEL_PLACEMENTS.wordsQuizCta}>
                無料で続きを解く
              </a>
              <a className="g-cta-sub" href={LP_PATH} data-funnel={FUNNEL_PLACEMENTS.wordsQuizLp}>
                勉強アプリの機能と料金を見る
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
