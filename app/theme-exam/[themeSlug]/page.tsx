import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/ui/PageHeader";
import ThemeExamRunner from "@/components/themeExam/ThemeExamRunner";
import { getThemeBySlug } from "@/lib/learningCatalog";
import { getAllThemeExams, getThemeExam, resolveThemeExamQuestions } from "@/lib/themeExam";

/** 試験を持つテーマだけを静的に生成する。 */
export function generateStaticParams() {
  return getAllThemeExams().map((exam) => ({ themeSlug: exam.themeSlug }));
}

type Props = { params: Promise<{ themeSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { themeSlug } = await params;
  const theme = getThemeBySlug(themeSlug);
  const title = theme ? `${theme.title} 総まとめ試験` : "総まとめ試験";
  return {
    title: `${title} | ITパスポート学習コーチ`,
    description: `${theme?.title ?? ""}の内容を横断して、本試験に近い形式で解く高難易度の試験です。`,
  };
}

export default async function ThemeExamPage({ params }: Props) {
  const { themeSlug } = await params;
  const theme = getThemeBySlug(themeSlug);
  const exam = getThemeExam(themeSlug);
  if (!theme || !exam) notFound();

  const questions = resolveThemeExamQuestions(exam);
  if (questions.length === 0) notFound();

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: `/learn/${theme.slug}`, label: theme.title }}
        eyebrow="総まとめ試験"
        title={theme.title}
        description="章の内容を横断した、本試験に近い形式の試験です。"
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <ThemeExamRunner
          examId={exam.examId}
          themeSlug={theme.slug}
          themeTitle={theme.title}
          passRate={exam.passRate}
          questions={questions}
        />
      </div>

      <BottomNav />
    </main>
  );
}
