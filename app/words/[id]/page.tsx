import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, GuideCTA, JsonLd } from "@/components/guide/GuideParts";
import KakomonList from "@/components/guide/KakomonList";
import WordMiniQuiz from "@/components/guide/WordMiniQuiz";
import { LP_CRUMB, breadcrumbJsonLd, buildMetadata, type Crumb } from "@/lib/guide/seo";
import {
  countKakomonAskingWord,
  getAllKakomonQuestions,
  getKakomonByTag,
  getKakomonForWordAskedFirst,
  kakomonYearRangeLabel,
} from "@/lib/publicPages/kakomon";
import { getTopicsForWord, kaisetsuPath } from "@/lib/publicPages/kaisetsu";
import {
  WORDS_BASE_PATH,
  isWordLikeEntry,
  wordComparisonEntries,
  wordDescription,
  wordMiniQuiz,
  wordPath,
  wordTitle,
} from "@/lib/publicPages/words";
import { getWordFamily } from "@/lib/publicPages/wordFamilies";
import { wordJsonLd } from "@/lib/publicPages/structuredData";
import { getAllWords, getWord, getWordByAcronym } from "@/lib/wordlist";
import { WORDLIST_CATEGORY_LABELS } from "@/types/wordlist";

// 公開英略語ページ（未ログインで閲覧可）。「KPI とは」のような検索の入口。
// 内容は単語帳のマスターデータ（data/wordlist/itpassAcronyms.json）だけから組み立てる。

type Props = { params: Promise<{ id: string }> };

const MAX_QUESTIONS = 10;

