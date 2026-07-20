"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import LoadingScreen from "@/components/LoadingScreen";
import Mochit from "@/components/mochit/Mochit";
import Icon from "@/components/ui/Icon";

const POINTS = [
  "試験日から逆算した学習プラン",
  "今日やることが毎日わかる",
  "苦手と間違いを自動で復習",
  "LINEで続けられる",
];

// 未設定ユーザー向けの紹介ページ。学習設定後のホームは /today に一本化する。
export default function Home() {
  const router = useRouter();
  const [state] = useAppState();

  useEffect(() => {
    if (state?.profile) router.replace("/today");
  }, [router, state?.profile]);

  if (state === undefined || state?.profile) return <LoadingScreen />;

  return (
    <main className="min-h-screen bg-brand-800 px-5 py-10 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <span className="mb-6 inline-block rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold tracking-wide">
          ITパスポート合格支援
        </span>
        <div className="mb-4 flex justify-center" aria-hidden>
          <Mochit size="medium" animation="idle" className="justify-center" />
        </div>
        <h1 className="text-3xl font-bold leading-tight">ITパスポート学習コーチ</h1>
        <p className="mt-3 text-base font-semibold text-brand-100">
          あなたの試験日に合わせて、今日やることを案内します
        </p>
        <p className="mt-4 text-sm leading-relaxed text-brand-100">
          IT未経験でも大丈夫。ストラテジ・マネジメント・テクノロジの3分野を、
          <br />
          やさしい言葉と図解で少しずつ進めましょう。
        </p>

        <ul className="mt-8 w-full space-y-2.5">
          {POINTS.map((point) => (
            <li
              key={point}
              className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3 text-left text-sm"
            >
              <Icon name="check" className="h-4 w-4 shrink-0 text-brand-200" strokeWidth={2.2} />
              {point}
            </li>
          ))}
        </ul>

        <Link
          href="/onboarding"
          className="mt-9 w-full rounded-lg bg-white px-6 py-4 text-center text-base font-semibold text-brand-800 transition hover:bg-brand-50 active:scale-[0.99]"
        >
          学習をはじめる
        </Link>
        <Link href="/learn" className="mt-3 text-sm font-medium text-brand-100 underline underline-offset-4">
          まずはテーマを見てみる
        </Link>
      </div>
    </main>
  );
}
