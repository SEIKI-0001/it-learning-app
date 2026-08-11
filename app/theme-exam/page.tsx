import Link from "next/link";
import type { Metadata } from "next";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/ui/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { cardClass } from "@/components/ui/Card";
import { getThemeBySlug } from "@/lib/learningCatalog";
import { getAllThemeExams, resolveThemeExamQuestions } from "@/lib/themeExam";

export const metadata: Metadata = {
  title: "総まとめ試験 | ITパスポート学習コーチ",
  description:
    "章ごとに、内容を横断した本試験レベルの試験を解けます。組合せ型・計算・資料の読み取りを含みます。",
};

export default function ThemeExamListPage() {
  // 章の順に並べる（getAllThemeExams は学習カタログの順を保っている）。
  // テーマが引けない試験は表示しない（学習カタログから章が消えた場合の保険）。
  const exams = getAllThemeExams().flatMap((exam) => {
    const theme = getThemeBySlug(exam.themeSlug);
    return theme ? [{ exam, theme }] : [];
  });

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/more", label: "その他" }}
        title="総まとめ試験"
        description="章の内容を横断して、本試験に近い形式で解きます。確認パックで各トピックを固めたあとの仕上げに使ってください。"
      />

      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-6">
        {exams.map(({ exam, theme }) => {
          const count = resolveThemeExamQuestions(exam).length;
          return (
            <section key={exam.examId} className={cardClass("p-4")}>
              <p className="text-xs font-semibold text-brand-700">第{theme.chapterNumber}章</p>
              <h2 className="mt-0.5 text-base font-bold text-gray-900">{theme.title}</h2>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                <li>{count}問</li>
                <li>合格ライン {exam.passRate}%</li>
                <li>章を横断した出題</li>
              </ul>
              <Link
                href={`/theme-exam/${theme.slug}`}
                className={buttonClass("primary", "md", "mt-3")}
              >
                試験へ進む
              </Link>
            </section>
          );
        })}
      </div>

      <BottomNav />
    </main>
  );
}
