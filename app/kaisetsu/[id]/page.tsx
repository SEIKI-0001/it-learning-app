import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import DiagramRenderer from "@/components/diagrams/DiagramRenderer";
import { Breadcrumb, GuideCTA, JsonLd } from "@/components/guide/GuideParts";
import ShareOnX from "@/components/growth/ShareOnX";
import KakomonList from "@/components/guide/KakomonList";
import { breadcrumbJsonLd, buildMetadata, type Crumb } from "@/lib/guide/seo";
import { CHOICE_LABELS } from "@/lib/pastExam/questionView";
import {
  KAISETSU_BASE_PATH,
  getKaisetsuQuizzes,
  getKaisetsuTopic,
  getKaisetsuTopics,
  getKakomonForTopic,
  getLinkedTopics,
  getRelatedKakomonForTopic,
  getWordsForTopic,
  kaisetsuDescription,
  kaisetsuPath,
  kaisetsuTitle,
  relatedTermHref,
} from "@/lib/publicPages/kaisetsu";
import { kaisetsuJsonLd } from "@/lib/publicPages/structuredData";
import { wordPath } from "@/lib/publicPages/words";
import { FIELD_LABELS } from "@/types/content";

// 公開テーマ別解説（未ログインで閲覧可）。「SWOT分析とは」のような論点名の検索の入口。
// 本文は教材データ（data/topics）だけから組み立て、そのテーマの公開過去問・英略語へつなぐ。
// 確認問題の正解と解説は過去問ページと同じく <details> で「タップで開く」。

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return getKaisetsuTopics().map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = getKaisetsuTopic((await params).id);
  if (!t) return {};
  return buildMetadata({
    path: kaisetsuPath(t.id),
    title: kaisetsuTitle(t),
    description: kaisetsuDescription(t),
    type: "article",
  });
}

