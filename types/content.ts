// ITパスポート学習コーチ — コンテンツライブラリの共通型定義
//
// 方針:
//   - LINE上では学習コンテンツを表示しない。表示はすべて Web 側。
//   - コンテンツは ITパスポートの標準トピック単位で「作り込む」。
//   - 図解は「構造化データ(DiagramSpec)」として持ち、描画はレンダラ側が担う。
//     → AI は図解を自由生成せず、作り込み済みのコンテンツを「組み合わせる」だけにする。
//   - 参考書には章番号ではなく「探すキーワード」を提示する。
//
// 既存の types/index.ts（FE Quest のクエスト用型）には手を加えない。
// ここはクエストとは独立した、新しいコンテンツ基盤の型を定義する。

import type { ChoiceKey } from "@/types";

/** 難易度（1=やさしい / 2=ふつう / 3=ややむずかしい） */
export type Difficulty = 1 | 2 | 3;

/** ITパスポートの3分野 */
export type TopicField = "technology" | "management" | "strategy";

/** 分野の表示名 */
export const FIELD_LABELS: Record<TopicField, string> = {
  technology: "テクノロジ系",
  management: "マネジメント系",
  strategy: "ストラテジ系",
};

// ---------------------------------------------------------------------------
// 図解（DiagramSpec）: 種類ごとの構造化データ。描画は components/diagrams 側（Step 3）。
// ここでは「どんな図解を出すか」をデータとして表現できる型だけを定義する。
// ---------------------------------------------------------------------------

/** 並べたカードで概念を見せる図解（例: セキュリティの3要素） */
export type CardsDiagram = {
  type: "cards";
  title?: string;
  items: { emoji?: string; title: string; body: string }[];
};

/** 表で比較する図解（先頭列は項目名、headers の先頭はその列見出し） */
export type ComparisonDiagram = {
  type: "comparison";
  title?: string;
  headers: string[]; // 例: ["項目", "HTTP", "HTTPS"]
  rows: { label: string; cells: string[] }[];
};

/** 順番に流れる図解（例: 名前解決の流れ） */
export type FlowDiagram = {
  type: "flow";
  title?: string;
  direction?: "horizontal" | "vertical";
  steps: { label: string; description?: string }[];
};

/** 図解仕様（描画可能な構造化データ）。type で描画方法が決まる判別共用体。 */
export type DiagramSpec = CardsDiagram | ComparisonDiagram | FlowDiagram;

// ---------------------------------------------------------------------------
// コンテンツの構成パーツ
// ---------------------------------------------------------------------------

/** 図解付き概念カード（トピックの導入。やさしい言葉＋たとえ＋図解） */
export type ConceptCard = {
  heading: string;
  body: string; // 専門用語を先に出さない、やさしい導入文
  analogy?: string; // 身近なたとえ
  diagram?: DiagramSpec;
};

/** 確認問題（4択）。クエスト用 Question とは独立（day/stage を持たない）。 */
export type CheckQuestion = {
  id: string;
  prompt: string;
  choices: { key: ChoiceKey; text: string }[];
  correctChoice: ChoiceKey;
  explanation: string;
  difficulty: Difficulty;
};

/** 図解付き解説（確認問題のあとに読む、理解を固めるパート） */
export type Explanation = {
  body: string;
  keyPoints?: string[]; // 押さえどころ（箇条書き）
  diagram?: DiagramSpec;
};

/** 復習プロンプト（後日の想起用。問い→想起してほしい内容） */
export type ReviewPrompt = {
  question: string;
  answer: string;
};

/**
 * 参考書で「探すキーワード」。
 * 章番号には依存せず、索引で引く語を提示する（特定の参考書に依存しない方針）。
 */
export type ReferenceHint = {
  keywords: string[];
  note?: string; // どう探すか・何に注目するかの補足
};

/** 過去問道場で解くべき分野ラベル */
export type KakomonField = {
  label: string;
  note?: string;
};

// ---------------------------------------------------------------------------
// トピック（コンテンツライブラリの最小単位）
// ---------------------------------------------------------------------------

export type Topic = {
  id: string; // 例: "tech-security-cia"
  field: TopicField;
  category: string; // 中分類（例: "技術要素（セキュリティ）"）
  title: string;
  summary: string; // 一覧表示用の短い説明
  estimatedMinutes: number; // 目安の所要時間
  difficulty: Difficulty;
  tags: string[]; // 苦手タグと対応づける語（例: "セキュリティ"）
  prerequisites: string[]; // 先に学ぶと良いトピックの id（無ければ空配列）

  conceptCard: ConceptCard; // 参考書 → 図解理解 の「図解理解」
  checkQuestions: CheckQuestion[]; // 確認問題
  explanation: Explanation; // 図解付き解説
  reviewPrompt: ReviewPrompt; // 復習
  referenceHints: ReferenceHint[]; // 参考書で探すキーワード
  kakomonFields: KakomonField[]; // 過去問道場で解くべき分野
};
