import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, GuideCTA, JsonLd } from "@/components/guide/GuideParts";
import KakomonList from "@/components/guide/KakomonList";
import { breadcrumbJsonLd, buildMetadata, type Crumb } from "@/lib/guide/seo";
import { OFFICIAL_EXAM_FIELDS } from "@/lib/questionBank/officialExamField";
import {
  KAKOMON_BASE_PATH,
  getKakomonQuestionsByYear,
  getKakomonYears,
  kakomonYearLabel,
  kakomonYearPath,
} from "@/lib/publicPages/kakomon";
import { FIELD_LABELS } from "@/types/content";

// 公開過去問の年度ページ（未ログインで閲覧可）。100問を公式の出題区分ごとに並べる。

type Props = { params: Promise<{ year: string }> };

export function generateStaticParams() {
  return getKakomonYears().map((year) => ({ year: String(year) }));
}

function resolveYear(param: string): number | null {
  const year = Number(param);
  return Number.isInteger(year) && getKakomonYears().includes(year) ? year : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const year = resolveYear((await params).year);
  if (year === null) return {};
  const label = kakomonYearLabel(year);
  return buildMetadata({
    path: kakomonYearPath(year),
    title: `${label} ITパスポート過去問 全100問の解説`,
    description: `${label} ITパスポート試験の公開問題100問を、ストラテジ系・マネジメント系・テクノロジ系に分けて掲載。1問ずつ正解と解説を確認できます。`,
    type: "website",
  });
}

export default async function KakomonYearPage({ params }: Props) {
  const year = resolveYear((await params).year);
  if (year === null) notFound();

  const label = kakomonYearLabel(year);
  const questions = getKakomonQuestionsByYear(year);
  const crumbs: Crumb[] = [
    { name: "トップ", path: "/lp" },
    { name: "過去問解説", path: KAKOMON_BASE_PATH },
    { name: label, path: kakomonYearPath(year) },
  ];

  return (
    <div className="g-col">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumb crumbs={crumbs} />
      <h1>{label} ITパスポート過去問 全{questions.length}問の解説</h1>
      <div className="g-lead">
        <p>
          IPAが公開している{label}の公開問題を1問ずつ掲載しています。各問題のページで「正解と解説を見る」をタップすると、本サービス独自の解説が開きます。
        </p>
      </div>

      {OFFICIAL_EXAM_FIELDS.map((field) => {
        const list = questions.filter((q) => q.view.examField === field);
        if (list.length === 0) return null;
        return (
          <section key={field} className="k-section" aria-labelledby={`k-field-${field}`}>
            <h2 id={`k-field-${field}`}>
              {FIELD_LABELS[field]}（{list.length}問）
            </h2>
            <KakomonList questions={list} />
          </section>
        );
      })}

      <p className="g-note" style={{ marginTop: 28 }}>
        問題文・選択肢はIPA公開問題の原文です（出典：{label} ITパスポート試験 公開問題）。解説は本サービスが独自に作成したもので、IPAの公式解説ではありません。
      </p>

      <GuideCTA
        title={`${label}の100問を本番形式で通して解く`}
        body="アプリでは、公開問題を本番の並びのまま解いて採点し、分野ごとの正答率まで確認できます。最初の7日間は学習記録も無料です。"
      />
    </div>
  );
}
