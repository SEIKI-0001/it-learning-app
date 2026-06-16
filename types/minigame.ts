// ITパスポート学習コーチ — ミニゲームの型定義
//
// 方針:
//   - 図解（types/content.ts の DiagramSpec）と同じく「構造化データ＋レンダラ」方式。
//     ゲームの中身はすべてデータ（MiniGame）で持ち、描画と操作は components/minigames 側が担う。
//   - 目的は娯楽ではなく、理解しづらいテーマを「操作して直感的に理解する」短時間インタラクション。
//   - 学習コンテンツ（Topic）とは relatedTopicId / Topic.miniGameId で疎結合に紐づける。
//   - 結果（MiniGameResult）は後から Supabase に保存できる形にしておく（初回はローカルのみ）。
//
// 既存の types/content.ts には手を入れず、ここに独立した型を置く（図解レジストリと同方針）。

import type { Difficulty, TopicField } from "@/types/content";

/** ミニゲームの種類（content の判別子と一致させる） */
export type MiniGameKind =
  | "sql-treasure"
  | "auth-authorization"
  | "network-route";

// ---------------------------------------------------------------------------
// 1. SQL宝探し: 小さなテーブルから、条件に合う行をタップで選ぶ。
// ---------------------------------------------------------------------------

/** テーブル1問分（1ラウンド）。クリア後に別問題へ進めるよう配列で持つ。 */
export type SqlRound = {
  id: string;
  /** 今日のミッション（例: 部署が営業部で、売上が100以上の人を選ぼう） */
  mission: string;
  table: {
    name: string; // 例: "employees"
    columns: { key: string; label: string }[]; // 表示順
    rows: { id: number; values: (string | number)[] }[]; // columns と同じ並び
  };
  /** 正解の行 id（順不同） */
  correctRowIds: number[];
  /** 条件の説明（誤答時に「どの条件を見落としたか」を出すために使う） */
  conditions: string[];
  /** SQLで書くとどうなるか */
  sql: string;
  /** このラウンドの解説（短く） */
  explanation: string;
};

export type SqlTreasureContent = {
  kind: "sql-treasure";
  rounds: SqlRound[];
};

// ---------------------------------------------------------------------------
// 2. 認証・認可ゲート: 「人」と「行動」を見て、許可/拒否を判定する。
// ---------------------------------------------------------------------------

/** 判定の理由カテゴリ。解説で「認証の問題か認可の問題か」を示す。 */
export type AuthReason = "authentication" | "authorization" | "ok";

export type AuthCase = {
  id: string;
  person: string; // 例: "Aさん"
  personDesc: string; // 例: "ログイン済み・一般ユーザー"
  action: string; // 例: "管理画面を見る"
  /** 正解（許可できるか） */
  allowed: boolean;
  /** なぜそうなるか（認証/認可/問題なし） */
  reason: AuthReason;
  explanation: string;
};

export type AuthAuthorizationContent = {
  kind: "auth-authorization";
  cases: AuthCase[];
};

// ---------------------------------------------------------------------------
// 3. 通信ルートをつなげ: 通信の順番をカード並べ替えで完成させる。
// ---------------------------------------------------------------------------

export type NetworkStep = {
  id: string;
  label: string; // 例: "DNSでドメイン名からIPアドレスを調べる"
  detail: string; // そのステップの役割（解説）
};

export type NetworkRouteContent = {
  kind: "network-route";
  /** 正しい順番で並べたステップ（表示時はシャッフルする） */
  steps: NetworkStep[];
  /** 完了後に出す、全体の流れの短い説明 */
  summary: string;
};

// ---------------------------------------------------------------------------
// ミニゲーム本体（共通メタ + 種類別コンテンツ）
// ---------------------------------------------------------------------------

export type MiniGameContent =
  | SqlTreasureContent
  | AuthAuthorizationContent
  | NetworkRouteContent;

export type MiniGame = {
  /** ルートにも使う識別子（例: "sql-treasure"） */
  id: string;
  title: string;
  field: TopicField;
  /** 学べるテーマ（一覧・詳細で表示） */
  themes: string[];
  difficulty: Difficulty;
  /** 所要時間の目安（分） */
  estimatedMinutes: number;
  /** ルールが一瞬で分かる短い説明 */
  description: string;
  /** 試験で問われやすいポイント */
  examPoints: string[];
  /** 紐づく学習トピックの id（「次の学習へ」導線に使う） */
  relatedTopicId?: string;
  content: MiniGameContent;
};

// ---------------------------------------------------------------------------
// 結果（後から Supabase に保存できる形）。初回はローカル保存のみ。
// ---------------------------------------------------------------------------

export type MiniGameResult = {
  miniGameId: string;
  score: number;
  maxScore: number;
  completed: boolean;
  mistakes: string[]; // 間違えた内容（復習の手がかり）
  completedAt: string; // ISO8601
};
