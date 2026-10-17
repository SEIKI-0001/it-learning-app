// 公開英略語ページ（/words）で「同じ流れの中で順に使う略語」をまとめて見せるためのデータ。
//
// 単語帳のマスターデータ（data/wordlist/itpassAcronyms.json）は1語ずつの情報なので、
// 「RFI → RFP → RFQ」のような順番はここで持つ。単語帳アプリ（/glossary）には影響させない。
// 内容はアプリの解説（components/experiences/SystemPlanningRfpExperience.tsx）と揃える。

export type WordFamilyStep = {
  /** 単語帳の id。 */
  wordId: string;
  /** いつ出すか。 */
  when: string;
  /** ベンダに何を頼むか。 */
  ask: string;
  /** 何が返ってくるか。 */
  back: string;
};

export type WordFamily = {
  id: string;
  /** 見出しに使う流れの名前。例: "調達" */
  name: string;
  /** 流れの一言説明。 */
  lead: string;
  steps: WordFamilyStep[];
  /** 試験での出方の補足（任意）。 */
  examNote?: string;
};

const FAMILIES: WordFamily[] = [
  {
    id: "procurement",
    name: "調達",
    lead: "システムを外部に発注するとき、発注側はベンダに3種類の依頼書を出します。RF は Request For（〜をください）で、最後の1文字が頼むものです。",
    steps: [
      { wordId: "rfi", when: "企画の初め", ask: "どんな製品・技術がある？", back: "製品資料・事例" },
      { wordId: "rfp", when: "要件がまとまったら", ask: "この要件をどう実現する？", back: "提案書（方法・体制・価格）" },
      { wordId: "rfq", when: "仕様がほぼ決まったら", ask: "この仕様でいくら・いつ？", back: "見積書（価格・納期）" },
    ],
    examNote: "ITパスポート試験で問われるのは主に RFI と RFP の目的と順番です。RFQ は「見積りだけを求める文書」として RFP と区別できれば十分です。",
  },
];

/** その語が属する流れ（なければ null）。 */
export function getWordFamily(wordId: string): WordFamily | null {
  return FAMILIES.find((f) => f.steps.some((s) => s.wordId === wordId)) ?? null;
}

export function getAllWordFamilies(): WordFamily[] {
  return FAMILIES;
}
