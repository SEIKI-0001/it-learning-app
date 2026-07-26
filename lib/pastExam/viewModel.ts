// 年度別演習の「サーバで組み立てて、クライアントへ渡す形」を作る。
//
// 分担:
//   サーバ側（page.tsx）… 問題バンクから問題を引き、図表の実寸を読み、この形に詰める。
//   クライアント側（Runner）… 受け取った配列を表示・採点するだけ。
//
// このモジュールは node:fs を使う（図表の実寸を読むため）ので、
// **クライアントコンポーネントから import しないこと**。
// 型と表示用の定数はクライアントからも使うので lib/pastExam/questionView.ts に分けてある。

import { getTopic } from "@/lib/content";
import { getPngSize } from "@/lib/pastExam/figureSize";
import type {
  PastExamFigureView,
  PastExamQuestionView,
} from "@/lib/pastExam/questionView";
import type { TopicField } from "@/types/content";
import type { QuestionFigure, QuestionRecord } from "@/types/questionBank";

export type { PastExamFigureView, PastExamQuestionView };

function toFigureView(figure: QuestionFigure): PastExamFigureView {
  const size = figure.kind === "image" && figure.src ? getPngSize(figure.src) : null;
  return {
    id: figure.id,
    kind: figure.kind,
    src: figure.src,
    body: figure.body,
    alt: figure.alt,
    caption: figure.caption,
    width: size?.width,
    height: size?.height,
  };
}

/**
 * QuestionRecord を表示用に変換する。
 * 図表は QuestionRecord.figures の順序をそのまま保つ（公式の参照順）。
 */
export function toPastExamQuestionView(record: QuestionRecord): PastExamQuestionView {
  const official = record.official;
  return {
    id: record.id,
    questionNumber: official?.questionNumber ?? 0,
    prompt: record.prompt,
    choices: record.choices.map((c) => ({ key: c.key, text: c.text })),
    correctChoice: record.correctChoice,
    explanation: record.explanation,
    examField: (official?.examField ?? "strategy") as TopicField,
    topicId: record.primaryTopicId,
    topicTitle: getTopic(record.primaryTopicId)?.title ?? null,
    figures: (record.figures ?? []).map(toFigureView),
    attribution: official?.attribution ?? "",
    sourceUrl: official?.sourceUrl ?? "",
    answerSourceUrl: official?.answerSourceUrl ?? "",
    version: record.version,
    origin: record.origin,
    year: official?.year ?? 0,
  };
}
