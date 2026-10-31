import type { Metadata } from "next";
import CyberMysteryPreview from "./CyberMysteryPreview";

// テスト環境の確認用ページ（サイバー攻撃の手口の謎解き版）。main 向けPRの前にこのコミットごと外す。
export const metadata: Metadata = {
  title: "確認用：サイバー攻撃の手口の謎解き版",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <CyberMysteryPreview old={params.v === "old"} />;
}
