// 公開過去問ページ（/kakomon/[year]/[no]）に足す、本サービス独自の中身（サーバ専用）。
//
// - 選択肢ごとの解説（data/kakomon/choiceNotes/<年度>.json）:
//   選択肢（ア〜エ）ごと、または組合せ問題では記述（a〜d）ごとの「なぜ正しいか／なぜ誤りか」。
//   ページでは問題データの解説（1段落）の下に併記する（段落の解説の代わりにはしない）。
//   本文には [表示する語](/words/<id>) か [表示する語](/kaisetsu/<topicId>) の形でリンクを書ける。
//   リンク先が存在するかはテスト（test/kakomonEnrich.test.ts）で確かめる。
// - 解説スライドの1枚（data/kakomon/slideFigures.json → 画像は scripts/kakomon/capture-slide-figures.mjs で撮影）:
//   その問題の論点を扱うテーマ別解説のスライドを静止画で載せる。
//
// まだ用意していない年度・問題では null を返し、ページは段落の解説だけを出す。
import notes2025 from "@/data/kakomon/choiceNotes/2025.json";
import notes2026 from "@/data/kakomon/choiceNotes/2026.json";
import slideFigures from "@/data/kakomon/slideFigures.json";
import slideFigureImages from "@/data/kakomon/slideFigureImages.json";
import { CHOICE_LABELS } from "@/lib/pastExam/questionView";
import type { ChoiceKey } from "@/types";

type RawNote = {
  /** 旧形式（令和8年度の初版）の要点1文。段落の解説と重なるのでページには出さない。 */
  point?: string;
  choices?: Partial<Record<ChoiceKey, string>>;
  statements?: Record<string, string>;
};

const CHOICE_NOTES: Record<number, Record<string, RawNote>> = {
  2025: notes2025 as Record<string, RawNote>,
  2026: notes2026 as Record<string, RawNote>,
};

/** 解説文の一部。href があればリンクとして描く。 */
export type NoteSegment = { text: string; href?: string };

const LINK = /\[([^\]]+)\]\((\/(?:words|kaisetsu)\/[a-z0-9-]+)\)/g;

/** "[ISMS](/words/isms)の規格" → [{text:"ISMS",href:"/words/isms"},{text:"の規格"}]。 */
export function parseNoteText(raw: string): NoteSegment[] {
  const out: NoteSegment[] = [];
  let last = 0;
  for (const m of raw.matchAll(LINK)) {
    if (m.index > last) out.push({ text: raw.slice(last, m.index) });
    out.push({ text: m[1], href: m[2] });
    last = m.index + m[0].length;
  }
  if (last < raw.length) out.push({ text: raw.slice(last) });
  return out;
}

/** リンクの記法を外した、読んだときの文。 */
export function notePlainText(raw: string): string {
  return parseNoteText(raw)
    .map((s) => s.text)
    .join("");
}

export type KakomonChoiceNotes = {
  kind: "choices" | "statements";
  items: { label: string; text: string; segments: NoteSegment[]; correct: boolean }[];
};

function toItem(label: string, raw: string, correct: boolean) {
  return { label, text: notePlainText(raw), segments: parseNoteText(raw), correct };
}

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
      kind: "statements",
      items: Object.entries(raw.statements).map(([label, text]) => toItem(label, text, false)),
    };
  }
  const items = (Object.keys(CHOICE_LABELS) as ChoiceKey[])
    .filter((key) => raw.choices?.[key])
    .map((key) => toItem(CHOICE_LABELS[key], raw.choices![key]!, key === correctChoice));
  return { kind: "choices", items };
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
