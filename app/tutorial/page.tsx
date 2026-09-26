"use client";

import { useState } from "react";
import Link from "next/link";

export default function TutorialPage() {
  const [finished, setFinished] = useState(false);

  return (
    <main className="min-h-screen bg-brand-800 px-4 py-8 text-white md:py-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-brand-100">はじめての方へ</p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">勉強の進め方を知ろう</h1>
        <p className="mt-3 text-sm leading-relaxed text-brand-100">
          Todayから始めて、理解する・問題を解く・実力を測る流れを見てみましょう。
        </p>

        <video
          className="mt-6 aspect-video w-full rounded-xl bg-black shadow-xl"
          controls
          playsInline
          preload="metadata"
          src="/tutorial/first-study-guide.mp4"
          onEnded={() => setFinished(true)}
          aria-label="it-learning-app はじめての学習ガイド"
        >
          <track
            kind="captions"
            src="/tutorial/first-study-guide.vtt"
            srcLang="ja"
            label="日本語字幕"
          />
        </video>

        {finished && (
          <Link
            href="/onboarding"
            className="mt-6 block rounded-lg bg-white px-6 py-4 text-center text-base font-semibold text-brand-800 transition hover:bg-brand-50"
          >
            自分の学習プランをつくる
          </Link>
        )}
        <Link href="/onboarding" className="mt-5 block text-center text-sm font-medium text-brand-100 underline underline-offset-4">
          スキップして設定を始める
        </Link>
      </div>
    </main>
  );
}
