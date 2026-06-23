"use client";

import Link from "next/link";
import { getAllGlossaryTerms } from "@/lib/content";
import FlashcardDeck from "@/components/glossary/FlashcardDeck";
import BottomNav from "@/components/BottomNav";

// 単語帳のフラッシュカード学習モード。用語データはコード内（data/glossary）なので
// クライアントから直接読める。仕分けの保存先はローカル（lib/glossaryProgress）。
export default function GlossaryStudyPage() {
  const terms = getAllGlossaryTerms();

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-5 text-white">
        <div className="mx-auto w-full max-w-md">
          <Link href="/glossary" className="text-sm font-medium text-white/80">
            ← 単語帳
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold">カードで覚える</h1>
          <p className="mt-1 text-sm text-white/90">
            用語をタップして答え合わせ。「覚えた / まだ」で仕分けしよう。
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-4 py-6">
        <FlashcardDeck terms={terms} />
      </div>

      <BottomNav />
    </main>
  );
}
