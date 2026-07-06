import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopic } from "@/lib/content";
import {
  getAllCheckPacks,
  getCheckPackByTopic,
  resolvePackExamAsCheckQuestions,
  resolvePackFlashcards,
  resolvePackQuizQuestions,
} from "@/lib/checkPack";
import CheckPackRunner from "@/components/checkPack/CheckPackRunner";
import BottomNav from "@/components/BottomNav";

// 確認パック実施ページ。パックを持つトピックのみ静的生成する。
// Next.js 16 では params は Promise なので await が必須（AGENTS.md・docs 準拠）。
export function generateStaticParams() {
  return getAllCheckPacks().map((p) => ({ topicId: p.topicId }));
}

export default async function CheckPackPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const topic = getTopic(topicId);
  const pack = getCheckPackByTopic(topicId);
  if (!topic || !pack) notFound();

  const quizQuestions = resolvePackQuizQuestions(topic, pack);
  const flashcardEntries = resolvePackFlashcards(pack);
  const examQuestions = resolvePackExamAsCheckQuestions(pack);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-white">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 md:max-w-2xl">
          <Link
            href={`/topics/${topic.id}`}
            className="shrink-0 text-xs font-medium text-white/80"
          >
            ← {topic.title}
          </Link>
          <h1 className="truncate text-sm font-bold">
            確認パック・本番対応チェック
          </h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md md:max-w-2xl px-4 py-6">
        <CheckPackRunner
          packId={pack.packId}
          topicId={topic.id}
          topicTitle={topic.title}
          quizQuestions={quizQuestions}
          flashcardEntries={flashcardEntries}
          examQuestions={examQuestions}
        />
      </div>

      <BottomNav />
    </main>
  );
}
