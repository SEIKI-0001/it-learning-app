"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import LoadingScreen from "@/components/LoadingScreen";

const POINTS = [
  { emoji: "📅", text: "試験日から逆算した学習プラン" },
  { emoji: "📖", text: "今日やることが毎日わかる" },
  { emoji: "🔁", text: "苦手と間違いを自動で復習" },
  { emoji: "📱", text: "LINEで続けられる" },
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
    <main className="min-h-screen bg-gradient-to-b from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-10 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <span className="mb-6 inline-block rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold tracking-wide">
          ITパスポート合格支援
        </span>
        <div className="mb-4 text-6xl" aria-hidden>
          🎓
        </div>
        <h1 className="text-3xl font-extrabold leading-tight">ITパスポート学習コーチ</h1>
        <p className="mt-3 text-lg font-bold text-amber-200">
          あなたの試験日に合わせて、今日やることを案内します
        </p>
        <p className="mt-4 text-sm leading-relaxed text-indigo-100">
          IT未経験でも大丈夫。ストラテジ・マネジメント・テクノロジの3分野を、
          <br />
          やさしい言葉と図解で少しずつ進めましょう。
        </p>

        <ul className="mt-8 w-full space-y-2.5">
          {POINTS.map((point) => (
            <li
              key={point.text}
              className="flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 text-left text-sm font-semibold backdrop-blur-sm"
            >
              <span className="text-xl" aria-hidden>{point.emoji}</span>
              {point.text}
            </li>
          ))}
        </ul>

        <Link
          href="/onboarding"
          className="mt-9 w-full rounded-2xl bg-amber-300 px-6 py-4 text-center text-lg font-extrabold text-amber-900 shadow-lg transition active:scale-[0.98]"
        >
          🚀 学習をはじめる
        </Link>
        <Link href="/topics" className="mt-3 text-sm font-medium text-indigo-100 underline underline-offset-4">
          まずはトピックを見てみる
        </Link>
      </div>
    </main>
  );
}
