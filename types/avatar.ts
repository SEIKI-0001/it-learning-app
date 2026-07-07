// ITパスポート学習コーチ — 自分アバター（分身）の型定義
//
// 設計方針:
//   - アバターは学習成果の可視化・挑戦演出・達成感のための機能。問題の正解判定を
//     有利にする効果は一切持たせない。
//   - 装備の解放は既存のバッジ（lib/badges.ts）・チェックポイント突破・学習進捗に
//     紐づける。解放専用の別進捗は作らない（解放済みは獲得バッジ等から導出する）。
//   - 保存するのは「プリセットid・装備中アイテムid・更新日時」だけ。画像や
//     解放済みリストは保存しない（導出できる値を二重管理しない）。
//   - 称号・ランクも既存のランク制度（lib/rank.ts）を使い、新しい称号系は作らない。

import type { CheckpointId } from "@/types/checkpoint";

// ---------------------------------------------------------------------------
// プリセット（初期アバター4種）
// ---------------------------------------------------------------------------

export type AvatarPresetId = "majime" | "genki" | "cool" | "robo";

export type AvatarPresetDef = {
  id: AvatarPresetId;
  name: string;
  description: string;
};

// ---------------------------------------------------------------------------
// 装備スロット
// ---------------------------------------------------------------------------

export type AvatarEquipmentSlot =
  | "head" // 帽子・ヘッドセットなど
  | "face" // メガネ・ゴーグルなど
  | "body" // ジャケット・マントなど
  | "hand" // ノート・シールド・鍵など
  | "badge" // 胸元バッジ
  | "background" // 背景
  | "effect"; // オーラ・突破演出など

/** 表示順（管理画面・装備一覧で使う）。 */
export const AVATAR_SLOTS: AvatarEquipmentSlot[] = [
  "head",
  "face",
  "body",
  "hand",
  "badge",
  "background",
  "effect",
];

export const AVATAR_SLOT_LABELS: Record<AvatarEquipmentSlot, string> = {
  head: "あたま",
  face: "かお",
  body: "からだ",
  hand: "て",
  badge: "胸元バッジ",
  background: "背景",
  effect: "エフェクト",
};

// ---------------------------------------------------------------------------
// 装備アイテムと解放条件
// ---------------------------------------------------------------------------

/**
 * 装備の解放条件。既存の進行データ（獲得バッジ・クリア済みCP・完了トピック数）
 * だけで判定できる形に限定する（解放専用の進捗を持たない）。
 */
export type AvatarUnlockCondition =
  | { type: "initial" } // 最初から使える
  | { type: "badge"; badgeId: string } // 指定バッジを獲得
  | { type: "anyBadge"; badgeIds: string[] } // いずれかのバッジを獲得
  | { type: "checkpointCleared"; checkpointId: CheckpointId } // CP突破
  | { type: "topicsCompleted"; count: number }; // トピック学習完了数

export type AvatarItemDef = {
  id: string;
  slot: AvatarEquipmentSlot;
  name: string; // 日本語表示名（例: 学習ノート）
  description: string; // 初心者にも意味が分かる一言
  unlock: AvatarUnlockCondition;
};

// ---------------------------------------------------------------------------
// ユーザーのアバター状態（CheckpointProgress.avatar に保存）
// ---------------------------------------------------------------------------

/** スロット→装備中アイテムid（null/未定義=そのスロットは未装備）。 */
export type AvatarEquipped = Partial<Record<AvatarEquipmentSlot, string | null>>;

/**
 * 保存するアバター設定値。checkpoint_progress（jsonb）にまるごと入るため
 * DBマイグレーション不要で、既存の端末間マージ・LINE復元にそのまま乗る。
 * updatedAt は端末間マージで「後から変更した方」を採用するために持つ。
 */
export type AvatarProfile = {
  presetId: AvatarPresetId;
  equipped: AvatarEquipped;
  updatedAt: string; // ISO
};

// ---------------------------------------------------------------------------
// UI表示用の派生型
// ---------------------------------------------------------------------------

/** 装備1件の状態（定義＋解放済みか＋装備中か＋条件の表示文）。 */
export type AvatarItemStatus = {
  def: AvatarItemDef;
  unlocked: boolean;
  equipped: boolean;
  conditionLabel: string; // 常に表示できる解放条件（隠さない）
};
