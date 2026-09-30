import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QuestionFigures from "@/components/questions/QuestionFigures";
import { Breadcrumb, GuideCTA, JsonLd } from "@/components/guide/GuideParts";
import KakomonList from "@/components/guide/KakomonList";
import { breadcrumbJsonLd, buildMetadata, type Crumb } from "@/lib/guide/seo";
import { CHOICE_LABELS } from "@/lib/pastExam/questionView";
import {
  KAKOMON_BASE_PATH,
  getAdjacentKakomon,
  getAllKakomonQuestions,
  getKakomonQuestion,
  getRelatedKakomon,
  getWordsInKakomon,
  kakomonQuestionDescription,
  kakomonQuestionTitle,
  kakomonYearLabel,
  kakomonYearPath,
  type KakomonQuestion,
} from "@/lib/publicPages/kakomon";
import { getKaisetsuTopic, kaisetsuPath } from "@/lib/publicPages/kaisetsu";
import { wordPath } from "@/lib/publicPages/words";
import { FIELD_LABELS } from "@/types/content";

// 公開過去問1問（未ログインで閲覧可）。
// 正解と解説は <details> に入れて「タップで開く」。HTML には最初から含まれるので検索エンジンも読める。
// 出典表記は IPA の利用条件（出典の明記）に従い、問題ごとに必ず出す。

type Props = { params: Promise<{ year: string; no: string }> };

export function generateStaticParams() {
  return getAllKakomonQuestions().map((q) => ({
    year: String(q.view.year),
    no: String(q.view.questionNumber),
  }));
}

function resolve(yearParam: string, noParam: string): KakomonQuestion | null {
  const year = Number(yearParam);
  const no = Number(noParam);
  if (!Number.isInteger(year) || !Number.isInteger(no)) return null;
  return getKakomonQuestion(year, no);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year, no } = await params;
  const q = resolve(year, no);
  if (!q) return {};
  return buildMetadata({
    path: q.path,
    title: kakomonQuestionTitle(q),
    description: kakomonQuestionDescription(q),
    type: "article",
  });
}

export default async function KakomonQuestionPage({ params }: Props) {
  const { year, no } = await params;
  const q = resolve(year, no);
  if (!q) notFound();

  const { view } = q;
  const yearLabel = kakomonYearLabel(view.year);
  const crumbs: Crumb[] = [
    { name: "トップ", path: "/lp" },
    { name: "過去問解説", path: KAKOMON_BASE_PATH },
    { name: yearLabel, path: kakomonYearPath(view.year) },
    { name: `問${view.questionNumber}`, path: q.path },
  ];
  const { prev, next } = getAdjacentKakomon(q);
  const related = getRelatedKakomon(q);
  const words = getWordsInKakomon(q);
  const topic = getKaisetsuTopic(view.topicId);

  return (
    <article className="g-col">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumb crumbs={crumbs} />
      <h1>{kakomonQuestionTitle(q)}</h1>
      <p className="k-meta">
        {FIELD_LABELS[view.examField]}
        {q.tags.length > 0 && ` ・ ${q.tags.join(" / ")}`}
      </p>

      <section className="k-question" aria-label={`問${view.questionNumber}`}>
        <p className="k-prompt">{view.prompt}</p>
        <QuestionFigures figures={view.figures} className="k-figures" />
        <ol className="k-choices" aria-label="選択肢">
          {view.choices.map((c) => (
            <li key={c.key}>
              <span className="k-key">{CHOICE_LABELS[c.key]}</span>
              <span className="k-text">{c.text}</span>
            </li>
          ))}
        </ol>

        <details className="k-answer">
          <summary>正解と解説を見る</summary>
          <div className="k-answer-body">
            <p className="k-correct">正解：{CHOICE_LABELS[view.correctChoice]}</p>
            <p className="k-explanation">{view.explanation}</p>
          </div>
        </details>

        <div className="k-source">
          <p>{view.attribution || `出典：${yearLabel} ITパスポート試験 公開問題 問${view.questionNumber}`}</p>
          <p>問題文・選択肢はIPA公開問題の原文です。解説は本サービスが独自に作成したもので、IPAの公式解説ではありません。</p>
          {view.sourceUrl && (
            <p>
              <a href={view.sourceUrl} rel="noopener" target="_blank">
                IPA公式PDF（問題）
              </a>
              {view.answerSourceUrl && (
                <>
                  {" / "}
                  <a href={view.answerSourceUrl} rel="noopener" target="_blank">
                    IPA公式PDF（解答）
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      </section>

      <nav className="k-pager" aria-label="前後の問題">
        {prev && <a href={prev.path}>← 問{prev.view.questionNumber}</a>}
        {next && (
          <a className="next" href={next.path}>
            問{next.view.questionNumber} →
          </a>
        )}
      </nav>

      {topic && (
        <section className="k-section" aria-labelledby="k-topic">
          <h2 id="k-topic">この問題のテーマを基礎から学ぶ</h2>
          <ul className="k-list">
            <li>
              <a href={kaisetsuPath(topic.id)}>
                <span className="n">解説</span>
                <span className="t">{topic.title}とは？わかりやすく解説</span>
              </a>
            </li>
          </ul>
        </section>
      )}

      {words.length > 0 && (
        <section className="k-section" aria-labelledby="k-words">
          <h2 id="k-words">この問題に出てくる英略語</h2>
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

      {related.length > 0 && (
        <section className="k-section" aria-labelledby="k-related">
          <h2 id="k-related">同じテーマの過去問</h2>
          <KakomonList questions={related} withYear />
        </section>
      )}

      <GuideCTA
        title="この分野の続きをアプリで解く"
        body="アプリでは公式過去問500問を本番の並びのまま解けるほか、分野別の演習や100問模試、合格準備度スコアで弱い分野と次の一歩が分かります。最初の7日間は学習記録も無料です。"
      />
    </article>
  );
}
