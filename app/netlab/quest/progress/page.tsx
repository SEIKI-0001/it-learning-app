import type { Metadata } from "next";
import NetworkQuestProgress from "@/components/network-quest/NetworkQuestProgress";

export const metadata: Metadata = {
  title: "学習の記録 | ネットワーク冒険ラボ",
  description: "ネットワーク冒険ラボのクリア状況、経験値、獲得バッジを振り返り、次のミッションに進みましょう。",
  robots: { index: false },
};

export default function NetworkQuestProgressPage() {
  return <NetworkQuestProgress />;
}
