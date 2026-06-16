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

/** 重要度（1=低 / 2=中 / 3=高）。学習の優先度づけに使う。 */
export type Importance = 1 | 2 | 3;

/** 重要度の表示名 */
export const IMPORTANCE_LABELS: Record<Importance, string> = {
  1: "低",
  2: "中",
  3: "高",
};

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

/** 2軸で整理する図解（例: SWOTの内外 × プラス/マイナス） */
export type MatrixDiagram = {
  type: "matrix";
  title?: string;
  columns: string[];
  rows: string[];
  cells: {
    row: string;
    column: string;
    emoji?: string;
    title: string;
    body: string;
  }[];
};

/** 上下に積み重なる構造を見せる図解（例: ハードウェア → OS → アプリ） */
export type LayerDiagram = {
  type: "layers";
  title?: string;
  layers: { emoji?: string; title: string; body: string }[];
};

/** ノード同士のつながりを見せる図解（例: 主キーと外部キー） */
export type RelationshipDiagram = {
  type: "relationship";
  title?: string;
  nodes: { id: string; emoji?: string; label: string; body?: string }[];
  links: { from: string; to: string; label?: string }[];
};

/** 役割を持つ要素同士の受け渡しを見せる図解（例: 保存→読み出し→処理） */
export type MechanismFlowDiagram = {
  type: "mechanismFlow";
  title?: string;
  actors: {
    id: string;
    label: string;
    role: string;
    detail?: string;
  }[];
  steps: {
    from: string;
    to: string;
    label: string;
    body?: string;
  }[];
};

/** 役割の違いと境界を見せる図解（例: OSがアプリと機械の間に入る） */
export type RoleMapDiagram = {
  type: "roleMap";
  title?: string;
  roles: {
    id: string;
    label: string;
    responsibility: string;
    handles: string[];
    notFor?: string;
  }[];
  handoffs?: { from: string; to: string; label: string }[];
};

/** テーブルのキーと参照関係を見せる図解（例: 主キー・外部キー） */
export type TableRelationDiagram = {
  type: "tableRelation";
  title?: string;
  tables: {
    id: string;
    name: string;
    caption?: string;
    columns: {
      name: string;
      keyType?: "primary" | "foreign" | "normal";
      references?: string;
    }[];
  }[];
  relations: {
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
    label?: string;
  }[];
};

/** 3要素のバランス関係を見せる図解（例: QCD） */
export type BalanceDiagram = {
  type: "balance";
  title?: string;
  center: string;
  factors: {
    label: string;
    body: string;
    ifOverdone?: string;
  }[];
  tradeoffs?: string[];
};

export type HeroDiagramType =
  | "flow"
  | "role-map"
  | "compare"
  | "relation"
  | "matrix"
  | "cycle";

export type HeroDiagramTone =
  | "sky"
  | "indigo"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "slate";

export type HeroDiagramNode = {
  id: string;
  label: string;
  caption?: string;
  badge?: string;
  tone?: HeroDiagramTone;
};

export type HeroDiagramLane = {
  id: string;
  label: string;
  caption?: string;
  items?: string[];
  tone?: HeroDiagramTone;
};

export type HeroDiagramGroup = {
  id: string;
  label: string;
  caption?: string;
  items: string[];
  tone?: HeroDiagramTone;
};

export type HeroDiagramStep = {
  from?: string;
  to?: string;
  label: string;
  caption?: string;
  tone?: HeroDiagramTone;
};

export type HeroDiagramLink = {
  from: string;
  to: string;
  label?: string;
};

export type HeroDiagramMatrix = {
  columns: string[];
  rows: string[];
  cells: {
    row: string;
    column: string;
    label: string;
    caption?: string;
    tone?: HeroDiagramTone;
  }[];
};

export type HeroDiagramCycleStep = {
  label: string;
  caption?: string;
  tone?: HeroDiagramTone;
};

/** 導入直後に全体像を一枚で見せる理解用インフォグラフィック。 */
export type HeroDiagramSpec = {
  type: "heroDiagram";
  diagramType: HeroDiagramType;
  title: string;
  subtitle?: string;
  canvasLabel?: string;
  nodes?: HeroDiagramNode[];
  lanes?: HeroDiagramLane[];
  groups?: HeroDiagramGroup[];
  steps?: HeroDiagramStep[];
  links?: HeroDiagramLink[];
  matrix?: HeroDiagramMatrix;
  cycle?: {
    center?: string;
    steps: HeroDiagramCycleStep[];
  };
  insight?: string;
};

