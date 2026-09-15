import type { Metadata } from "next";
import { sampleFontClassName } from "../today-sample/fonts";

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
  return <div className={sampleFontClassName}>{children}</div>;
}
