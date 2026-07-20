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
  | "settings" // 設定
  | "circle" // 状態: 未着手・未到達
  | "circle-dot" // 状態: 現在地・学習中
  | "circle-check" // 状態: 完了・習得済み
  | "check-double" // 状態: 完全習得
  | "gift" // 今日の宝箱(デイリー報酬)
  // ---- /learn テーマ識別アイコン(lib/themeIcons.ts で18テーマに割当) ----
  | "building" // 企業活動
  | "scale" // 法務・標準化
  | "cart" // ビジネスインダストリ
  | "compass" // システム戦略・企画
  | "tool" // システム開発
  | "life-buoy" // サービスマネジメント
  | "binary" // 基礎理論・データサイエンス
  | "puzzle" // アルゴリズム・プログラミング
  | "cpu" // ハードウェア・コンピュータシステム
  | "palette" // 情報デザイン・情報メディア
  | "database" // データベース
  | "globe" // ネットワーク
  | "lock"; // 情報セキュリティ

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
  circle: <circle cx="12" cy="12" r="8" />,
  "circle-dot": (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  "circle-check": (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.6 12.3 2.3 2.3 4.5-4.9" />
    </>
  ),
  "check-double": (
    <>
      <path d="M17.5 7 7 17.5l-4.5-4.5" />
      <path d="m21.5 10-7.3 7.3-1.4-1.4" />
    </>
  ),
  gift: (
    <>
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M7.5 8a2.3 2.3 0 0 1 0-4.6C10 3.4 11.4 5.5 12 8c.6-2.5 2-4.6 4.5-4.6a2.3 2.3 0 0 1 0 4.6" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M9 8h2M13 8h2M9 12h2M13 12h2" />
      <path d="M10 21v-4h4v4" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3v18" />
      <path d="M6 7h12" />
      <path d="M6 7 3.5 12a2.5 2.5 0 0 0 5 0z" />
      <path d="M18 7l-2.5 5a2.5 2.5 0 0 0 5 0z" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.8h7.7a2 2 0 0 0 2-1.6L21 8H6" />
      <circle cx="10" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-2 6-6 2 2-6z" />
    </>
  ),
  tool: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2z" />
  ),
  "life-buoy": (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 4v4.8M12 15.2V20M4 12h4.8M15.2 12H20" />
    </>
  ),
  binary: (
    <>
      <rect x="3.5" y="7" width="6" height="10" rx="3" />
      <path d="M14 7v10" />
      <path d="M14 7l3-2v12" />
    </>
  ),
  puzzle: (
    <path d="M9 4h4a1.5 1.5 0 0 1 0 3 1.5 1.5 0 0 0 0 3h4a2 2 0 0 1 2 2v3a1.5 1.5 0 0 1-3 0 1.5 1.5 0 0 0 0 3v2H5v-4a1.5 1.5 0 0 0-3 0 1.5 1.5 0 0 1 0-3h3V9a2 2 0 0 1 2-2h2a1.5 1.5 0 0 0 0-3z" />
  ),
  cpu: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <rect x="10" y="10" width="4" height="4" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 8 0 1 0 0 16c1.5 0 2-1 2-2s-.5-1.5-.5-2.5S14.5 13 16 13h1.5A3.5 3.5 0 0 0 21 9.5C21 6 17 3 12 3Z" />
      <circle cx="8" cy="10" r="1" />
      <circle cx="8" cy="14" r="1" />
      <circle cx="12" cy="7.5" r="1" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
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
