"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import PageHeader from "@/components/ui/PageHeader";
import RankCard from "@/components/progress/RankCard";
import Mochit from "@/components/mochit/Mochit";
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
        <section className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <Mochit state="normal" size="small" animation="idle" />
          <p className="text-sm text-gray-600">
            XPの積み上げも、モチットと一緒に振り返ろう。
          </p>
        </section>
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
