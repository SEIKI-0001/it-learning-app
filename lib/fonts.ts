import { Geist, Geist_Mono } from "next/font/google";

// アプリ全体の書体。
// - Geist: 英数字（数値は tabular-nums と合わせて揃える）
// - 和文: OS の書体（Hiragino Sans / Noto Sans JP / Yu Gothic UI）。
//   Google Fonts の和文Webフォントは分割配信で GPOS が落ち、palt（約物・かなの詰め）が
//   効かない。和文が間延びして見えるため、palt が効く OS 書体に任せる（--font-app-sans は globals.css）。
// - Geist Mono: 時刻・目盛りなど等幅が要る数字だけ
// font-sans は「Geist → 和文」の順に並べ、英数字は Geist、和文は OS 書体で描く。

const geist = Geist({
  weight: ["400", "500", "600"],
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

export const appFontVariables = `${geist.variable} ${geistMono.variable}`;
