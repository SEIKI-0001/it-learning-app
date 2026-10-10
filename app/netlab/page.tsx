import type { Metadata } from "next";
import NetLab from "@/components/netlab/NetLabClient";

// ネットワーク構築ラボ（プロトタイプ）。ログイン不要・検索に出さない試作ページ。
export const metadata: Metadata = {
  title: "オフィスネットワーク構築ラボ（試作）",
  description: "小さな会社のオフィスに機器を置き、ケーブルでつないで設定し、通信が届くかを確かめるネットワーク構築の体験。",
  robots: { index: false, follow: false },
};

export default function NetLabPage() {
  return <NetLab />;
}
