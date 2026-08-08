// 出題する問題の図表に、画像の実寸を足す（サーバ専用）。
//
// なぜ必要か:
//   next/image はパス文字列で指定した画像の実寸を知らないので width / height が要る。
//   渡さないと読み込み中にレイアウトがずれる（CLS）。
//
// なぜ変換時（lib/questionBank/adapter.ts）でやらないか:
//   実寸は public/ 配下のファイルから読む＝ node:fs が要る。adapter はクライアント側の
//   バンドルにも入る経路にあるので、fs を持ち込めない。
//   そこで「サーバコンポーネントで最後に足す」形に分けている。
//
// 呼び出し元はサーバコンポーネントに限ること。
// 実寸が読めなかった図表はそのまま返す（表示側に既定値のフォールバックがある）。

import { getPngSize } from "@/lib/pastExam/figureSize";
import type { CheckQuestion, QuestionFigureView } from "@/types/content";

function measure(figure: QuestionFigureView): QuestionFigureView {
  if (figure.kind !== "image" || !figure.src) return figure;

  const size = getPngSize(figure.src);
  if (!size) return figure;

  return { ...figure, width: size.width, height: size.height };
}

/** 図表を持つ問題にだけ実寸を足す（持たない問題はそのまま返す）。 */
export function withMeasuredFigures(questions: CheckQuestion[]): CheckQuestion[] {
  return questions.map((q) =>
    q.figures && q.figures.length > 0 ? { ...q, figures: q.figures.map(measure) } : q,
  );
}
