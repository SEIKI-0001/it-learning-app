import type { Metadata } from "next";
import NetLab from "@/components/netlab/NetLabClient";

// ネットワーク構築ラボ（β）。ログイン不要。「その他」から入る。β のあいだは検索に出さない。
export const metadata: Metadata = {
  title: "ネットワーク構築ラボ（β）",
  description: "小さな会社のオフィスに機器を置き、ケーブルでつないで設定し、通信が届くかを確かめるネットワーク構築の体験。",
  robots: { index: false, follow: false },
};

export default function NetLabPage() {
  return <NetLab />;
}
