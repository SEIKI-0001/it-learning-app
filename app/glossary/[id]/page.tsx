import Link from "next/link";
import { notFound } from "next/navigation";
import { FIELD_LABELS } from "@/types/content";
import {
  getAllGlossaryTerms,
  getGlossaryTerm,
  getGlossaryTermByName,
} from "@/lib/content";
import CheckQuestionCard from "@/components/learn/CheckQuestionCard";
import BottomNav from "@/components/BottomNav";

// 個別の用語ページ（表示のみ）。用語は固定データなのでビルド時に静的生成する。
// Next.js 16 では params は Promise なので await が必須（AGENTS.md・docs 準拠）。
export function generateStaticParams() {
  return getAllGlossaryTerms().map((t) => ({ id: t.id }));
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const term = getGlossaryTerm(id);
  if (!term) notFound();

  // 関連用語のうち、用語集にあるものは内部リンクにする。
  const relatedLinks = term.relatedTerms.map((name) => ({
    name,
    entry: getGlossaryTermByName(name),
  }));

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-5 text-white">
        <div className="mx-auto w-full max-w-md">
          <Link href="/glossary" className="text-sm font-medium text-white/80">
            ← 単語帳
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
              {term.category}
            </span>
            {term.field && (
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
                {FIELD_LABELS[term.field]}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-extrabold">{term.term}</h1>
          {term.reading && (
            <p className="mt-1 text-sm text-white/80">{term.reading}</p>
          )}
          <p className="mt-2 text-base font-bold text-white/95">
            {term.oneLine}
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-4 py-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-extrabold text-gray-800">かんたんに言うと</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
            {term.beginnerExplanation}
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-extrabold text-gray-800">たとえると</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
            {term.analogy}
          </p>
        </section>

        <section className="rounded-2xl bg-amber-50 p-4">
          <h2 className="text-sm font-extrabold text-amber-700">試験ポイント</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
            {term.examPoint}
          </p>
        </section>

        {term.confusedWith.length > 0 && (
          <section className="rounded-2xl bg-rose-50 p-4">
            <h2 className="text-sm font-extrabold text-rose-600">
              間違えやすい用語
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {term.confusedWith.map((name) => {
                const entry = getGlossaryTermByName(name);
                return entry ? (
                  <Link
                    key={name}
                    href={`/glossary/${entry.id}`}
                    className="rounded-full bg-white px-3 py-1 text-sm font-bold text-rose-600 ring-1 ring-rose-200"
                  >
                    {name} →
                  </Link>
                ) : (
                  <span
                    key={name}
                    className="rounded-full bg-white px-3 py-1 text-sm font-medium text-rose-500 ring-1 ring-rose-200"
                  >
                    {name}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {relatedLinks.length > 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-extrabold text-gray-800">関連する用語</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {relatedLinks.map(({ name, entry }) =>
                entry ? (
                  <Link
                    key={name}
                    href={`/glossary/${entry.id}`}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-600"
                  >
                    {name} →
                  </Link>
                ) : (
                  <span
                    key={name}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-500"
                  >
                    {name}
                  </span>
                ),
              )}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-extrabold text-gray-800">
            確認問題
          </h2>
          <CheckQuestionCard q={term.quiz} number={1} />
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
