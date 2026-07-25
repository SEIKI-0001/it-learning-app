import Link from "next/link";
import { notFound } from "next/navigation";
import { WORDLIST_CATEGORY_LABELS } from "@/types/wordlist";
import { getAllWords, getWord } from "@/lib/wordlist";
import WordDetail from "@/components/wordlist/WordDetail";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
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
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/glossary", label: "単語帳" }}
        eyebrow={WORDLIST_CATEGORY_LABELS[entry.category]}
        title={entry.acronym}
        description={entry.fullName}
      >
        <p className="mt-1 text-sm text-gray-600">{entry.japanese}</p>
      </PageHeader>

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <WordDetail entry={entry} />

        <Link
          href="/glossary/quiz?mode=all"
          className={buttonClass("primary", "md", "mt-6 w-full")}
        >
          4択で確認する
          <Icon name="arrow-right" className="h-4 w-4" />
        </Link>
      </div>

      <BottomNav />
    </main>
  );
}
