import Link from "next/link";
import { notFound } from "next/navigation";
import { WORDLIST_CATEGORY_LABELS } from "@/types/wordlist";
import { getAllWords, getWord } from "@/lib/wordlist";
import WordDetail from "@/components/wordlist/WordDetail";
import BottomNav from "@/components/BottomNav";

// 英略語1語の詳細ページ（表示のみ）。固定データなのでビルド時に静的生成する。
// Next.js 16 では params は Promise なので await が必須（AGENTS.md・docs 準拠）。
export function generateStaticParams() {
  return getAllWords().map((w) => ({ id: w.id }));
}

export default async function WordlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = getWord(id);
  if (!entry) notFound();

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-5 text-white">
        <div className="mx-auto w-full max-w-md">
          <Link href="/glossary" className="text-sm font-medium text-white/80">
            ← 単語帳
          </Link>
          <span className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
            {WORDLIST_CATEGORY_LABELS[entry.category]}
          </span>
          <h1 className="mt-2 text-4xl font-black tracking-wide">
            {entry.acronym}
          </h1>
          <p className="mt-1 text-base font-bold text-white/95">
            {entry.fullName}
          </p>
          <p className="text-sm text-white/85">{entry.japanese}</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-4 py-6">
        <WordDetail entry={entry} />

        <Link
          href="/glossary/quiz?mode=all"
          className="mt-6 block rounded-2xl bg-indigo-600 px-4 py-3 text-center text-sm font-extrabold text-white transition active:scale-[0.99]"
        >
          4択で確認する ✅
        </Link>
      </div>

      <BottomNav />
    </main>
  );
}
