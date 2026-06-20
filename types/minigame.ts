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
export type MiniGameKind = "network-route";

// ---------------------------------------------------------------------------
// 通信ルートをつなげ: 通信の順番をカード並べ替えで完成させる。
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

export type MiniGameContent = NetworkRouteContent;

export type MiniGame = {
  /** ルートにも使う識別子（例: "network-route"） */
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
