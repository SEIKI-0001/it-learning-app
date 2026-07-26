"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import PageHeader from "@/components/ui/PageHeader";
import RankCard from "@/components/progress/RankCard";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";

// ランク全体像の専用ページ。進捗バナーからリンクで遷移する。
// ランクは累計XPで決まる「本人の成長段階」(他人比較ではない)。
export default function RankPage() {
  const router = useRouter();
  const [state] = useAppState();

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  if (state === undefined || state === null) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/progress", label: "進捗にもどる" }}
        title="ランク"
        description="累計XPで上がる、あなたの成長段階です。"
      />

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <RankCard exp={state.progress.exp} />
        <p className="px-1 text-xs leading-relaxed text-gray-500">
          ランクは他の人との比較ではなく、これまでの積み上げが見える指標です。
          学習・復習でXPがたまると、自然に次の段階へ進みます。
        </p>
      </div>

      <BottomNav />
    </main>
  );
}
