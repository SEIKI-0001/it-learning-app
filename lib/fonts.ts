import { Geist, Geist_Mono, Zen_Kaku_Gothic_New } from "next/font/google";

// アプリ全体の書体。
// - Geist: 英数字（数値は tabular-nums と合わせて揃える）
// - Zen Kaku Gothic New: 和文。太さは 400 / 500 を基本にする
// - Geist Mono: 時刻・目盛りなど等幅が要る数字だけ
// font-sans は「Geist → Zen Kaku」の順に並べ、英数字は Geist、和文は Zen Kaku で描く。

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-app-sans",
});

const geist = Geist({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-app-num",
});

const geistMono = Geist_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-app-mono",
});

export const appFontVariables = `${zenKaku.variable} ${geist.variable} ${geistMono.variable}`;
