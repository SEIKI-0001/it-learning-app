// 共通SVGアイコン。絵文字をUIアイコンとして使わず、線画で統一する。
// 24x24 viewBox / stroke=currentColor。色は親の text-* で決まる。
// モチット(キャラクター表現)とは役割を分け、こちらは機能の記号だけを担う。

import type { SVGProps } from "react";

export type IconName =
  | "book-open" // 今日の学習
  | "library" // 学ぶ(教材一覧)
  | "rotate" // 復習
  | "chart" // 進捗
  | "ellipsis" // その他
  | "search"
  | "arrow-right"
  | "chevron-right"
  | "chevron-down"
  | "check"
  | "clock"
  | "calendar"
  | "flame" // ストリーク
  | "shield" // おまもり
  | "target" // 目標
  | "pen" // 記述・自分の言葉で説明
  | "alert" // 注意
  | "map" // 学習計画・ロードマップ
  | "list" // シラバス・一覧
  | "award" // バッジ
  | "star" // ランク
  | "layers" // 単語帳
  | "sprout" // モチット・成長
  | "settings"; // 設定

const PATHS: Record<IconName, React.ReactNode> = {
  "book-open": (
    <>
      <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
    </>
  ),
  library: (
    <>
      <path d="M4 5v15" />
      <path d="M9 5v15" />
      <path d="m14 6 4.2 14" />
    </>
  ),
  rotate: (
    <>
      <path d="M3 12a9 9 0 1 0 2.6-6.3L3 8.2" />
      <path d="M3 3.5v4.7h4.7" />
    </>
  ),
  chart: (
    <>
      <path d="M5 20v-6" />
      <path d="M12 20V9" />
      <path d="M19 20V4" />
    </>
  ),
  ellipsis: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M4 12h16" />
      <path d="m13 5 7 7-7 7" />
    </>
  ),
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </>
  ),
  flame: (
    <path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-2-1-3.9-2.8-5.5-1.7-1.5-3-3.5-3.4-5.8-2 1.8-2.9 3.6-2 5.6.5 1 .9 1.7.9 2.9a2.3 2.3 0 0 1-4.5.7c-.5.7-1.2 1.8-1.2 3.1A6.5 6.5 0 0 0 12 21z" />
  ),
  shield: (
    <path d="M12 2.5 19.5 5.5v6c0 4.6-3.2 7.9-7.5 9.5-4.3-1.6-7.5-4.9-7.5-9.5v-6z" />
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.5" />
    </>
  ),
  pen: (
    <>
      <path d="m17 3 4 4L8 20l-5 1 1-5z" />
      <path d="m14 6 4 4" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V13" />
      <path d="M12 16.5h.01" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </>
  ),
  list: (
    <>
      <path d="M8.5 6H20" />
      <path d="M8.5 12H20" />
      <path d="M8.5 18H20" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5.5" />
      <path d="m9.2 13.6-1.4 6.9 4.2-2.4 4.2 2.4-1.4-6.9" />
    </>
  ),
  star: (
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.8 1-5.9-4.3-4.2 5.9-.8z" />
  ),
  layers: (
    <>
      <path d="m12 3.5 8.5 4.7L12 13 3.5 8.2z" />
      <path d="m3.5 13.2 8.5 4.7 8.5-4.7" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13C12 9.5 9.5 7 6 7c0 3.5 2.5 6 6 6z" />
      <path d="M12 11c0-3 2-5.5 5.5-5.5 0 3-2 5.5-5.5 5.5z" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9" />
      <circle cx="16.5" cy="7" r="2.5" />
      <path d="M20 17h-9" />
      <circle cx="7.5" cy="17" r="2.5" />
    </>
  ),
};

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  /** 意味を持つアイコンにだけ指定する。省略時は装飾扱い(aria-hidden) */
  label?: string;
};

export default function Icon({ name, label, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      className={className ?? "h-5 w-5"}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
