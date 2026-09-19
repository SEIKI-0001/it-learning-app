// 配色ラボ（テスト環境専用）。/today・/progress を実物のままプレビューし、
// 背景・テーマカラー・アクセント・その他の色をその場で差し替えて確かめる。
// 本番（Vercel production）では 404。ローカル開発と Vercel のプレビューデプロイでだけ開ける。

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ThemeLab from "./ThemeLab";

export const metadata: Metadata = {
  title: "配色ラボ",
  robots: { index: false, follow: false },
};

function isTestEnvironment(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.VERCEL_ENV === "preview";
}

export default function ThemeLabPage() {
  if (!isTestEnvironment()) notFound();
  return <ThemeLab />;
}
