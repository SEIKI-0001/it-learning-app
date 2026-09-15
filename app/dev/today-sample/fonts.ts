import { Geist, Geist_Mono, Zen_Kaku_Gothic_New } from "next/font/google";

// デザインサンプル（/dev/today-sample・/dev/progress-sample）共通の書体。
// サンプル配下のレイアウトでだけ読み込み、本番ページへは影響させない。

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

export const sampleFontClassName = `${zenKaku.variable} ${geist.variable} ${geistMono.variable}`;
