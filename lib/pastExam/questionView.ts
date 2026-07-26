// 年度別演習で「クライアントへ渡す問題の形」。
//
// このモジュールはクライアントバンドルに入るので、Node 専用API（node:fs など）を
// 直接にも間接にも import しないこと。
// 実際に問題バンクを引いて図表の実寸を読む処理は、サーバ専用の
// lib/pastExam/viewModel.ts 側にある（そちらは node:fs を使う）。

import type { ChoiceKey } from "@/types";
import type { TopicField } from "@/types/content";
import type { QuestionFigure } from "@/types/questionBank";

/** 表示用の図表。実寸が読めた画像には width / height が付く。 */
export type PastExamFigureView = {
  id: string;
  kind: QuestionFigure["kind"];
  src?: string;
  body?: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

/** 表示用の問題1件。 */
export type PastExamQuestionView = {
  id: string;
  questionNumber: number;
  prompt: string;
  choices: { key: ChoiceKey; text: string }[];
  correctChoice: ChoiceKey;
  /** 本サービス独自の解説（IPA の公式解説ではない）。 */
  explanation: string;
  /** 公式問題冊子上の出題区分。結果画面の区分別集計に使う。 */
  examField: TopicField;
  /** 復習先トピック。 */
  topicId: string;
  topicTitle: string | null;
  figures: PastExamFigureView[];
  /** 出典表記（例: "出典：令和8年度 ITパスポート試験 公開問題 問1"）。 */
  attribution: string;
  sourceUrl: string;
  answerSourceUrl: string;
  /** 回答履歴に残すためのメタ情報。 */
  version: number;
  origin: string;
  year: number;
};

/** 画面上の選択肢記号。内部キー A〜D は変えず、表示だけ ア〜エ にする。 */
export const CHOICE_LABELS: Record<ChoiceKey, string> = {
  A: "ア",
  B: "イ",
  C: "ウ",
  D: "エ",
};
