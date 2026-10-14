import type { Metadata } from "next";
import NetworkQuest from "@/components/network-quest/NetworkQuest";

export const metadata: Metadata = {
  title: "ネットワーク冒険ラボ | 遊んで学ぶITパスポート",
  description: "LAN、ルータ、DNS、HTTPS、メール通信を5つの体験ミッションで学ぼう。解説付きの確認問題からITパスポートの学習につながる、登録不要のネットワーク入門。",
};

export default async function NetworkQuestPage({ searchParams }: { searchParams: Promise<{ mission?: string | string[] }> }) {
  const { mission } = await searchParams;
  return <NetworkQuest key={typeof mission === "string" ? mission : "lan"} initialMissionId={typeof mission === "string" ? mission : "lan"} />;
}