export default async function KaisetsuTopicPage({ params }: Props) {
  const t = getKaisetsuTopic((await params).id);
  if (!t) notFound();

  const crumbs: Crumb[] = [
    { name: "トップ", path: "/lp" },
    { name: "テーマ別解説", path: KAISETSU_BASE_PATH },
    { name: t.title, path: kaisetsuPath(t.id) },
  ];
  const kakomon = getKakomonForTopic(t.id);
  const relatedKakomon = getRelatedKakomonForTopic(t.id);
  const words = getWordsForTopic(t.id);
  const quizzes = getKaisetsuQuizzes(t);
  const before = getLinkedTopics(t.prerequisites);
  const after = getLinkedTopics(t.nextTopicIds).filter((x) => !before.some((b) => b.id === x.id));
  const { conceptCard, explanation } = t;

  return (
    <article className="g-col">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd
        data={kaisetsuJsonLd(t, {
          path: kaisetsuPath(t.id),
          headline: `${t.title}とは？わかりやすく解説`,
          description: kaisetsuDescription(t),
          about: [t.title],
        })}
      />
      <Breadcrumb crumbs={crumbs} />
      <h1>{t.title}とは？わかりやすく解説</h1>
      <p className="k-meta">
        {FIELD_LABELS[t.field]} ・ {t.category} ・ 読む目安{t.estimatedMinutes}分
        {t.examFrequency === "high" && " ・ 頻出"}
      </p>
      <div className="g-lead">
        <p>{t.summary}</p>
      </div>

      {t.hookQuestion && (
        <section className="g-points" aria-labelledby="ks-hook">
          <h2 id="ks-hook">最初に考えてみよう</h2>
          <p>{t.hookQuestion}</p>
        </section>
      )}

      <div className="g-body">
        <h2>{conceptCard.heading}</h2>
        <p>{conceptCard.body}</p>
        {conceptCard.analogy && (
          <p>
            <strong>たとえると：</strong>
            {conceptCard.analogy}
          </p>
        )}
        {conceptCard.diagram && (
          <div className="ks-diagram">
            <DiagramRenderer spec={conceptCard.diagram} />
          </div>
        )}

        <h2>理解を固める</h2>
        <p>{explanation.body}</p>
        {explanation.keyPoints && explanation.keyPoints.length > 0 && (
          <>
            <h3>押さえどころ</h3>
            <ul>
              {explanation.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </>
        )}
        {explanation.diagram && (
          <div className="ks-diagram">
            <DiagramRenderer spec={explanation.diagram} />
          </div>
        )}

        {t.examPoint && (
          <>
            <h2>ITパスポート試験での問われ方</h2>
            <p>{t.examPoint}</p>
          </>
        )}

        {t.commonMistakes && t.commonMistakes.length > 0 && (
          <>
            <h2>間違えやすいポイント</h2>
            <ul>
              {t.commonMistakes.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </>
        )}

        {t.relatedTerms && t.relatedTerms.length > 0 && (
          <>
            <h2>関連用語</h2>
            <p>
              {t.relatedTerms.map((term, i) => {
                const href = relatedTermHref(term, t.id);
                return (
                  <Fragment key={term}>
                    {i > 0 && "、"}
                    {href ? <a href={href}>{term}</a> : term}
                  </Fragment>
                );
              })}
            </p>
          </>
        )}
      </div>

      {quizzes.length > 0 && (
        <section className="k-section" aria-labelledby="ks-quiz">
          <h2 id="ks-quiz">確認問題（{quizzes.length}問）</h2>
          {quizzes.map((q, i) => (
            <div key={q.id} className="k-question" aria-label={`確認問題${i + 1}`}>
              <p className="k-prompt">
                <strong>Q{i + 1}.</strong> {q.prompt}
              </p>
              <ol className="k-choices" aria-label="選択肢">
                {q.choices.map((c) => (
                  <li key={c.key}>
                    <span className="k-key">{CHOICE_LABELS[c.key]}</span>
                    <span className="k-text">{c.text}</span>
                  </li>
                ))}
              </ol>
              <details className="k-answer">
                <summary>正解と解説を見る</summary>
                <div className="k-answer-body">
                  <p className="k-correct">正解：{CHOICE_LABELS[q.correctChoice]}</p>
                  <p className="k-explanation">{q.explanation}</p>
                </div>
              </details>
            </div>
          ))}
          <p className="g-note">確認問題は本サービスのオリジナル問題です。</p>
        </section>
      )}

      {kakomon.length > 0 && (
        <section className="k-section" aria-labelledby="ks-kakomon">
          <h2 id="ks-kakomon">
            「{t.title}」の過去問（{kakomon.length}問）
          </h2>
          <p>IPAが公開しているITパスポート試験の公開問題から、このテーマの問題を集めました。</p>
          <KakomonList questions={kakomon} withYear />
        </section>
      )}

      {relatedKakomon.length > 0 && (
        <section className="k-section" aria-labelledby="ks-kakomon">
          <h2 id="ks-kakomon">
            「{t.title}」に関連する過去問（{relatedKakomon.length}問）
          </h2>
          <p>
            このテーマが主題の問題はまだありませんが、関連する用語が問題文や選択肢に出てくる公開問題を集めました。
          </p>
          <KakomonList questions={relatedKakomon} withYear />
        </section>
      )}

      {words.length > 0 && (
        <section className="k-section" aria-labelledby="ks-words">
          <h2 id="ks-words">あわせて覚える英略語</h2>
          <ul className="k-tags">
            {words.map((w) => (
              <li key={w.id}>
                <a href={wordPath(w.id)}>
                  {w.acronym}（{w.japanese}）
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(before.length > 0 || after.length > 0) && (
        <section className="k-section" aria-labelledby="ks-next">
          <h2 id="ks-next">つながるテーマ</h2>
          <ul className="k-list">
            {before.map((x) => (
              <li key={x.id}>
                <a href={kaisetsuPath(x.id)}>
                  <span className="n">先に</span>
                  <span className="t">{x.title}</span>
                </a>
              </li>
            ))}
            {after.map((x) => (
              <li key={x.id}>
                <a href={kaisetsuPath(x.id)}>
                  <span className="n">次に</span>
                  <span className="t">{x.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="g-share">
        <ShareOnX
          className="g-share-btn"
          text={`ITパスポートの「${t.title}」、図解でまとまっていて分かりやすい解説`}
          path={kaisetsuPath(t.id)}
          campaign="kaisetsu_share"
          label="この解説をXでシェア"
        />
      </p>

      <GuideCTA
        title="このテーマをアプリで学ぶ"
        body={`アプリでは「${t.title}」を図解と確認問題で学び、そのまま公式過去問の演習へ進めます。間違えた問題は復習リストに自動で戻ります。教材と公式過去問は無料、最初の7日間は学習記録も無料です。`}
      />
    </article>
  );
}
