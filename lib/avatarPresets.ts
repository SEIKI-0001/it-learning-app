// 初期アバターのプリセット定義（静的データ）。
// 見た目そのもの（SVG）は components/avatar/AvatarPresetArt.tsx に置き、
// ここは選択UI・保存値のための定義だけを持つ。

import type { AvatarPresetDef, AvatarPresetId } from "@/types/avatar";

export const AVATAR_PRESETS: AvatarPresetDef[] = [
  {
    id: "majime",
    name: "まじめタイプ",
    description: "コツコツ積み上げるのが得意。毎日の学習を着実にこなす分身です。",
  },
  {
    id: "genki",
    name: "元気タイプ",
    description: "勢いで進むのが得意。連続学習やチャレンジで力を発揮する分身です。",
  },
  {
    id: "cool",
    name: "クールタイプ",
    description: "冷静に弱点を分析するのが得意。復習と苦手克服が似合う分身です。",
  },
  {
    id: "robo",
    name: "ロボタイプ",
    description: "学習データを記録するのが得意。ITの相棒らしいマスコット型の分身です。",
  },
];

const PRESET_BY_ID = new Map(AVATAR_PRESETS.map((p) => [p.id, p]));

export function getAvatarPreset(id: AvatarPresetId): AvatarPresetDef {
  return PRESET_BY_ID.get(id) ?? AVATAR_PRESETS[0];
}

export function isAvatarPresetId(id: string): id is AvatarPresetId {
  return PRESET_BY_ID.has(id as AvatarPresetId);
}
