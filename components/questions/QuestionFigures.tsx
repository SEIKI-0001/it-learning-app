"use client";

// 問題の図表表示。
//
// 年度別演習（PastExamQuestionCard）と確認パック（TopicQuiz）の両方から使う。
// 図表は「問題が成立するために必要な情報」なので、出題する画面はどこでも
// 問題文と選択肢の間に、同じ形で出す。どちらか一方でだけ出る状態を作らないために
// 共通部品にしてある。
//
// width / height はサーバ側で画像の実寸を読めたときだけ入る。
// 読めなかった場合でもレイアウトが壊れないよう既定値を置く（表示自体は止めない）。

import Image from "next/image";
import type { QuestionFigureView } from "@/types/content";

/** 実寸が読めなかった画像の既定サイズ。表示は w-full なので縦横比の予約にだけ効く。 */
const FALLBACK_WIDTH = 800;
const FALLBACK_HEIGHT = 400;

export default function QuestionFigures({
  figures,
  className = "",
}: {
  figures: QuestionFigureView[];
  className?: string;
}) {
  if (figures.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {figures.map((figure) => (
        <QuestionFigure key={figure.id} figure={figure} />
      ))}
    </div>
  );
}

export function QuestionFigure({ figure }: { figure: QuestionFigureView }) {
  if (figure.kind !== "image" || !figure.src) {
    // table / ascii の図表は本文として出す。
    return (
      <figure>
        <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-relaxed text-gray-800">
          {figure.body ?? figure.alt}
        </pre>
        {figure.caption && (
          <figcaption className="mt-1 text-xs text-gray-500">{figure.caption}</figcaption>
        )}
      </figure>
    );
  }

  return (
    <figure>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-2">
        <Image
          src={figure.src}
          alt={figure.alt}
          width={figure.width ?? FALLBACK_WIDTH}
          height={figure.height ?? FALLBACK_HEIGHT}
          sizes="(max-width: 768px) 100vw, 720px"
          className="h-auto w-full max-w-full"
        />
      </div>
      {figure.caption && (
        <figcaption className="mt-1 text-xs text-gray-500">{figure.caption}</figcaption>
      )}
    </figure>
  );
}