/** 図解仕様（描画可能な構造化データ）。type で描画方法が決まる判別共用体。 */
export type DiagramSpec =
  | CardsDiagram
  | ComparisonDiagram
  | FlowDiagram
  | MatrixDiagram
  | LayerDiagram
  | RelationshipDiagram
  | MechanismFlowDiagram
  | RoleMapDiagram
  | TableRelationDiagram
  | BalanceDiagram;

// ---------------------------------------------------------------------------
// 視覚理解パーツ。装飾ではなく、導入直後に「見て・少し触って」理解するためのデータ。
// 既存トピックには optional として追加するため、後方互換を保つ。
// ---------------------------------------------------------------------------

export type IllustrationSpec = {
  type: "analogyScene";
  title: string;
  caption?: string;
  items: { emoji?: string; title: string; body: string }[];
};

export type InteractiveSpec = {
  type: "tapReveal";
  title: string;
  prompt?: string;
  items: { emoji?: string; label: string; title: string; body: string }[];
};

export type AnimationSpec = {
  type: "stepFlow";
  title: string;
  caption?: string;
  steps: { emoji?: string; label: string; body: string }[];
};

export type ClassificationMiniGame = {
  type: "classification";
  title: string;
  prompt: string;
  buckets: { id: string; label: string; description?: string }[];
  cards: { label: string; belongsTo: string; explanation: string }[];
};

export type MatchingMiniGame = {
  type: "matching";
  title: string;
  prompt: string;
  pairs: { left: string; right: string; explanation: string }[];
};

export type MiniGameSpec = ClassificationMiniGame | MatchingMiniGame;

export type VisualLearningSpec = {
  title?: string;
  lead?: string;
  heroDiagram?: HeroDiagramSpec;
  diagram?: DiagramSpec;
  illustration?: IllustrationSpec;
  interactive?: InteractiveSpec;
  animation?: AnimationSpec;
  miniGame?: MiniGameSpec;
};

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
  /** 選択肢ごとの補足。誤答復習で「なぜ違うか」を返すために使う。 */
  choiceExplanations?: Partial<Record<ChoiceKey, string>>;
  /** AIコーチが近いトピックへ誘導するときに使う。 */
  relatedTopicIds?: string[];
  /** 誤答分析・直前復習向けのタグ。 */
  reviewTags?: string[];
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

/** 試験での出やすさ */
export type ExamFrequency = "low" | "medium" | "high";

/** 復習で優先する度合い */
export type ReviewPriority = "low" | "medium" | "high";

/** 初心者がつまずきやすい度合い */
export type BeginnerTrapLevel = "low" | "medium" | "high";

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
  importance: Importance; // 重要度(出題頻度・基礎性。学習の優先度づけに使う)
  tags: string[]; // 苦手タグと対応づける語（例: "セキュリティ"）
  prerequisites: string[]; // 先に学ぶと良いトピックの id（無ければ空配列）
  nextTopicIds?: string[]; // 次に学ぶとつながりやすいトピック id
  relatedTerms?: string[]; // 関連用語（用語集・復習導線用）
  commonMistakes?: string[]; // 間違いやすいポイント
  examPoint?: string; // 試験でどう問われるか
  reviewKeywords?: string[]; // 復習検索・想起用キーワード
  lineSummary?: string; // LINE 1通で返しやすい短い要約
  examFrequency?: ExamFrequency;
  reviewPriority?: ReviewPriority;
  beginnerTrapLevel?: BeginnerTrapLevel;
  heroDiagram?: HeroDiagramSpec;
  visualLearning?: VisualLearningSpec;

  conceptCard: ConceptCard; // 参考書 → 図解理解 の「図解理解」
  checkQuestions: CheckQuestion[]; // 確認問題
  explanation: Explanation; // 図解付き解説
  reviewPrompt: ReviewPrompt; // 復習
  referenceHints: ReferenceHint[]; // 参考書で探すキーワード
  kakomonFields: KakomonField[]; // 過去問道場で解くべき分野
};

/** ITパスポート頻出用語の用語集エントリ */
export type GlossaryTerm = {
  id: string;
  term: string;
  reading?: string;
  field?: TopicField;
  category: string;
  oneLine: string;
  beginnerExplanation: string;
  analogy: string;
  examPoint: string;
  relatedTerms: string[];
  confusedWith: string[];
  reviewTags: string[];
  quiz: CheckQuestion;
};
