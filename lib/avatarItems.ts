// 装備アイテムの定義（静的データ）。
//
// 方針:
//   - 解放条件は既存のバッジ（lib/badges.ts の id）・チェックポイント突破・
//     トピック完了数に紐づける。装備解放のための別バッジ・別進捗は作らない。
//   - 配列の並び＝おおまかな進行順。/ 「次に解放できる装備」はこの順で先頭の
//     未解放アイテムを出す。
//   - 装備はすべて見た目だけの効果。問題の正解判定には一切影響しない。

import type { AvatarItemDef } from "@/types/avatar";

export const AVATAR_ITEMS: AvatarItemDef[] = [
  // ---- 最初から使える基本セット --------------------------------------------
  {
    id: "headset-beginner",
    slot: "head",
    name: "初心者ヘッドセット",
    description: "学習をはじめた人の定番装備。音声解説もばっちり聞けそう。",
    unlock: { type: "initial" },
  },
  {
    id: "bg-study-room",
    slot: "background",
    name: "学習部屋背景",
    description: "落ち着いて勉強できる、あなたの学習部屋。",
    unlock: { type: "initial" },
  },
  {
    id: "note-basic",
    slot: "hand",
    name: "学習ノート",
    description: "最初のトピックを学び終えた記念のノート。",
    unlock: { type: "topicsCompleted", count: 1 },
  },

  // ---- CP1〜2（全体像・基礎理解）で解放 ------------------------------------
  {
    id: "note-plan",
    slot: "hand",
    name: "企画ノート",
    description: "ストラテジ系の学習で手に入る、アイデアを書き留めるノート。",
    unlock: { type: "badge", badgeId: "b-cp1-touch-strat" },
  },
  {
    id: "badge-coordination",
    slot: "badge",
    name: "調整力バッジ",
    description: "マネジメント系の学習で手に入る、チームをまとめる力の証。",
    unlock: { type: "badge", badgeId: "b-cp1-touch-mgmt" },
  },
  {
    id: "bg-checkpoint",
    slot: "background",
    name: "チェックポイント挑戦背景",
    description: "はじめてのチェックポイント突破を記念した、冒険の道の背景。",
    unlock: { type: "checkpointCleared", checkpointId: "cp1" },
  },
  {
    id: "effect-breakthrough",
    slot: "effect",
    name: "突破エフェクト",
    description: "突破試験に合格した人だけがまとえる、勝利のきらめき。",
    unlock: {
      type: "anyBadge",
      badgeIds: [
        "b-cp1-final",
        "b-cp2-final",
        "b-cp3-final",
        "b-cp4-final",
        "b-cp5-final",
        "b-cp6-final",
      ],
    },
  },
  {
    id: "goggles-network",
    slot: "face",
    name: "ネットワークゴーグル",
    description: "テクノロジ系の基礎を固めた人のゴーグル。通信の流れが見えるかも。",
    unlock: { type: "badge", badgeId: "b-cp2-basics-tech" },
  },
  {
    id: "notebook-project",
    slot: "hand",
    name: "プロジェクト手帳",
    description: "マネジメント系の基礎を固めた人の手帳。予定管理はおまかせ。",
    unlock: { type: "badge", badgeId: "b-cp2-basics-mgmt" },
  },
  {
    id: "jacket-business",
    slot: "body",
    name: "ビジネスジャケット",
    description: "ストラテジ系の基礎を固めた人の一着。経営の話が似合ってくる。",
    unlock: { type: "badge", badgeId: "b-cp2-basics-strat" },
  },
  {
    id: "jacket-apprentice",
    slot: "body",
    name: "IT見習いジャケット",
    description: "15テーマを踏破した見習いの証。ここから本格スタート。",
    unlock: { type: "badge", badgeId: "b-cp2-topics-15" },
  },

  // ---- CP3（確認問題定着）で解放 --------------------------------------------
  {
    id: "glasses-focus",
    slot: "face",
    name: "集中メガネ",
    description: "確認問題を安定して解けるようになった人の、集中力アップメガネ。",
    unlock: { type: "badge", badgeId: "b-cp3-quiz-20" },
  },
  {
    id: "shield-security",
    slot: "hand",
    name: "セキュリティシールド",
    description: "テクノロジ系の演習を積んだ人の盾。脅威から身を守る。",
    unlock: { type: "badge", badgeId: "b-cp3-quiz-tech" },
  },
  {
    id: "board-task",
    slot: "hand",
    name: "タスク管理ボード",
    description: "マネジメント系の演習を積んだ人のボード。進捗が一目でわかる。",
    unlock: { type: "badge", badgeId: "b-cp3-quiz-mgmt" },
  },
  {
    id: "badge-decision",
    slot: "badge",
    name: "判断力バッジ",
    description: "ストラテジ系の演習を積んだ人の証。迷わず選べる判断力。",
    unlock: { type: "badge", badgeId: "b-cp3-quiz-strat" },
  },

  // ---- CP4（弱点克服）で解放 ------------------------------------------------
  {
    id: "aura-focus",
    slot: "effect",
    name: "集中オーラ",
    description: "弱点克服をやり遂げた人がまとう、静かな集中のオーラ。",
    unlock: {
      type: "anyBadge",
      badgeIds: ["b-cp4-review-light", "b-cp4-weak-reduce"],
    },
  },
  {
    id: "gloves-engineer",
    slot: "hand",
    name: "エンジニアグローブ",
    description: "30テーマを定着させた人の作業グローブ。手を動かして覚えた証。",
    unlock: { type: "badge", badgeId: "b-cp4-mastered-30" },
  },

  // ---- CP5〜6（過去問準備・総仕上げ）で解放 ---------------------------------
  {
    id: "key-cipher",
    slot: "hand",
    name: "暗号化キー",
    description: "過去問レベルに挑める人の鍵。合格への扉を開ける。",
    unlock: { type: "badge", badgeId: "b-cp5-kakomon-ready" },
  },
  {
    id: "cape-challenger",
    slot: "body",
    name: "合格チャレンジャーマント",
    description: "過去問準備のチェックポイントを突破した挑戦者のマント。",
    unlock: { type: "checkpointCleared", checkpointId: "cp5" },
  },
  {
    id: "bg-goal",
    slot: "background",
    name: "合格チャレンジ背景",
    description: "合格圏に入った人だけが見られる、本番直前の景色。",
    unlock: { type: "badge", badgeId: "b-cp6-high-readiness" },
  },
];

const ITEM_BY_ID = new Map(AVATAR_ITEMS.map((i) => [i.id, i]));

export function getAvatarItem(id: string): AvatarItemDef | undefined {
  return ITEM_BY_ID.get(id);
}

export function getAvatarItemsBySlot(
  slot: AvatarItemDef["slot"],
): AvatarItemDef[] {
  return AVATAR_ITEMS.filter((i) => i.slot === slot);
}
