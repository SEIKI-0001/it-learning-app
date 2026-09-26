import type { ReactNode } from "react";
import type { GuideArticle as GuideArticleData } from "@/lib/guide/guides";
import { articleJsonLd, breadcrumbJsonLd, guideCrumbs } from "@/lib/guide/seo";
import {
  Breadcrumb,
  GuideCTA,
  JsonLd,
  RelatedGuides,
  Sources,
  type GuideSource,
} from "@/components/guide/GuideParts";

// ガイド記事の共通骨格:
//   パンくず → H1 → 更新日 → 冒頭の直接回答 → この記事で分かること（目次）
//   → 本文（H2/H3）→ このサービスを使う場合 → 出典 → 関連ガイド → CTA
// 見出しは H1 をここで1つだけ出し、本文側は H2 から始める。

export type GuidePoint = { id: string; label: string };

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

export default function GuideArticle({
  guide,
  lead,
  points,
  service,
  sources,
  children,
}: {
  guide: GuideArticleData;
  /** 冒頭100〜200字の直接回答。段落の配列で渡す。 */
  lead: ReactNode[];
  /** 「この記事で分かること」。本文の H2 の id に対応させる。 */
  points: GuidePoint[];
  /** 「このサービスを使う場合」の本文。 */
  service: ReactNode;
  sources?: GuideSource[];
  children: ReactNode;
}) {
  const crumbs = guideCrumbs(guide);
  return (
    <article className="g-col">
      <JsonLd data={[articleJsonLd(guide), breadcrumbJsonLd(crumbs)]} />
      <Breadcrumb crumbs={crumbs} />
      <h1>{guide.h1}</h1>
      <p className="g-updated">
        更新日: <time dateTime={guide.dateModified}>{formatDate(guide.dateModified)}</time>
      </p>

      <div className="g-lead">
        {lead.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <nav className="g-points" aria-labelledby="guide-points">
        <h2 id="guide-points">この記事で分かること</h2>
        <ol>
          {points.map((p) => (
            <li key={p.id}>
              <a href={`#${p.id}`}>{p.label}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="g-body">
        {children}
        <section className="g-service" aria-labelledby="with-service">
          <h2 id="with-service">このサービスを使う場合</h2>
          {service}
        </section>
      </div>

      {sources && sources.length > 0 && <Sources sources={sources} />}
      <RelatedGuides slugs={guide.related} />
      <GuideCTA />
    </article>
  );
}
