"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import PageHeader from "@/components/ui/PageHeader";
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
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/progress", label: "進捗にもどる" }}
        title="週間レポート"
        description="直近7日間の積み上げをまとめました。"
      />

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <WeeklyReportCard state={state} />
      </div>

      <BottomNav />
    </main>
  );
}
