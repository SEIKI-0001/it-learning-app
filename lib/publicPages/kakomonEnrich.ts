// 公開過去問ページ（/kakomon/[year]/[no]）に足す、本サービス独自の中身（サーバ専用）。
//
// - 選択肢ごとの解説（data/kakomon/choiceNotes/<年度>.json）:
//   要点1文＋選択肢（ア〜エ）ごと、または組合せ問題では記述（a〜d）ごとの「なぜそうなるか」。
//   問題データの解説（1段落）と同じ内容を、選択肢単位に分けて書き直したもの。
// - 解説スライドの1枚（data/kakomon/slideFigures.json → 画像は scripts/kakomon/capture-slide-figures.mjs で撮影）:
//   その問題の論点を扱うテーマ別解説のスライドを静止画で載せる。
//
// まだ用意していない年度・問題では null を返し、ページは従来の表示のまま。
import notes2026 from "@/data/kakomon/choiceNotes/2026.json";
import slideFigures from "@/data/kakomon/slideFigures.json";
import slideFigureImages from "@/data/kakomon/slideFigureImages.json";
import { CHOICE_LABELS } from "@/lib/pastExam/questionView";
import type { ChoiceKey } from "@/types";

type RawNote = {
  point: string;
  choices?: Partial<Record<ChoiceKey, string>>;
  statements?: Record<string, string>;
};

const CHOICE_NOTES: Record<number, Record<string, RawNote>> = {
  2026: notes2026 as Record<string, RawNote>,
};

export type KakomonChoiceNotes = {
  point: string;
  kind: "choices" | "statements";
  items: { label: string; text: string; correct: boolean }[];
};

/** 選択肢ごとの解説。組合せ問題（a, b, c…を選ぶ形）は記述ごとに返す（正誤は問いの向きで変わるので付けない）。 */
export function getKakomonChoiceNotes(
  year: number,
  questionNumber: number,
  correctChoice: ChoiceKey,
): KakomonChoiceNotes | null {
  const raw = CHOICE_NOTES[year]?.[String(questionNumber)];
  if (!raw) return null;
  if (raw.statements) {
    return {
      point: raw.point,
      kind: "statements",
      items: Object.entries(raw.statements).map(([label, text]) => ({ label, text, correct: false })),
    };
  }
  const items = (Object.keys(CHOICE_LABELS) as ChoiceKey[])
    .filter((key) => raw.choices?.[key])
    .map((key) => ({ label: CHOICE_LABELS[key], text: raw.choices![key]!, correct: key === correctChoice }));
  return { point: raw.point, kind: "choices", items };
}

type SlideImage = { src: string; width: number; height: number; caption: string };

export type KakomonSlideFigure = SlideImage & { topicId: string; slide: number };

const FIGURE_MAP = slideFigures as unknown as Record<string, Record<string, [string, number]>>;
const FIGURE_IMAGES = slideFigureImages as Record<string, SlideImage>;

/** その問題に載せる解説スライドの静止画。対応表に無い問題は null。 */
export function getKakomonSlideFigure(year: number, questionNumber: number): KakomonSlideFigure | null {
  const entry = FIGURE_MAP[String(year)]?.[String(questionNumber)];
  if (!entry) return null;
  const [topicId, slide] = entry;
  const image = FIGURE_IMAGES[`${topicId}-${slide}`];
  return image ? { ...image, topicId, slide } : null;
}
