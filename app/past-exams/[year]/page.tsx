import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/ui/PageHeader";
import PastExamRunner from "@/components/pastExam/PastExamRunner";
import {
  getPlayableOfficialExamYears,
  getPublishedOfficialQuestionsByYear,
  isPlayableOfficialExamYear,
} from "@/lib/questionBank";
import { toPastExamQuestionView } from "@/lib/pastExam/viewModel";

/** 西暦 → 和暦の表示名。収録年度が増えたらここに足す。 */
const YEAR_LABELS: Record<number, string> = {
  2026: "令和8年度",
};

function yearLabel(year: number): string {
  return YEAR_LABELS[year] ?? `${year}年度`;
}

/** 収録済みの年度だけを静的に生成する。 */
export function generateStaticParams() {
  return getPlayableOfficialExamYears().map((year) => ({ year: String(year) }));
}

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  const label = yearLabel(Number(year));
  return {
    title: `${label} 公式過去問 | ITパスポート学習コーチ`,
    description: `${label} ITパスポート試験の公開問題100問を、練習モードと本番モードで演習できます。`,
  };
}

export default async function PastExamYearPage({ params }: Props) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);

  // 100問そろっていない年度は演習を開始させない。
  // 問番号が欠けたまま「問n/100」を出すと、採点も区分別集計も意味を失うため。
  if (!Number.isInteger(year) || !isPlayableOfficialExamYear(year)) {
    notFound();
  }

  const questions = getPublishedOfficialQuestionsByYear(year).map(
    toPastExamQuestionView,
  );
  const label = yearLabel(year);

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/past-exams", label: "公式過去問" }}
        title={`${label} 公式過去問`}
        description={`IPA公開問題${questions.length}問を、公式の並びのまま演習します。`}
      />

      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
        <PastExamRunner year={year} yearLabel={label} questions={questions} />

        <p className="text-xs leading-relaxed text-gray-500">
          問題文・選択肢・正答はIPAが公開している原文のままです。解説は本サービスが
          独自に作成したもので、IPAの公式解説ではありません。
        </p>
      </div>

      <BottomNav />
    </main>
  );
}
