// 進行状態の共通マーカー。クエストルート(/today)・チェックポイント台帳(/progress)・
// テーマ一覧(/learn)で同じ視覚語彙を使うための最小部品。
// 色だけに頼らず、アイコン形状の違い(circle/circle-dot/circle-check等)で状態を伝える。

import Icon, { type IconName } from "@/components/ui/Icon";

export type StateMarkerTone = "done" | "active" | "accent" | "muted";

const TONE_CLASS: Record<StateMarkerTone, string> = {
  done: "text-emerald-600",
  active: "text-brand-600",
  accent: "text-accent-600",
  muted: "text-gray-300",
};

type StateMarkerProps = {
  icon: IconName;
  tone: StateMarkerTone;
  /** 直前に状態が変わったマーカーだけ短いpop-inで気づかせる(reduced-motion時はCSS側で無効) */
  justChanged?: boolean;
  className?: string;
};

export default function StateMarker({
  icon,
  tone,
  justChanged = false,
  className = "h-5 w-5",
}: StateMarkerProps) {
  return (
    <Icon
      name={icon}
      className={`${className} ${TONE_CLASS[tone]} ${justChanged ? "animate-pop-in" : ""}`}
    />
  );
}
