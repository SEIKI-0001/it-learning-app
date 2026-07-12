import type { Topic, TopicField } from "@/types/content";

export type LearnTheme = {
  id: string;
  field: TopicField;
  title: string;
  description: string;
  matches: (topic: Topic) => boolean;
};

// 参考書の目次として使う固定の18章。レッスン自体の並び順は data/topics のまま保つ。
export const LEARN_THEMES: LearnTheme[] = [
  { id: "enterprise", field: "strategy", title: "企業活動", description: "企業の仕組み、会計、組織での活動を学びます。", matches: (t) => /企業活動|会計・財務|経営管理システム/.test(t.category) },
  { id: "business-analysis", field: "strategy", title: "業務分析・データ利活用", description: "業務を見える化し、データを活用する考え方を学びます。", matches: (t) => /マーケティング|ビジネスプロセス|データ活用/.test(t.category) },
  { id: "law-standard", field: "strategy", title: "法務・標準化", description: "知的財産、関連法規、標準化を学びます。", matches: (t) => /法務|標準化/.test(t.category) },
  { id: "business-strategy", field: "strategy", title: "経営・技術戦略", description: "経営戦略と技術を生かす考え方を学びます。", matches: (t) => /経営戦略/.test(t.category) },
  { id: "business-industry", field: "strategy", title: "ビジネスインダストリ", description: "ITを活用した事業とサービスの形を学びます。", matches: (t) => /ビジネスインダストリ/.test(t.category) },
  { id: "system-strategy", field: "strategy", title: "システム戦略・企画", description: "情報システムの企画から導入までを学びます。", matches: (t) => /システム戦略/.test(t.category) },
  { id: "development", field: "management", title: "システム開発", description: "要件定義、設計、テストなど開発の流れを学びます。", matches: (t) => /開発プロセス/.test(t.category) },
  { id: "project", field: "management", title: "プロジェクトマネジメント", description: "QCD、計画、リスク管理を学びます。", matches: (t) => /プロジェクトマネジメント/.test(t.category) },
  { id: "service", field: "management", title: "サービスマネジメント", description: "安定したITサービスを提供・改善する方法を学びます。", matches: (t) => /サービスマネジメント/.test(t.category) },
  { id: "audit", field: "management", title: "システム監査・内部統制", description: "監査と統制による信頼性の確保を学びます。", matches: (t) => /システム監査/.test(t.category) },
  { id: "fundamentals", field: "technology", title: "基礎理論・データサイエンス", description: "情報の表現、論理、データを読む基礎を学びます。", matches: (t) => /基礎理論|データ活用|AI/.test(t.category) && !/アルゴリズム|プログラミング/.test(t.category) },
  { id: "algorithm", field: "technology", title: "アルゴリズム・プログラミング", description: "処理の手順とプログラムの基本を学びます。", matches: (t) => /アルゴリズム|プログラミング/.test(t.category) },
  { id: "hardware", field: "technology", title: "ハードウェア・コンピュータシステム", description: "コンピュータを構成する装置と仕組みを学びます。", matches: (t) => /コンピュータ構成要素|システム構成|IoT/.test(t.category) },
  { id: "software", field: "technology", title: "ソフトウェア", description: "OS、クラウド、信頼性などソフトウェアの役割を学びます。", matches: (t) => /技術要素（ソフトウェア）|クラウド/.test(t.category) },
  { id: "design", field: "technology", title: "情報デザイン・情報メディア", description: "使いやすさ、表現、メディアの基礎を学びます。", matches: (t) => /ヒューマンインタフェース|マルチメディア/.test(t.category) },
  { id: "database", field: "technology", title: "データベース", description: "データの整理、検索、整合性を学びます。", matches: (t) => /データベース/.test(t.category) },
  { id: "network", field: "technology", title: "ネットワーク", description: "通信、インターネット、接続の仕組みを学びます。", matches: (t) => /ネットワーク/.test(t.category) },
  { id: "security", field: "technology", title: "情報セキュリティ", description: "脅威、認証、暗号、セキュリティ対策を学びます。", matches: (t) => /セキュリティ/.test(t.category) },
];

export const LEARN_FIELD_ORDER: TopicField[] = ["strategy", "management", "technology"];

export function getTheme(id: string) {
  return LEARN_THEMES.find((theme) => theme.id === id);
}

export function getThemeLessons(theme: LearnTheme, topics: Topic[]) {
  return topics.filter(theme.matches);
}

export function getThemeSections(theme: LearnTheme, topics: Topic[]) {
  return Array.from(
    getThemeLessons(theme, topics).reduce((sections, topic) => {
      const lessons = sections.get(topic.category) ?? [];
      lessons.push(topic);
      sections.set(topic.category, lessons);
      return sections;
    }, new Map<string, Topic[]>()),
  );
}
