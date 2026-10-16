"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import LoadingScreen from "@/components/LoadingScreen";

// ログイン直後の振り分けだけを行う。紹介は LP（/lp）とログイン画面で済んでいるので、
// ここで紹介を繰り返さず、設定済みなら今日の学習へ、未設定なら初回設定へ進める。
// 未ログインで来た人は proxy が /lp へ送る。
export default function Home() {
  const router = useRouter();
  const [state] = useAppState();

  useEffect(() => {
    if (state === undefined) return;
    router.replace(state?.profile ? "/today" : "/onboarding");
  }, [router, state]);

  return <LoadingScreen />;
}
