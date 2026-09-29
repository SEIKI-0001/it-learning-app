import { Breadcrumb, GuideCTA, JsonLd } from "@/components/guide/GuideParts";
import { breadcrumbJsonLd, buildMetadata, type Crumb } from "@/lib/guide/seo";
import { WORDS_BASE_PATH, wordPath } from "@/lib/publicPages/words";
import { getAllWords, getWordsByCategory } from "@/lib/wordlist";
import { WORDLIST_CATEGORY_LABELS, WORDLIST_CATEGORY_ORDER } from "@/types/wordlist";

// 公開英略語のトップ（未ログインで閲覧可）。分野ごとの一覧。

const total = getAllWords().length;

export const metadata = buildMetadata({
  path: WORDS_BASE_PATH,
  title: `ITパスポートの英略語一覧（${total}語）意味と正式名称`,
  description: `ITパスポート試験に出る英略語${total}語を分野別に一覧にしました。正式名称・日本語訳・似た用語との違いを1語ずつ確認できます。`,
  type: "website",
});

export default function WordsIndexPage() {
  const crumbs: Crumb[] = [
    { name: "トップ", path: "/lp" },
    { name: "英略語", path: WORDS_BASE_PATH },
  ];
  return (
    <div className="g-col">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumb crumbs={crumbs} />
      <h1>ITパスポートの英略語一覧（{total}語）</h1>
      <div className="g-lead">
        <p>
          ITパスポート試験では、KPI・SLA・VPNのような英略語が選択肢にそのまま出ます。正式名称と日本語訳、似た用語との違いをセットで押さえると、選択肢で迷いにくくなります。
        </p>
      </div>

      {WORDLIST_CATEGORY_ORDER.map((category) => {
        const words = getWordsByCategory(category);
        if (words.length === 0) return null;
        return (
          <section key={category} className="k-section" aria-labelledby={`w-${category}`}>
            <h2 id={`w-${category}`}>
              {WORDLIST_CATEGORY_LABELS[category]}（{words.length}語）
            </h2>
            <ul className="k-list">
              {words.map((w) => (
                <li key={w.id}>
                  <a href={wordPath(w.id)}>
                    <span className="n">{w.acronym}</span>
                    <span className="t">{w.japanese}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <GuideCTA />
    </div>
  );
}
