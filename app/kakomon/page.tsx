import Link from "next/link";
import { Breadcrumb, GuideCTA, JsonLd } from "@/components/guide/GuideParts";
import { LP_CRUMB, breadcrumbJsonLd, buildMetadata, type Crumb } from "@/lib/guide/seo";
import {
  KAKOMON_BASE_PATH,
  getKakomonQuestionsByYear,
  getKakomonYears,
  kakomonYearLabel,
  kakomonYearPath,
} from "@/lib/publicPages/kakomon";

// 公開過去問のトップ（未ログインで閲覧可）。年度の一覧だけを出す。

const years = getKakomonYears();
const range =
  years.length > 0
    ? `${kakomonYearLabel(years[years.length - 1])}〜${kakomonYearLabel(years[0]).replace(/^令和/, "")}`
    : "";
const total = years.reduce((sum, y) => sum + getKakomonQuestionsByYear(y).length, 0);

export const metadata = buildMetadata({
  path: KAKOMON_BASE_PATH,
  title: `ITパスポート過去問 解説付き（${range}・${total}問）`,
  description: `ITパスポート試験の公開問題${total}問（${range}）を1問ずつ掲載。問題ごとに正解と本サービス独自の解説、関連する英略語や同じテーマの過去問をまとめています。`,
  type: "website",
});

export default function KakomonIndexPage() {
  const crumbs: Crumb[] = [
    LP_CRUMB,
    { name: "過去問解説", path: KAKOMON_BASE_PATH },
  ];
  return (
    <div className="g-col">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumb crumbs={crumbs} />
      <h1>ITパスポート過去問 解説付き</h1>
      <div className="g-lead">
        <p>
          IPAが公開しているITパスポート試験の公開問題{total}問（{range}）を、1問ずつ解説付きで掲載しています。年度を選び、問題ページで「正解と解説を見る」をタップしてください。
        </p>
      </div>

      <section className="g-related" aria-labelledby="k-years">
        <h2 id="k-years">年度から選ぶ</h2>
        <ul className="g-cards">
          {years.map((year) => (
            <li key={year}>
              <a href={kakomonYearPath(year)}>
                <span className="t">{kakomonYearLabel(year)}（{getKakomonQuestionsByYear(year).length}問）</span>
                <span className="d">ストラテジ系・マネジメント系・テクノロジ系の全問題と解説</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <p className="g-note" style={{ marginTop: 28 }}>
        問題文・選択肢はIPA公開問題の原文です。解説は本サービスが独自に作成したもので、IPAの公式解説ではありません。過去問の進め方は
        <a href="/guide/past-exam-strategy">ITパスポートの過去問はいつから・何年分解くべきか</a>
        を参照してください。解説を読んでも分からなかったテーマは
        <Link href="/kaisetsu">テーマ別解説</Link>
        で基礎から確認できます。
      </p>

      <GuideCTA />
    </div>
  );
}
