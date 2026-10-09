import { Breadcrumb, GuideCTA, JsonLd } from "@/components/guide/GuideParts";
import { LP_CRUMB, breadcrumbJsonLd, buildMetadata, type Crumb } from "@/lib/guide/seo";
import {
  KAISETSU_BASE_PATH,
  KAISETSU_FIELD_ORDER,
  getKaisetsuTopics,
  getKaisetsuTopicsByField,
  getKakomonForTopic,
  kaisetsuPath,
} from "@/lib/publicPages/kaisetsu";
import { FIELD_LABELS } from "@/types/content";

// 公開テーマ別解説のトップ（未ログインで閲覧可）。分野 → 中分類ごとの一覧。

const total = getKaisetsuTopics().length;

export const metadata = buildMetadata({
  path: KAISETSU_BASE_PATH,
  title: `ITパスポートの頻出テーマ解説（${total}テーマ）わかりやすく図解`,
  description: `ITパスポート試験のストラテジ系・マネジメント系・テクノロジ系から${total}テーマを、たとえと図解でわかりやすく解説。試験のポイント、間違えやすい点、確認問題、そのテーマの公式過去問への入口をまとめています。`,
  type: "website",
});

export default function KaisetsuIndexPage() {
  const crumbs: Crumb[] = [
    LP_CRUMB,
    { name: "テーマ別解説", path: KAISETSU_BASE_PATH },
  ];
  return (
    <div className="g-col">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumb crumbs={crumbs} />
      <h1>ITパスポートの頻出テーマ解説（{total}テーマ）</h1>
      <div className="g-lead">
        <p>
          ITパスポート試験で問われるテーマを、専門用語より先にたとえと図解で説明しています。各テーマのページから、そのテーマの公式過去問や英略語へ進めます。
        </p>
      </div>

      {KAISETSU_FIELD_ORDER.map((field) => (
        <section key={field} className="k-section" aria-labelledby={`ks-${field}`}>
          <h2 id={`ks-${field}`}>{FIELD_LABELS[field]}</h2>
          {getKaisetsuTopicsByField(field).map(({ category, topics }) => (
            <div key={category}>
              <h3 className="ks-cat">{category}</h3>
              <ul className="k-list">
                {topics.map((t) => {
                  const count = getKakomonForTopic(t.id).length;
                  return (
                    <li key={t.id}>
                      <a href={kaisetsuPath(t.id)}>
                        <span className="t">{t.title}</span>
                        {count > 0 && <span className="c">過去問{count}問</span>}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      ))}

      <GuideCTA />
    </div>
  );
}
