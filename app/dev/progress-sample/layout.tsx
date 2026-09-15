import type { Metadata } from "next";

// /progress 改善デザインのサンプル（テスト環境専用・検索対象外）。

export const metadata: Metadata = {
  title: "進捗（デザインサンプル）",
  robots: { index: false, follow: false },
};

export default function ProgressSampleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
