import { notFound, redirect } from "next/navigation";
import { getAllThemes } from "@/lib/learningCatalog";

// 初期版のテーマURLも、新しい固定カタログのテーマURLへ寄せる。
const LEGACY_THEME_IDS: Record<string, string> = {
  enterprise: "企業活動", "business-analysis": "業務分析・データ利活用",
  "law-standard": "法務・標準化", "business-strategy": "経営・技術戦略",
  "business-industry": "ビジネスインダストリ", "system-strategy": "システム戦略・企画",
  development: "システム開発", project: "プロジェクトマネジメント",
  service: "サービスマネジメント", audit: "システム監査・内部統制",
  fundamentals: "基礎理論・データサイエンス", algorithm: "アルゴリズム・プログラミング",
  hardware: "ハードウェア・コンピュータシステム", software: "ソフトウェア",
  design: "情報デザイン・情報メディア", database: "データベース",
  network: "ネットワーク", security: "情報セキュリティ",
};

export default async function LegacyThemePage({
  params,
}: { params: Promise<{ themeId: string }> }) {
  const { themeId } = await params;
  const title = LEGACY_THEME_IDS[themeId];
  const theme = getAllThemes().find((item) => item.title === title);
  if (!theme) notFound();
  redirect(`/learn/${theme.slug}`);
}
