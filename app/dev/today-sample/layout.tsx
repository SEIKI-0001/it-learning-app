import type { Metadata } from "next";
import { sampleFontClassName } from "./fonts";

// /today 改善デザインのサンプル（テスト環境専用・検索対象外）。

export const metadata: Metadata = {
  title: "今日の学習（デザインサンプル）",
  robots: { index: false, follow: false },
};

export default function TodaySampleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={sampleFontClassName}>{children}</div>;
}
