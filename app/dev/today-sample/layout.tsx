import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_JP } from "next/font/google";

// /today 改善デザインのサンプル（テスト環境専用・検索対象外）。
// フォントはこのサンプル配下にだけ読み込み、本番ページへは影響させない。

const plexJp = IBM_Plex_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
  variable: "--font-plex-jp",
});
const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "今日の学習（デザインサンプル）",
  robots: { index: false, follow: false },
};

export default function TodaySampleLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${plexJp.variable} ${plexMono.variable}`}>{children}</div>;
}
