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
  | "chevron-left" // 前の画面へ戻る
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
  | "x" // 不正解・閉じる
  | "lightbulb" // ヒント・コツ
  | "flask" // 模擬試験
  | "save" // 保存
  | "trash" // 削除
  | "file-text" // 過去問・書類
  | "play" // 動画
  | "camera" // 撮影・画像から読み取る
  | "mic" // 音声で入力する
  | "volume" // 読み上げ オン
  | "volume-off" // 読み上げ オフ
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
  | "lock" // 情報セキュリティ
  // ---- 解説用ピクトグラム(教材の絵文字を置き換える) ----
  | "user"
  | "users"
  | "attacker"
  | "mail"
  | "key"
  | "unlock"
  | "smartphone"
  | "laptop"
  | "monitor"
  | "server"
  | "wifi"
  | "signal"
  | "plug"
  | "package"
  | "yen"
  | "truck"
  | "store"
  | "factory"
  | "home"
  | "landmark"
  | "briefcase"
  | "handshake"
  | "megaphone"
  | "message"
  | "bot"
  | "bug"
  | "zap"
  | "bell"
  | "eye"
  | "trend-up"
  | "trend-down"
  | "cloud"
  | "sun"
  | "storm"
  | "ban"
  | "upload"
  | "download"
  | "link"
  | "clipboard"
  | "hourglass"
  | "printer"
  | "car"
  | "train"
  | "door"
  | "map-pin"
  | "flag"
  | "tag"
  | "gem"
  | "help"
  | "smile"
  | "frown"
  | "thermometer"
  | "music"
  | "fingerprint"
  | "headphones"
  | "goggles"
  | "snowflake"
  | "battery"
  | "heart"
  | "heart-pulse"
  | "git-branch"
  | "tree"
  | "undo"
  | "plus"
  | "minus"
  | "arrow-down"
  | "fishhook"
  | "ambulance"
  | "microscope"
  | "grid"
  | "sparkle";

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
  "chevron-left": <path d="m15 6-6 6 6 6" />,
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
  x: <path d="M6 6l12 12M18 6L6 18" />,
  lightbulb: (
    <>
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 1.9v.3h5.2v-.3c0-.7.4-1.4 1-1.9A6 6 0 0 0 12 3Z" />
      <path d="M10 19h4" />
      <path d="M10.5 21.5h3" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v6.4L4.9 18a2 2 0 0 0 1.7 3h10.8a2 2 0 0 0 1.7-3L14 9.4V3" />
      <path d="M7.2 14.5h9.6" />
    </>
  ),
  save: (
    <>
      <path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M8 3v6h7V3" />
      <rect x="8" y="14" width="8" height="7" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 4h4" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10.5 11v7M13.5 11v7" />
    </>
  ),
  "file-text": (
    <>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="M9 12.5h6M9 16h6" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.8v6.4l5.2-3.2z" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  "volume-off": (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </>
  ),
  // ---- 解説用ピクトグラム(教材内の絵文字を置き換える。人・モノ・場所・記号) ----
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20.5a7 7 0 0 1 14 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8" />
      <path d="M17.5 14.4A6 6 0 0 1 21 20" />
    </>
  ),
  attacker: (
    <>
      <path d="M5 20.5a7 7 0 0 1 14 0" />
      <path d="M6.5 8a5.5 5.5 0 0 1 11 0" />
      <path d="M5 8h14" />
      <rect x="7.5" y="9.5" width="9" height="3.5" rx="1.75" />
      <path d="M12 9.5v3.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4" />
      <path d="m10.4 12.6 9.1-9.1" />
      <path d="m16 7 2.5 2.5M18.5 4.5 21 7" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.7-1.5" />
    </>
  ),
  smartphone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2" />
      <path d="M11 18.5h2" />
    </>
  ),
  laptop: (
    <>
      <rect x="4.5" y="5" width="15" height="10" rx="1" />
      <path d="M2.5 19h19l-1.5-4h-16z" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
  server: (
    <>
      <rect x="4" y="3.5" width="16" height="7" rx="1.5" />
      <rect x="4" y="13.5" width="16" height="7" rx="1.5" />
      <path d="M8 7h.01M8 17h.01" />
      <path d="M12 7h4M12 17h4" />
    </>
  ),
  wifi: (
    <>
      <path d="M3 9a13 13 0 0 1 18 0" />
      <path d="M6 12.5a8.5 8.5 0 0 1 12 0" />
      <path d="M9 16a4 4 0 0 1 6 0" />
      <circle cx="12" cy="19.2" r="0.6" />
    </>
  ),
  signal: (
    <>
      <path d="M5 20v-3M10 20v-7M15 20V9M20 20V5" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3v4M15 3v4" />
      <path d="M6 7h12v4a6 6 0 0 1-12 0z" />
      <path d="M12 17v4" />
    </>
  ),
  package: (
    <>
      <path d="M12 3 20 7v10l-8 4-8-4V7z" />
      <path d="m4 7 8 4 8-4" />
      <path d="M12 11v10" />
      <path d="m8 5 8 4" />
    </>
  ),
  yen: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 7 3.5 5 3.5-5" />
      <path d="M12 12v5.5M9 12.5h6M9 15h6" />
    </>
  ),
  truck: (
    <>
      <path d="M2.5 6h11v10h-11z" />
      <path d="M13.5 9.5H18l3 3.5v3h-7.5" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </>
  ),
  store: (
    <>
      <path d="M4 10v10h16V10" />
      <path d="M3 10 5 4h14l2 6a2.7 2.7 0 0 1-4.5 1.6A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-4.5-.4A2.7 2.7 0 0 1 3 10z" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  factory: (
    <>
      <path d="M3 21V10l5 3V10l5 3V5h4l1 16" />
      <path d="M3 21h18" />
      <path d="M7 17h2M12 17h2" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M10 21v-6h4v6" />
    </>
  ),
  landmark: (
    <>
      <path d="M3 9.5 12 4l9 5.5z" />
      <path d="M5.5 10v8M10 10v8M14 10v8M18.5 10v8" />
      <path d="M3 21h18M4 18h16" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="1.5" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M3 12.5h18" />
    </>
  ),
  handshake: (
    <>
      <path d="M2.5 8h3v8h-3" />
      <path d="M21.5 8h-3v8h3" />
      <path d="M5.5 9.5 8.5 7.5h3.2l1.6 1.3" />
      <path d="M18.5 9.5 15.5 7.5h-1.6L10 11a1.3 1.3 0 0 0 1.8 1.8l2.4-1.8 3.3 3.3" />
      <path d="M5.5 14.5 9.5 18a1.2 1.2 0 0 0 1.7-1.7" />
      <path d="m11.2 16.3.8.7a1.2 1.2 0 0 0 1.7-1.7" />
      <path d="m13.7 15.3.3.2a1.2 1.2 0 0 0 1.7-1.7l-.9-1" />
      <path d="m17.5 14.3 1-.8" />
    </>
  ),
  megaphone: (
    <>
      <path d="M3 10v4h3l9 5V5L6 10z" />
      <path d="M18 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="m6.5 14 1.5 6h2.5l-1-5.5" />
    </>
  ),
  message: (
    <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
  ),
  bot: (
    <>
      <rect x="4" y="8" width="16" height="12" rx="2.5" />
      <path d="M12 8V4.5M10.5 4h3" />
      <path d="M9 13h.01M15 13h.01" />
      <path d="M9.5 16.5h5" />
      <path d="M2 13v3M22 13v3" />
    </>
  ),
  bug: (
    <>
      <rect x="7.5" y="8" width="9" height="12" rx="4.5" />
      <path d="M9.5 8a2.5 2.5 0 0 1 5 0" />
      <path d="M12 12v8" />
      <path d="M3.5 13.5h4M16.5 13.5h4M4.5 8.5l3 2M19.5 8.5l-3 2M4.5 19l3-2M19.5 19l-3-2" />
    </>
  ),
  zap: <path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z" />,
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "trend-up": (
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  "trend-down": (
    <>
      <path d="m3 7 6 6 4-4 8 8" />
      <path d="M15 17h6v-6" />
    </>
  ),
  cloud: <path d="M7 19a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4.8 4.8 0 0 1-.5 9.5z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  storm: (
    <>
      <path d="M7 15a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 5.5a4.8 4.8 0 0 1 .5 9.5" />
      <path d="m12.5 12-2.5 4h4l-2.5 4" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V3.5" />
      <path d="m7 8 5-4.5L17 8" />
      <path d="M4 15v4a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5V15" />
      <path d="m7 10.5 5 4.5 5-4.5" />
      <path d="M4 15v4a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-4" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3.6-3.6a4 4 0 0 0-5.7-5.7L12.5 5.8" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3.6 3.6a4 4 0 0 0 5.7 5.7l1.1-1.1" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="17" rx="1.5" />
      <rect x="9" y="2.5" width="6" height="4" rx="1" />
      <path d="M8.5 11h7M8.5 15h5" />
    </>
  ),
  hourglass: (
    <>
      <path d="M6 2.5h12M6 21.5h12" />
      <path d="M7 2.5c0 4.5 5 6 5 9.5s-5 5-5 9.5M17 2.5c0 4.5-5 6-5 9.5s5 5 5 9.5" />
    </>
  ),
  printer: (
    <>
      <path d="M7 9V3h10v6" />
      <rect x="3" y="9" width="18" height="8" rx="1.5" />
      <path d="M7 14h10v7H7z" />
    </>
  ),
  car: (
    <>
      <path d="M3 16v-3l2-5.5A1.5 1.5 0 0 1 6.4 6.5h11.2A1.5 1.5 0 0 1 19 7.5l2 5.5v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M3.5 12.5h17" />
      <circle cx="7" cy="17" r="1.8" />
      <circle cx="17" cy="17" r="1.8" />
    </>
  ),
  train: (
    <>
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M5 10h14" />
      <path d="M9 13.5h.01M15 13.5h.01" />
      <path d="m8 21 1.5-4M16 21l-1.5-4" />
    </>
  ),
  door: (
    <>
      <path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17" />
      <path d="M3 21h18" />
      <path d="M15 12h.01" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h12l-2.5 4L17 12H5" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </>
  ),
  gem: (
    <>
      <path d="M6 3.5h12l3.5 5L12 21 2.5 8.5z" />
      <path d="M2.5 8.5h19" />
      <path d="m9 3.5-1.5 5L12 21l4.5-12.5-1.5-5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.6 2.6 0 0 1 5 1c0 1.8-2.5 2.2-2.5 3.8" />
      <path d="M12 17.3h.01" />
    </>
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14a4.2 4.2 0 0 0 7 0" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  frown: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 16.5a4.2 4.2 0 0 1 7 0" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  thermometer: (
    <>
      <path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z" />
      <path d="M12 10v6" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5.5L20 3.5v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="15.5" r="2.5" />
    </>
  ),
  fingerprint: (
    <>
      <path d="M7 6.5A7 7 0 0 1 19 11.5v1.5" />
      <path d="M5 10.5a7 7 0 0 0-.2 1.5v2.5" />
      <path d="M8.5 20a14 14 0 0 1-1-6v-2a4.5 4.5 0 0 1 9 0v1.5" />
      <path d="M12 12v2.5a12 12 0 0 0 1.5 6" />
      <path d="M16.5 17a14 14 0 0 1-.5 3.5" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="4.5" height="6.5" rx="1.5" />
      <rect x="16.5" y="14" width="4.5" height="6.5" rx="1.5" />
    </>
  ),
  goggles: (
    <>
      <path d="M3 9.5a1.5 1.5 0 0 1 1.5-1.5h15A1.5 1.5 0 0 1 21 9.5v5a2 2 0 0 1-2 2h-3.5L13.5 14h-3l-2 2.5H5a2 2 0 0 1-2-2z" />
    </>
  ),
  snowflake: (
    <>
      <path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6" />
      <path d="m9.5 4 2.5 2 2.5-2M9.5 20l2.5-2 2.5 2" />
    </>
  ),
  battery: (
    <>
      <rect x="2.5" y="7" width="16" height="10" rx="2" />
      <path d="M21.5 10.5v3" />
      <path d="M6 10.5v3M9.5 10.5v3" />
    </>
  ),
  heart: (
    <path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z" />
  ),
  "heart-pulse": (
    <>
      <path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z" />
      <path d="M4.5 12.5h4l1.5-2.5 2.5 5 1.5-2.5h5.5" />
    </>
  ),
  "git-branch": (
    <>
      <circle cx="6" cy="5.5" r="2" />
      <circle cx="6" cy="18.5" r="2" />
      <circle cx="18" cy="8" r="2" />
      <path d="M6 7.5v9" />
      <path d="M18 10c0 4-6 3.5-11 7" />
    </>
  ),
  tree: (
    <>
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <rect x="3" y="17" width="6" height="4" rx="1" />
      <rect x="15" y="17" width="6" height="4" rx="1" />
      <path d="M12 7v5M6 17v-5h12v5" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  "arrow-down": (
    <>
      <path d="M12 4v16" />
      <path d="m5 13 7 7 7-7" />
    </>
  ),
  fishhook: (
    <>
      <path d="M15 3v10.5a5 5 0 0 1-10 0V12" />
      <path d="m3 14 2-2 2 2" />
      <circle cx="15" cy="3" r="0.6" />
    </>
  ),
  ambulance: (
    <>
      <path d="M2.5 6.5h11v10h-11z" />
      <path d="M13.5 9.5H18l3 3.5v3.5h-7.5" />
      <path d="M8 9v5M5.5 11.5h5" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </>
  ),
  microscope: (
    <>
      <path d="M6 21h12" />
      <path d="M8 18h8" />
      <path d="m10 3 4 1.2-2.4 8-4-1.2z" />
      <path d="M9.6 12.5 9 14.5" />
      <path d="M14.5 9.5a5.5 5.5 0 0 1 1.5 8.5" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M3.5 9.2h17M3.5 14.8h17M9.2 3.5v17M14.8 3.5v17" />
    </>
  ),
  sparkle: <path d="M12 3c.6 4.4 1.9 6 6.5 7-4.6 1-5.9 2.6-6.5 7-.6-4.4-1.9-6-6.5-7 4.6-1 5.9-2.6 6.5-7z" />,
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
