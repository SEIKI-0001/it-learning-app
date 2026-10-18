import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import TodayPage from "@/app/today/page";
import LearnPage from "@/app/learn/page";
import ReviewPage from "@/app/review/page";
import ProgressPage from "@/app/progress/page";
import MorePage from "@/app/more/page";
import PlanPage from "@/app/plan/page";
import GlossaryPage from "@/app/glossary/page";
import BadgesPage from "@/app/badges/page";
import ReportPage from "@/app/report/page";
import SettingsPage from "@/app/settings/page";
import PreviewShell from "../_lib/PreviewShell";

// テスト環境での確認用（ログインすると本番ドメインへ戻されるため、実画面をサンプルデータで表示する）。
// main へ入れる前に /lp/preview ディレクトリごと削除する。

export const metadata: Metadata = {
  title: "画面確認（テスト環境）",
  robots: { index: false, follow: false },
};

const SCREENS: Record<string, ComponentType> = {
  today: TodayPage,
  learn: LearnPage,
  review: ReviewPage,
  progress: ProgressPage,
  more: MorePage,
  plan: PlanPage,
  glossary: GlossaryPage,
  badges: BadgesPage,
  report: ReportPage,
  settings: SettingsPage,
};

export default async function Page({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  const Screen = SCREENS[screen];
  if (!Screen) notFound();
  return (
    <PreviewShell screen={screen}>
      <Screen />
    </PreviewShell>
  );
}
