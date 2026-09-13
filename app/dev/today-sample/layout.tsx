import type { Metadata } from "next";
import { Geist, Geist_Mono, Zen_Kaku_Gothic_New } from "next/font/google";

// /today 改善デザインのサンプル（テスト環境専用・検索対象外）。
// フォントはこのサンプル配下にだけ読み込み、本番ページへは影響させない。

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
  variable: "--font-sample-sans",
});
const geist = Geist({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-sample-num",
});
const geistMono = Geist_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-sample-mono",
});

export const metadata: Metadata = {
  title: "今日の学習（デザインサンプル）",
  robots: { index: false, follow: false },
};

export default function TodaySampleLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${zenKaku.variable} ${geist.variable} ${geistMono.variable}`}>{children}</div>;
}
