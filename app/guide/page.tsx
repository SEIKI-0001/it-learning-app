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
          ITパスポート試験の勉強を「何から・どれだけ・どの順で」進めるかをまとめたガイドです。IT未経験の人が、参考書で止まらずに本番形式の問題まで進めることを目標にしています。
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
