import type { ReactNode } from "react";
import PublicShell from "@/components/guide/PublicShell";
import "./guide.css";

// 公開ガイド（未ログインで閲覧可。lib/auth/publicRoutes の PUBLIC_PREFIXES に登録）。

export default function GuideLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
