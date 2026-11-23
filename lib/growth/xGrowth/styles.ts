import analogyLibrary from "@/data/x-growth/analogies.json";
import { factBlock, hash32, type TopicFact } from "@/lib/growth/xGrowth/topics";

/**
 * Content-style registry. A style turns ONE approved topic fact into exact post texts.
 * Styles never add facts: every factual string comes from TopicFact (or an approved library entry).
 * `kind` lets image styles be added later without changing the experiment model.
 */
export const TAG = "#ITパスポート";
export type StyleContext = { allowDraftLibrary: boolean };
export type ContentStyle = {
  id: string;
  label: string;
  kind: "text" | "image";
  supports(f: TopicFact, ctx: StyleContext): boolean;
  /** All acceptable texts for this topic, in a stable order. Validation recomputes this list. */
  render(f: TopicFact, ctx: StyleContext): string[];
};

type Analogy = { topicId: string; analogy: string; approved: boolean; reviewedBy: string | null; reviewedAt: string | null };
const analogies = (analogyLibrary as { entries: Analogy[] }).entries;
export function analogyFor(f: TopicFact, ctx: StyleContext): Analogy | undefined {
  const a = analogies.find(x => x.topicId === f.topicId);
  if (!a) return undefined;
  return a.approved && a.reviewedBy && a.reviewedAt ? a : ctx.allowDraftLibrary ? a : undefined;
}

const end = (body: string) => `${body}\n${TAG}`;
const LETTERS = ["A", "B", "C"];

export const STYLES: Record<string, ContentStyle> = {
  definition_first: {
    id: "definition_first", label: "定義から始める（現在の形・対照群）", kind: "text",
    supports: () => true,
    // Identical to compose(hook, termsSource, null) for the production "terms" posts.
    render: f => ["知っていますか？", "今日の学習メモ。", "学習の合間に確認。", "一つずつ確かめよう。"].map(h => end(`${h}\n${factBlock(f)}`)),
  },
  question_first: {
    id: "question_first", label: "問いかけから始める", kind: "text",
    supports: () => true,
    render: f => [
      end(`${f.acronym}、何の略か説明できますか？\n↓\n${factBlock(f)}`),
      end(`「${f.acronym}」と聞いて、意味がすぐ浮かびますか？\n↓\n${factBlock(f)}`),
    ],
  },
  misconception: {
    id: "misconception", label: "よくある混同を正す", kind: "text",
    supports: f => f.confusions.length > 0 && !!f.differenceAxis,
    render: f => f.confusions.map(c => end(`よくある混同：${f.acronym}と${c.acronym}\n${c.trap}\n見分けるポイント：${f.differenceAxis}\n${factBlock(f)}`)),
  },
  mini_quiz: {
    id: "mini_quiz", label: "ミニクイズ（答えと理由つき）", kind: "text",
    supports: f => f.confusions.length > 0,
    render: f => {
      const options = [f.acronym, ...f.confusions.slice(0, 2).map(c => c.acronym)];
      const shift = hash32(f.topicId) % options.length; // stable answer position
      const ordered = options.map((_, i) => options[(i + shift) % options.length]);
      const letter = LETTERS[ordered.indexOf(f.acronym)];
      return [end(`ミニクイズ：「${f.japanese}」を表す英略語は？\n${ordered.map((o, i) => `${LETTERS[i]} ${o}`).join("\n")}\n\n正解：${letter} ${f.acronym}\n${f.oneLine}`)];
    },
  },
  analogy: {
    id: "analogy", label: "身近なたとえで説明する", kind: "text",
    supports: (f, ctx) => !!analogyFor(f, ctx),
    render: (f, ctx) => {
      const a = analogyFor(f, ctx);
      return a ? [end(`たとえるなら、${a.analogy}。\n${factBlock(f)}\n※たとえは理解の手がかりです。正確な意味は上の説明のとおりです。`)] : [];
    },
  },
};

export function getStyle(id: string): ContentStyle {
  const s = STYLES[id];
  if (!s) throw new Error("unknown_content_style");
  return s;
}
