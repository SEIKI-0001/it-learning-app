import type { Metadata } from "next";
import AuditMysteryPreview from "./AuditMysteryPreview";

// テスト環境の確認用ページ（システム監査の謎解き版）。main 向けPRの前にこのコミットごと外す。
export const metadata: Metadata = {
  title: "確認用：システム監査の謎解き版",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <AuditMysteryPreview old={params.v === "old"} />;
}
