import { notFound } from "next/navigation";
import { getTopic } from "@/lib/content";
import { getLessonHref } from "@/lib/learningCatalog";
import {
  getAllCheckPacks,
  getCheckPackByTopic,
  resolvePackExamAsCheckQuestions,
  resolvePackFlashcards,
  resolvePackQuizQuestions,
} from "@/lib/checkPack";
import { withMeasuredFigures } from "@/lib/questions/measureFigures";
import CheckPackRunner from "@/components/checkPack/CheckPackRunner";
import PageHeader from "@/components/ui/PageHeader";
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
  // 図表の実寸はサーバでしか読めないので、クライアントへ渡す前にここで足す。
  const examQuestions = withMeasuredFigures(resolvePackExamAsCheckQuestions(pack));

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: getLessonHref(topic.id), label: topic.title }}
        eyebrow="確認パック"
        title="本番対応チェック"
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
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
