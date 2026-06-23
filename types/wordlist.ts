// ITパスポート英略語の単語帳（wordlist）の型定義。
// マスターデータは data/wordlist/itpassAcronyms.json（唯一のデータソース）。
// 画面側に用語データをハードコードせず、必ずこの型を通して扱う。

/** 略語を構成する英単語1つと、その日本語の意味。 */
export type WordlistWord = {
  word: string;
  meaning: string;
};

/** 単語帳のカテゴリ（一覧の絞り込みに使う）。 */
export type WordlistCategory =
  | "strategy"
  | "management"
  | "technology"
  | "security"
  | "ai"
  | "finance";

/** 4択確認モードの出題形式。 */
export type WordlistQuestionType =
  | "acronym_to_meaning" // 略語 → 意味
  | "meaning_to_acronym" // 意味 → 略語
  | "word_part" // 英単語パーツ
  | "confusion"; // 混同語比較

/** wordlist の1エントリ（英略語1語ぶんの全情報）。 */
export type WordlistEntry = {
  id: string;
  acronym: string;
  fullName: string;
  japanese: string;
  category: WordlistCategory;
  /** 略語の英単語分解。 */
  words: WordlistWord[];
  /** 一言意味。 */
  oneLine: string;
  /** 試験で問われやすいキーワード。 */
  examKeywords: string[];
  /** 似た用語（混同しやすい略語）。誤答選択肢の優先候補にも使う。 */
  confusedWith: string[];
  /** 似た用語と区別するための観点。 */
  differenceAxis: string;
  /** 似た用語ごとの「ここが違う」解説（キー＝似た用語名）。 */
  trapExplanations: Record<string, string>;
  /** このエントリで出題可能な形式。 */
  questionTypes: WordlistQuestionType[];
};

/** カテゴリの表示ラベル（日本語）と並び順。 */
export const WORDLIST_CATEGORY_LABELS: Record<WordlistCategory, string> = {
  strategy: "ストラテジ",
  management: "マネジメント",
  technology: "テクノロジ",
  security: "セキュリティ",
  ai: "AI",
  finance: "財務",
};

export const WORDLIST_CATEGORY_ORDER: WordlistCategory[] = [
  "strategy",
  "management",
  "technology",
  "security",
  "ai",
  "finance",
];