export function generateStaticParams() {
  return getAllWords().map((w) => ({ id: w.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const w = getWord((await params).id);
  if (!w) return {};
  return buildMetadata({
    path: wordPath(w.id),
    title: wordTitle(w),
    description: wordDescription(w),
    type: "article",
  });
}

export default async function WordPage({ params }: Props) {
  const w = getWord((await params).id);
  if (!w) notFound();

  const crumbs: Crumb[] = [
    LP_CRUMB,
    { name: "英略語", path: WORDS_BASE_PATH },
    { name: w.acronym, path: wordPath(w.id) },
  ];
  const questions = getKakomonForWordAskedFirst(w.id);
  const traps = Object.entries(w.trapExplanations);
  const topics = getTopicsForWord(w.id);
  const compared = wordComparisonEntries(w);
  const asked = countKakomonAskingWord(w.id);
  const family = getWordFamily(w.id);
  // 単語帳に無い似た用語（リスティング広告など）が論点の過去問。略語の検索では拾えないので論点ラベルで探す。
  const neighborQuestions = w.confusedWith
    .filter((name) => !getWordByAcronym(name))
    .map((name) => ({ name, questions: getKakomonByTag(name) }))
    .filter((x) => x.questions.length > 0);
  const wordCount = getAllWords().length;
  const mainTopic = topics[0];

  return (
    <article className="g-col">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={wordJsonLd(w)} />
      <Breadcrumb crumbs={crumbs} />
      <h1>{wordTitle(w)}</h1>
      <div className="g-lead">
        <p>
          {isWordLikeEntry(w) ? (
            <>
              <strong>{w.acronym}</strong>は日本語で「{w.japanese}」です。
            </>
          ) : (
            <>
              <strong>{w.acronym}</strong>は「{w.fullName}」の略で、日本語では「{w.japanese}」です。
            </>
          )}
          {w.oneLine}
        </p>
      </div>

      <dl className="k-def">
        <div>
          <dt>正式名称</dt>
          <dd>{w.fullName}</dd>
        </div>
        <div>
          <dt>日本語</dt>
          <dd>{w.japanese}</dd>
        </div>
        {w.words.length > 0 && (
          <div>
            <dt>単語の意味</dt>
            <dd>{w.words.map((p) => `${p.word}＝${p.meaning}`).join(" / ")}</dd>
          </div>
        )}
        <div>
          <dt>分野</dt>
          <dd>{WORDLIST_CATEGORY_LABELS[w.category]}</dd>
        </div>
        {w.examKeywords.length > 0 && (
          <div>
            <dt>試験のキーワード</dt>
            <dd>{w.examKeywords.join("、")}</dd>
          </div>
        )}
      </dl>

      <WordMiniQuiz quiz={wordMiniQuiz(w)} wordCount={wordCount} />

      {(w.confusedWith.length > 0 || traps.length > 0) && (
        <section className="k-section" aria-labelledby="w-diff">
          <h2 id="w-diff">
            {w.confusedWith.length > 0
              ? `${w.acronym}と${w.confusedWith.join("・")}の違い`
              : "似た用語との違い"}
          </h2>
          {w.differenceAxis && <p>見分けるポイントは「{w.differenceAxis}」です。</p>}
          {compared.length > 0 && (
            <div className="g-table compact">
              <table>
                <thead>
                  <tr>
                    <td />
                    <th scope="col">{w.acronym}</th>
                    {compared.map((c) => (
                      <th key={c.id} scope="col">
                        <a href={wordPath(c.id)}>{c.acronym}</a>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">日本語</th>
                    <td>{w.japanese}</td>
                    {compared.map((c) => (
                      <td key={c.id}>{c.japanese}</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">正式名称</th>
                    <td>{w.fullName}</td>
                    {compared.map((c) => (
                      <td key={c.id}>{c.fullName}</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">ひとことで</th>
                    <td>{w.oneLine}</td>
                    {compared.map((c) => (
                      <td key={c.id}>{c.oneLine}</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">試験のキーワード</th>
                    <td>{w.examKeywords.join("、")}</td>
                    {compared.map((c) => (
                      <td key={c.id}>{c.examKeywords.join("、")}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {traps.length > 0 && (
            <ul>
              {traps.map(([name, text]) => {
                const other = getWordByAcronym(name);
                return (
                  <li key={name}>
                    <strong>{other ? <a href={wordPath(other.id)}>{name}</a> : name}</strong>：{text}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {family && (
        <section className="k-section" aria-labelledby="w-flow">
          <h2 id="w-flow">
            {family.name}の流れで覚える：{family.steps.map((s) => getWord(s.wordId)?.acronym).join("→")}
          </h2>
          <p>{family.lead}</p>
          <ol className="w-flow">
            {family.steps.map((step, i) => {
              const sw = getWord(step.wordId);
              if (!sw) return null;
              const current = sw.id === w.id;
              return (
                <li key={sw.id} className={current ? "is-current" : undefined} aria-current={current ? "step" : undefined}>
                  <span className="w-flow-n">{i + 1}</span>
                  <div>
                    <p className="w-flow-name">
                      {current ? <strong>{sw.acronym}</strong> : <a href={wordPath(sw.id)}>{sw.acronym}</a>}
                      <span>{sw.japanese}</span>
                      <span className="w-flow-when">{step.when}</span>
                    </p>
                    <p className="w-flow-ask">
                      「{step.ask}」→ {step.back}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p>
            公式過去問（{kakomonYearRangeLabel()}）で問題文・選択肢に出てくる回数は、
            {family.steps
              .map((s) => `${getWord(s.wordId)?.acronym} ${countKakomonAskingWord(s.wordId)}問`)
              .join("・")}
            です。{family.examNote}
          </p>
        </section>
      )}

      {topics.length > 0 && (
        <section className="k-section" aria-labelledby="w-topics">
          <h2 id="w-topics">{w.acronym}が出てくるテーマの解説</h2>
          <ul className="k-list">
            {topics.map((t) => (
              <li key={t.id}>
                <a href={kaisetsuPath(t.id)}>
                  <span className="t">{t.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {questions.length > 0 && (
        <section className="k-section" aria-labelledby="w-questions">
          <h2 id="w-questions">
            {w.acronym}が出てくる過去問（{questions.length}問）
          </h2>
          <p>
            公式過去問（{kakomonYearRangeLabel()}・全{getAllKakomonQuestions().length}問）のうち、
            {asked > 0
              ? `${w.acronym}が問題文か選択肢に出てくるのは${asked}問です。`
              : `${w.acronym}は問題文・選択肢には直接出てきませんが、解説で触れている問題があります。`}
          </p>
          <KakomonList questions={questions.slice(0, MAX_QUESTIONS)} withYear />
        </section>
      )}

      {neighborQuestions.map(({ name, questions: nq }) => (
        <section key={name} className="k-section" aria-labelledby={`w-nq-${name}`}>
          <h2 id={`w-nq-${name}`}>{name}が問われた過去問（{nq.length}問）</h2>
          <p>
            {w.acronym}と並んで出る{name}は、試験では次の問題で問われています。
          </p>
          <KakomonList questions={nq.slice(0, MAX_QUESTIONS)} withYear />
        </section>
      ))}

      <GuideCTA
        title={
          mainTopic ? `${w.acronym}は「${mainTopic.title}」の範囲でまとめて覚える` : "英略語はカードで毎日少しずつ覚える"
        }
        body={
          mainTopic
            ? `アプリでは「${mainTopic.title}」の図解解説→確認問題→英略語カード（${wordCount}語）の順に、試験日から逆算した今日の分を毎日組み立てます。最初の7日間は学習記録も無料です。`
            : `アプリの英略語カードは、${wordCount}語を「意味→略語」「似た用語との違い」など複数の角度から確認できます。最初の7日間は学習記録も無料です。`
        }
      />
    </article>
  );
}
