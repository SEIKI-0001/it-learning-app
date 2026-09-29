import type { ReactNode } from "react";
import PublicShell from "@/components/guide/PublicShell";
import "../guide/guide.css";

// 公開ページ（未ログインで閲覧可。lib/auth/publicRoutes の PUBLIC_PREFIXES に登録）。
// 見た目は学習ガイドと共通（app/guide/guide.css）。

export default function Layout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
