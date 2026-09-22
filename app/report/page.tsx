"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import { buildWeeklyReportFacts } from "@/lib/weeklyReportFacts";
import PageHeader from "@/components/ui/PageHeader";
import WeeklyReportView from "@/components/report/WeeklyReportView";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";

function formatDay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

// 週間レポート。進捗画面からリンクで遷移する(常時表示はしない)。
// 数値はここで確定し(lib/weeklyReportFacts)、文章は AI またはテンプレートで添える。
export default function ReportPage() {
  const router = useRouter();
  const [state] = useAppState();

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  const facts = useMemo(() => (state ? buildWeeklyReportFacts(state) : null), [state]);

  if (state === undefined || state === null || !facts) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/progress", label: "進捗にもどる" }}
        title="週間レポート"
        description={`${formatDay(facts.period.start)}〜${formatDay(facts.period.end)} の1週間をふりかえります。`}
      />

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <WeeklyReportView facts={facts} />
      </div>

      <BottomNav />
    </main>
  );
}
