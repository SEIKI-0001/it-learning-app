// アバターの合成レンダラー。プリセット（素体）と装備（背景・エフェクト・
// 服・小物）を決まったレイヤー順で重ねて1枚のSVGにする。
// equipped には「解放済みに絞った装備」（lib/avatarUnlocks.ts の sanitizedEquipped）
// を渡すこと。ここでは解放判定をしない（表示専用）。

import type { AvatarEquipped, AvatarPresetId } from "@/types/avatar";
import { getAvatarPreset } from "@/lib/avatarPresets";
import { PRESET_ART } from "@/components/avatar/AvatarPresetArt";
import { ITEM_ART, type AvatarItemArt } from "@/components/avatar/AvatarItemArt";

type Props = {
  presetId: AvatarPresetId;
  equipped?: AvatarEquipped;
  /** 1辺のピクセル数（正方形）。 */
  size?: number;
  className?: string;
  /** スクリーンリーダー向けの説明。省略時はプリセット名から生成。 */
  label?: string;
};

function art(equipped: AvatarEquipped | undefined, slot: keyof AvatarEquipped): AvatarItemArt | undefined {
  const id = equipped?.[slot];
  return id ? ITEM_ART[id] : undefined;
}

export default function AvatarRenderer({
  presetId,
  equipped,
  size = 160,
  className,
  label,
}: Props) {
  const preset = getAvatarPreset(presetId);
  const background = art(equipped, "background");
  const effect = art(equipped, "effect");
  const body = art(equipped, "body");
  const badge = art(equipped, "badge");
  const face = art(equipped, "face");
  const head = art(equipped, "head");
  const hand = art(equipped, "hand");

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={label ?? `${preset.name}のアバター`}
    >
      {/* 背景装備が無いときの下地（清潔感のあるニュートラル） */}
      {!background && (
        <rect x={3} y={3} width={114} height={114} rx={14} fill="#eef1f6" />
      )}
      {background?.back}
      {effect?.back}
      {body?.back}
      {PRESET_ART[preset.id]}
      {body?.front}
      {badge?.front}
      {face?.front}
      {head?.front}
      {hand?.front}
      {effect?.front}
    </svg>
  );
}
