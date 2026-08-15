import Link from "next/link";
import type { Metadata } from "next";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/ui/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import {
  OFFICIAL_EXAM_QUESTION_COUNT,
  getPlayableOfficialExamYears,
  getPublishedOfficialQuestionsByYear,
} from "@/lib/questionBank";

export const metadata: Metadata = {
  title: "公式過去問 | ITパスポート学習コーチ",
  description:
    "IPAが公開しているITパスポート試験の過去問を、年度ごとに本番の並びのまま演習できます。",
};

/** 西暦 → 和暦の表示名。収録年度が増えたらここに足す。 */
const YEAR_LABELS: Record<number, string> = {
  2022: "令和4年度",
  2023: "令和5年度",
  2024: "令和6年度",
  2025: "令和7年度",
  2026: "令和8年度",
};

function yearLabel(year: number): string {
  return YEAR_LABELS[year] ?? `${year}年度`;
}

export default function PastExamsPage() {
  const years = getPlayableOfficialExamYears();

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/more", label: "その他" }}
        title="公式過去問"
        description="IPAが公開している過去問を、公式の並びのまま解けます。解説は本サービスが独自に作成したものです。"
      />

      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
        {years.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            現在、演習できる年度はありません。
          </p>
        )}

        {years.map((year) => {
          const questions = getPublishedOfficialQuestionsByYear(year);
          const figureCount = questions.reduce(
            (sum, q) => sum + (q.figures?.length ?? 0),
            0,
          );
          return (
            <section
              key={year}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <h2 className="text-base font-bold text-gray-900">
                {yearLabel(year)} ITパスポート試験 公開問題
              </h2>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                <li>{questions.length}問</li>
                <li>公式問題</li>
                <li>独自解説付き</li>
                {figureCount > 0 && <li>図表{figureCount}点</li>}
              </ul>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                問題文・選択肢はIPA公開問題です。解説は本サービス独自のものです。
              </p>
              <Link href={`/past-exams/${year}`} className={buttonClass("primary", "md", "mt-4")}>
                年度別演習へ
              </Link>
            </section>
          );
        })}

        <p className="text-xs leading-relaxed text-gray-500">
          収録しているのは、IPAが公開している{OFFICIAL_EXAM_QUESTION_COUNT}問の公開問題です。
          出典元の問題文・選択肢・正答は原文のまま変更していません。
        </p>
      </div>

      <BottomNav />
    </main>
  );
}
