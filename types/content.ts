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

// --- 図解レジストリ（LearningDiagram）向けの追加図解タイプ ---------------------
// 既存の matrix/layers などとは判別子（type）が重複しないため共存できる。

/**
 * 2×2 のマトリクス図解（例: SWOT 分析）。
 * cells は左上→右上→左下→右下 の順で4つ。軸ラベルは [手前, 奥] の意味。
 */
export type QuadrantDiagram = {
  type: "quadrant";
  title?: string;
  xLabels?: [string, string]; // 列の意味（左, 右）例: ["プラス要因", "マイナス要因"]
  yLabels?: [string, string]; // 行の意味（上, 下）例: ["内部環境", "外部環境"]
  cells: { title: string; body: string; emoji?: string }[];
};

/** 循環する図解（例: PDCA サイクル）。最後のステップから先頭へ戻る。 */
export type CycleDiagram = {
  type: "cycle";
  title?: string;
  steps: { label: string; description?: string }[];
  loopLabel?: string; // 循環を表す注記（既定: "くりかえして改善"）
};

/** 入れ子（包含）の図解（例: AI ⊃ 機械学習 ⊃ 生成AI）。layers は外側→内側の順。 */
export type NestedDiagram = {
  type: "nested";
  title?: string;
  layers: { label: string; body?: string }[];
};

/** 中心と複数要素の関係図（例: 3C 分析）。center を nodes が取り囲む。 */
export type RelationDiagram = {
  type: "relation";
  title?: string;
  center?: { label: string; body?: string };
  nodes: { label: string; body?: string; emoji?: string }[];
};

/**
 * 損益分岐点の図解（定性的）。売上高線・総費用線・固定費・分岐点・利益/損失を描く。
 * 数値は持たず「どこで利益が出るか」の関係だけを示す。ラベルだけ差し替え可能。
 */
export type BreakevenDiagram = {
  type: "breakeven";
  title?: string;
  labels?: {
    revenue?: string; // 売上高線
    cost?: string; // 総費用線
    fixed?: string; // 固定費
    point?: string; // 損益分岐点
    profit?: string; // 利益が出る領域
    loss?: string; // 損失が出る領域
  };
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
  | BalanceDiagram
  | QuadrantDiagram
  | CycleDiagram
  | NestedDiagram
  | RelationDiagram
  | BreakevenDiagram;

// ---------------------------------------------------------------------------
// 学習用図解（LearningDiagram）: 図解レジストリに登録する1テーマ＝1図解の単位。
//   - 図解本体（DiagramSpec）に加え、「ひとことで言うと」「重要ポイント」
//     「試験で問われやすい観点」をセットで持つ。
//   - トピックからは diagramIds（id 参照）で呼び出す＝コンテンツと図解を疎結合に保つ。
//   - 後で Supabase 等へ移すときは、この構造のまま行レコードにできる。
// ---------------------------------------------------------------------------

export type LearningDiagram = {
  id: string; // 例: "diag-cpu-memory-storage"
  field: TopicField;
  title: string; // 図解タイトル
  spec: DiagramSpec; // 図解本体
  caption?: string; // 図の真下に置く短い補足（任意）
  oneLine: string; // ひとことで言うと
  keyPoints: string[]; // 重要ポイント
  examPoints: string[]; // 試験で問われやすい観点
};

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
// プロセスデモ（ProcessDemo）: 理解が難しいテーマ（DNS / SQL / 認証・認可）を
//   「利用者目線の操作 → 裏側の処理ステップ → 用語対応 → 試験ポイント」まで
//   1ページ内で完結させるための、操作できる理解パート。
//   ミニゲーム（別ページ）に頼らず、トピック詳細ページに直接埋め込む。
//   図解と同じく「構造化データ＋レンダラ」方式で、描画は
//   components/learn/ProcessDemoSection が担う。
// ---------------------------------------------------------------------------

/** 処理の主体（ブラウザ / DNSサーバー / Webサーバー / DB など） */
export type ProcessActor = {
  id: string;
  label: string; // 例: "ブラウザ"
  emoji?: string;
};

/**
 * 裏側の処理1ステップ。「誰が・何を受け取り・何をして・何を返すか」を持つ。
 * input / output で「何がどこに渡されたか」を視覚化できるようにする。
 */
export type ProcessStep = {
  id: string;
  actorId: string; // どの主体の処理か（actors の id）
  title: string; // 1〜2文の見出し
  input?: string; // 受け取るもの（前の主体から渡された値）
  action?: string; // 何をするか（補足）
  output?: string; // 次へ渡す／返すもの
  toActorId?: string; // output を渡す相手（省略時は次のステップの主体）
  term?: string; // 試験用語ラベル（DNS / SQL / 認証 / 認可 など）
  highlight?: boolean; // 特に強調したいステップ（例: 認可で失敗）
};

/** 結果の意味あい（ラベルでも分かるよう、色だけに依存しない） */
export type ProcessOutcomeTone = "ok" | "blocked" | "info";

/**
 * 1つの処理フロー（シナリオ）。
 * DNS / SQL は単一シナリオ、認証・認可は状態×操作で複数シナリオを持つ。
 */
export type ProcessScenario = {
  id: string;
  label: string; // シナリオ選択ボタンの表示名
  /** rolePicker 画面で、どの選択の組み合わせに対応するか（kind=rolePicker のとき） */
  selection?: Record<string, string>;
  steps: ProcessStep[];
  outcomeLabel: string; // 結果（例: "管理画面を表示" / "アクセスを拒否"）
  outcomeTone: ProcessOutcomeTone;
  takeaway?: string; // このシナリオの学習ポイント（強調表示）
};

/** 利用者が最初に触る「画面イメージ」。kind で描画方法が決まる。 */
export type ProcessScreen =
  | {
      kind: "browserBar";
      url: string;
      buttonLabel: string;
    }
  | {
      kind: "searchForm";
      fields: { label: string; value: string }[];
      buttonLabel: string;
    }
  | {
      kind: "rolePicker";
      groups: {
        id: string;
        label: string;
        options: { id: string; label: string }[];
      }[];
      buttonLabel: string;
    };

/** ITパスポート用語との対応（用語 → 意味 → このデモでの現れ方） */
export type ProcessTermMapping = {
  term: string;
  meaning: string;
  inThisDemo: string;
};

/** 軽いミニ理解チェック（1問）。結果ではなく内部状態を問う形にする。 */
export type ProcessMiniCheck = {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
};

export type ProcessDemoSpec = {
  title: string;
  lead: string; // 何が分かるページか
  userScenario: string; // 利用者目線の入口（問いかけ）
  screen: ProcessScreen; // 画面上での操作
  actors: ProcessActor[];
  scenarios: ProcessScenario[]; // 裏側の処理ステップ（1つ以上）
  termMappings: ProcessTermMapping[]; // 用語対応
  examPoints: string[]; // 試験での問われ方
  miniCheck?: ProcessMiniCheck; // ミニ理解チェック
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

/** まとめ解説（確認問題のあとに読む、理解を固めるパート） */
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
  hookQuestion?: string; // 本文の冒頭に置く「最初に考えてみよう」の問いかけ
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
  processDemo?: ProcessDemoSpec; // 操作できる理解パート。設定された難テーマは専用構成で表示

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
