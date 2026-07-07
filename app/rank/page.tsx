"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppState } from "@/lib/useAppState";
import RankCard from "@/components/progress/RankCard";
import RankAvatarCard from "@/components/avatar/RankAvatarCard";
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
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-5 pt-5 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <Link href="/progress" className="text-sm font-bold text-white/90">
            ← 進捗にもどる
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold">ランク</h1>
          <p className="mt-1 text-sm text-white/90">
            累計XPで上がる、あなたの成長段階です。
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md md:max-w-2xl space-y-4 px-4 py-5">
        <RankAvatarCard state={state} />
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
