import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, GuideCTA, JsonLd } from "@/components/guide/GuideParts";
import KakomonList from "@/components/guide/KakomonList";
import { breadcrumbJsonLd, buildMetadata, type Crumb } from "@/lib/guide/seo";
import {
  countKakomonAskingWord,
  getAllKakomonQuestions,
  getKakomonForWord,
  kakomonYearRangeLabel,
} from "@/lib/publicPages/kakomon";
import { getTopicsForWord, kaisetsuPath } from "@/lib/publicPages/kaisetsu";
import {
  WORDS_BASE_PATH,
  isWordLikeEntry,
  wordComparisonEntries,
  wordDescription,
  wordPath,
  wordTitle,
} from "@/lib/publicPages/words";
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
    { name: "トップ", path: "/lp" },
    { name: "英略語", path: WORDS_BASE_PATH },
    { name: w.acronym, path: wordPath(w.id) },
  ];
  const questions = getKakomonForWord(w.id);
  const traps = Object.entries(w.trapExplanations);
  const topics = getTopicsForWord(w.id);
  const compared = wordComparisonEntries(w);
  const asked = countKakomonAskingWord(w.id);

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

      <GuideCTA
        title="英略語はカードで毎日少しずつ覚える"
        body={`アプリの英略語カードは、${getAllWords().length}語を「意味→略語」「似た用語との違い」など複数の角度から確認できます。最初の7日間は学習記録も無料です。`}
      />
    </article>
  );
}
