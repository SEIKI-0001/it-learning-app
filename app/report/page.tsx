"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppState } from "@/lib/useAppState";
import WeeklyReportCard from "@/components/progress/WeeklyReportCard";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";

// 週間レポート専用ページ。進捗画面からリンクで遷移する(常時表示はしない)。
export default function ReportPage() {
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
      <header className="bg-emerald-700 px-4 pb-5 pt-5 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <Link
            href="/progress"
            className="text-sm font-bold text-white/90"
          >
            ← 進捗にもどる
          </Link>
          <h1 className="mt-2 text-2xl font-bold">週間レポート</h1>
          <p className="mt-1 text-sm text-white/90">
            直近7日間の積み上げをまとめました。
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md md:max-w-2xl space-y-4 px-4 py-5">
        <WeeklyReportCard state={state} />
      </div>

      <BottomNav />
    </main>
  );
}
