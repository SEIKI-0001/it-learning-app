import { GUIDES, GUIDE_INDEX } from "@/lib/guide/guides";
import { breadcrumbJsonLd, buildGuideIndexMetadata, guideCrumbs } from "@/lib/guide/seo";
import { Breadcrumb, GuideCTA, GuideCards, JsonLd } from "@/components/guide/GuideParts";

export const metadata = buildGuideIndexMetadata();

export default function GuideIndexPage() {
  const crumbs = guideCrumbs();
  return (
    <div className="g-col">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumb crumbs={crumbs} />
      <h1>{GUIDE_INDEX.h1}</h1>
      <div className="g-lead">
        <p>
          ITパスポートを取る意味、基本情報との違い、申し込み方法から、勉強法・計算問題・試験当日の準備まで。今の疑問に合わせて、必要な記事から読めるガイドです。
        </p>
      </div>
      <section className="g-related" aria-labelledby="guide-list">
        <h2 id="guide-list">ガイド一覧</h2>
        <GuideCards slugs={GUIDES.map((g) => g.slug)} />
      </section>
      <GuideCTA />
    </div>
  );
}
