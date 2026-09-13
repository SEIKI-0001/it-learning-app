import type { Metadata } from "next";
import { Geist, LINE_Seed_JP } from "next/font/google";

// /today 改善デザインのサンプル（テスト環境専用・検索対象外）。
// フォントはこのサンプル配下にだけ読み込み、本番ページへは影響させない。

const lineSeed = LINE_Seed_JP({
  weight: ["400", "700", "800"],
  subsets: ["latin"],
  preload: false,
  variable: "--font-line-seed",
});
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "今日の学習（デザインサンプル A7 Calm Light）",
  robots: { index: false, follow: false },
};

export default function TodaySampleLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${lineSeed.variable} ${geist.variable}`}>{children}</div>;
}
