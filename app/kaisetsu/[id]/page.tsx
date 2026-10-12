import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import TopicContent from "@/components/learn/TopicContent";
import PublicTopicQuiz from "@/components/learn/PublicTopicQuiz";
import { getTopicExperience } from "@/components/experiences/registry";
import { Breadcrumb, GuideCTA, JsonLd } from "@/components/guide/GuideParts";
import ShareOnX from "@/components/growth/ShareOnX";
import KakomonList from "@/components/guide/KakomonList";
import { LP_CRUMB, breadcrumbJsonLd, buildMetadata, type Crumb } from "@/lib/guide/seo";
import { getLessonHref } from "@/lib/learningCatalog";
import {
  KAISETSU_BASE_PATH,
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
// 教材本体と確認問題はアプリのレッスン（app/learn/.../[lessonId]）と同じ部品で描く
// （TopicContent / TopicQuiz）。公開ページで持つのは、文章でのおさらい・公開過去問・英略語・
// つながるテーマへの内部リンクと、登録の案内だけ。学習記録は保存しない。

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
    LP_CRUMB,
    { name: "テーマ別解説", path: KAISETSU_BASE_PATH },
    { name: t.title, path: kaisetsuPath(t.id) },
  ];
  const kakomon = getKakomonForTopic(t.id);
  const relatedKakomon = getRelatedKakomonForTopic(t.id);
  const words = getWordsForTopic(t.id);
  const lessonHref = getLessonHref(t.id, { anchor: "lesson-content" });
  const hasExperience = Boolean(getTopicExperience(t.id));
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

      {/* 教材本体（導入・体験教材・図解・スライド）はアプリのレッスンと同じ TopicContent。
          アプリ側の教材を直すと、ここにもそのまま反映される。 */}
      <section className="k-lesson" aria-label="教材">
        <TopicContent topic={t} showCheckQuestions={false} />
      </section>

      {/* 文章でのおさらい（公開ページだけ）。検索で読まれる本文と、体験教材に載っていない
          試験の問われ方・間違えやすい点を文章で残す。体験教材が無いテーマでは
          TopicContent が「イメージをつかむ」「試験ポイント」を出すので、そこは重ねない。 */}
      <section className="g-body k-recap" aria-labelledby="ks-recap">
        <h2 id="ks-recap">文章でおさらい</h2>
        {hasExperience && (
          <>
            <h3>{conceptCard.heading}</h3>
            <p>{conceptCard.body}</p>
            {conceptCard.analogy && (
              <p>
                <strong>たとえると：</strong>
                {conceptCard.analogy}
              </p>
            )}
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
          </>
        )}

        {t.examPoint && (
          <>
            <h3>ITパスポート試験での問われ方</h3>
            <p>{t.examPoint}</p>
          </>
        )}

        {t.commonMistakes && t.commonMistakes.length > 0 && (
          <>
            <h3>間違えやすいポイント</h3>
            <ul>
              {t.commonMistakes.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </>
        )}

        {t.relatedTerms && t.relatedTerms.length > 0 && (
          <>
            <h3>関連用語</h3>
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
      </section>

      {t.checkQuestions.length > 0 && (
        <section className="k-section" aria-labelledby="ks-quiz">
          <h2 id="ks-quiz">確認問題（{t.checkQuestions.length}問）</h2>
          {/* アプリと同じ出題・解説。結果は保存しない（PublicTopicQuiz の説明を参照）。 */}
          <div className="k-lesson">
            <PublicTopicQuiz
              topicId={t.id}
              questions={t.checkQuestions}
              lessonHref={lessonHref}
            />
          </div>
          <p className="g-note">
            確認問題は本サービスのオリジナル問題です。ログインなしで解けます（結果は保存されません）。
          </p>
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
        title="学習を記録して、合格まで続ける"
        body={`教材と確認問題はこのページで全部無料で使えます。登録すると「${t.title}」の結果や習熟度が記録され、苦手分野の復習提案、試験日までの学習計画、合格準備度の見える化が使えます。最初の7日間は学習記録も無料です。`}
        href={`/login?next=${encodeURIComponent(lessonHref)}`}
      />
    </article>
  );
}
