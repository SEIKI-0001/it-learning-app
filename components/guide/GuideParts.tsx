import type { ReactNode } from "react";
import { GUIDES, guidePath } from "@/lib/guide/guides";
import { jsonLdString, type Crumb } from "@/lib/guide/seo";

// 公開ガイドの小さな共通部品（すべて Server Component・JS 不要）。
// スタイルは app/guide/guide.css（.guide スコープ）。

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
  );
}

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="g-crumbs" aria-label="パンくずリスト">
      <ol>
        {crumbs.map((crumb, i) => (
          <li key={crumb.path}>
            {i === crumbs.length - 1 ? (
              <span aria-current="page">{crumb.name}</span>
            ) : (
              <a href={crumb.path}>{crumb.name}</a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** 記事カードの一覧（/guide の一覧と関連ガイドで共用）。 */
export function GuideCards({ slugs }: { slugs: string[] }) {
  const items = slugs.map((slug) => GUIDES.find((g) => g.slug === slug)).filter((g) => g !== undefined);
  return (
    <ul className="g-cards">
      {items.map((g) => (
        <li key={g.slug}>
          <a href={guidePath(g.slug)}>
            <span className="t">{g.h1}</span>
            <span className="d">{g.summary}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function RelatedGuides({ slugs }: { slugs: string[] }) {
  return (
    <section className="g-related" aria-labelledby="related-guides">
      <h2 id="related-guides">関連ガイド</h2>
      <GuideCards slugs={slugs} />
    </section>
  );
}

export function GuideCTA() {
  return (
    <section className="g-cta" aria-labelledby="guide-cta">
      <h2 id="guide-cta">計画づくりと「今日やること」をアプリに任せる</h2>
      <p>
        試験日と1日に使える時間を入れると、ITパスポート学習コーチが毎日の学習を組み立てます。最初の7日間は学習記録も無料です。
      </p>
      <div className="g-cta-actions">
        <a className="g-btn" href="/login">
          無料で始める
        </a>
        <a className="g-cta-sub" href="/lp">
          サービスの詳細を見る
        </a>
      </div>
    </section>
  );
}

/** 表。スマホでは横スクロールさせる。数値だけの短い表は compact で画面幅に収める。 */
export function GuideTable({
  caption,
  compact = false,
  children,
}: {
  caption?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={compact ? "g-table compact" : "g-table"}
      role="region"
      aria-label={caption ?? "表"}
      tabIndex={0}
    >
      <table>
        {caption && <caption>{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export type GuideSource = { label: string; url: string };

export function Sources({ sources }: { sources: GuideSource[] }) {
  return (
    <section className="g-sources" aria-labelledby="guide-sources">
      <h2 id="guide-sources">出典</h2>
      <ul>
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} rel="noopener" target="_blank">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** IPA の公式情報（試験形式・合格基準）。複数記事で使う。 */
export const IPA_SOURCES: GuideSource[] = [
  {
    label: "IPA 独立行政法人情報処理推進機構「ITパスポート試験」",
    url: "https://www.ipa.go.jp/shiken/kubun/ip.html",
  },
  {
    label: "IPA「ITパスポート試験・基本情報技術者試験」パンフレット（試験時間・出題数・合格基準）",
    url: "https://www.ipa.go.jp/shiken/about/gmcbt8000000cy3n-att/pamphlet_IP-FE.pdf",
  },
];
