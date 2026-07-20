// /learn の各テーマ行を識別する線画アイコン。
// 旧カードグリッド版で使っていた絵文字(theme.icon)を、同じ意味の線画アイコンに
// 置き換えて復活させる(絵文字をUIアイコンに使わない規約は維持する)。
import type { IconName } from "@/components/ui/Icon";
import type { LearningTheme } from "@/types/learningCatalog";

const THEME_ICON_BY_CHAPTER: Record<number, IconName> = {
  1: "building", // 企業活動
  2: "chart", // 業務分析・データ利活用
  3: "scale", // 法務・標準化
  4: "target", // 経営・技術戦略
  5: "cart", // ビジネスインダストリ
  6: "compass", // システム戦略・企画
  7: "tool", // システム開発
  8: "calendar", // プロジェクトマネジメント
  9: "life-buoy", // サービスマネジメント
  10: "search", // システム監査・内部統制
  11: "binary", // 基礎理論・データサイエンス
  12: "puzzle", // アルゴリズム・プログラミング
  13: "cpu", // ハードウェア・コンピュータシステム
  14: "settings", // ソフトウェア
  15: "palette", // 情報デザイン・情報メディア
  16: "database", // データベース
  17: "globe", // ネットワーク
  18: "lock", // 情報セキュリティ
};

const DEFAULT_THEME_ICON: IconName = "book-open";

export function getThemeIcon(theme: Pick<LearningTheme, "chapterNumber">): IconName {
  return THEME_ICON_BY_CHAPTER[theme.chapterNumber] ?? DEFAULT_THEME_ICON;
}
