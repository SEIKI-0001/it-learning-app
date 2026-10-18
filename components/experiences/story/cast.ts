import type { Choice } from "../calc/CalcParts";

// ストーリー解説の共通の登場人物と台本の型。
// どのトピックの話も同じ会社（社内IT部のある会社）の出来事にして、人物を使い回す。
// 同じ人・同じ会社で通すと、トピックをまたいでも話がつながって覚えやすい。

export type Who = "mori" | "takagi" | "user" | "boss" | "auditor" | "expert";

export type Mood = "normal" | "smile" | "worried" | "surprised";

export const CAST: Record<Who, { name: string }> = {
  mori: { name: "森さん" },
  takagi: { name: "高木さん（先輩）" },
  user: { name: "社員（利用者）" },
  boss: { name: "社長" },
  auditor: { name: "宮本さん（内部監査室）" },
  expert: { name: "大川さん（弁理士）" },
};

/** 話と一緒に変わる表示（メーターや台帳）の値。キーごとに上書きしていく */
export type StoryState = Record<string, string | number>;

export type Beat = {
  time?: string;
  /** 話している人。省略すると地の文 */
  who?: Who;
  /** 話している人の表情（省略すると normal） */
  mood?: Mood;
  text?: string;
  /** この行で出てくる用語（この行が最新のときだけカードで出す） */
  term?: { name: string; def: string };
  /** この行まで進むと変わる表示の値（選ぶ場面では答えたあとに反映） */
  state?: StoryState;
  /** 選ぶ場面。答えるまで先へ進まない */
  ask?: { q: string; choices: Choice[]; then?: string; at?: number };
};
