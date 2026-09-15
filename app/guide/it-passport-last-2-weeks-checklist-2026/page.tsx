import type { Metadata } from "next";
import Link from "next/link";

const title = "ITパスポート試験2週間前にやること7選｜直前対策チェックリスト【2026年版】";
const description =
  "ITパスポート試験まで残り2週間の人向けに、合格基準の確認、弱点分野の特定、過去問演習、用語復習、本番時間配分まで、直前期に優先すべき7つの対策をまとめます。";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "ITパスポート 2週間",
    "ITパスポート 直前対策",
    "ITパスポート 試験前 やること",
    "ITパスポート 過去問",
    "ITパスポート 勉強法 2026",
    "ITパスポート AI 学習",
  ],
  alternates: { canonical: "/guide/it-passport-last-2-weeks-checklist-2026" },
  openGraph: { title, description, type: "article" },
  twitter: { card: "summary_large_image", title, description },
};

const cta = "/onboarding?source=last-2-weeks-checklist-2026";

const checklist = [
  {
    title: "1. まず合格基準を確認する",
    body: "ITパスポートは総合評価点600点以上だけでなく、ストラテジ・マネジメント・テクノロジの各分野で300点以上が必要です。直前期は得意分野だけを伸ばすより、300点を割りそうな弱点分野を残さないことが重要です。",
  },
  {
    title: "2. 100問を一度、本番と同じ120分で解く",
    body: "残り2週間なら、知識を増やし続ける前に現在地を測ります。時間を計って100問を解き、正解・不正解だけでなく『迷った問題』にも印を付けてください。迷って正解した問題は、本番では再現できない可能性があります。",
  },
  {
    title: "3. 間違いを3分類する",
    body: "誤答は『用語を知らない』『意味は知っているが区別できない』『問題文の読み違い』の3つに分けます。原因が違えば復習方法も違います。すべてを参考書の最初から読み直す必要はありません。",
  },
  {
    title: "4. 弱点分野だけを短い単位で復習する",
    body: "直前期は広く読み直すより、間違えたテーマを20〜30分単位で潰す方が効率的です。例えばセキュリティ、ネットワーク、会計、プロジェクトマネジメントなど、問題演習で弱かった単位から優先します。",
  },
  {
    title: "5. AIは『わからない1点』の解消に使う",
    body: "生成AIに教材全体を任せるのではなく、『公開鍵暗号と共通鍵暗号の違いを初心者向けに説明して』『損益分岐点を具体例で説明して』のように、理解できない一点を短時間で解消する用途に使うと効果的です。制度や出題範囲の事実確認はIPAなどの一次情報を基準にしてください。",
  },
  {
    title: "6. 3〜4日前にもう一度100問を解く",
    body: "最初の演習で見つけた弱点を復習したら、もう一度まとまった問題演習を行います。点数だけでなく、同じテーマで再び間違えていないかを確認してください。繰り返し間違える分野が最後の重点復習対象です。",
  },
  {
    title: "7. 前日は新しい教材に手を出さない",
    body: "前日に新しい参考書や大量の未演習問題へ広げると、できない部分ばかりが目について焦りやすくなります。最後は自分が間違えた問題、覚えにくい用語、頻出テーマの確認に絞り、試験当日に集中できる状態を作ります。",
  },
];

export default function Page() {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    datePublished: "2026-08-10",
    dateModified: "2026-08-10",
    mainEntityOfPage: "/guide/it-passport-last-2-weeks-checklist-2026",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "ITパスポートは2週間の勉強でも合格できますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "学習開始時点の知識量によるため、2週間での合格を保証することはできません。ただし、残り2週間では範囲を最初から学び直すより、問題演習で弱点を特定して重点的に復習する方が効率的です。",
        },
      },
      {
        "@type": "Question",
        name: "試験直前は過去問を何回解けばいいですか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "回数そのものより、間違えた理由を理解し、同じテーマの誤答を減らせているかが重要です。目安として、2週間前に現在地確認、3〜4日前に仕上がり確認としてまとまった演習を行う方法があります。",
        },
      },
      {
        "@type": "Question",
        name: "ITパスポートの合格点は600点ですか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "総合評価点600点以上に加えて、ストラテジ・マネジメント・テクノロジの各分野で300点以上が必要です。評価点はIRTに基づいて算出されるため、単純な正答数だけでは決まりません。",
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <p className="mb-4 text-sm font-semibold text-amber-700">2026年8月10日更新｜試験直前対策</p>
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
          ITパスポート試験2週間前にやること7選
          <span className="mt-2 block text-2xl text-slate-600 sm:text-3xl">直前対策チェックリスト【2026年版】</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-700">
          試験まで残り2週間になると、「参考書をもう1周するべき？」「過去問を何回やればいい？」と迷いやすくなります。直前期に重要なのは、勉強量を増やすことではなく、残っている弱点を特定して合格基準を割らない状態に近づけることです。
        </p>

        <div className="mt-8 rounded-3xl bg-slate-900 p-7 text-white sm:p-8">
          <p className="text-sm font-semibold text-amber-300">残り14日を、なんとなく勉強しない。</p>
          <p className="mt-2 text-2xl font-bold">今日の弱点から、残りの学習計画を作る</p>
          <p className="mt-3 leading-7 text-slate-300">it-learning-appなら、問題演習と理解度をもとに、試験日までの学習を整理できます。</p>
          <Link href={`${cta}&position=hero`} className="mt-5 inline-block rounded-xl bg-white px-5 py-3 font-bold text-slate-900">
            無料で自分専用の学習計画を作る
          </Link>
        </div>

        <section className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-xl font-bold">最初に知っておきたい試験条件</h2>
          <ul className="mt-4 space-y-2 leading-7 text-slate-700">
            <li>・試験時間：120分</li>
            <li>・出題数：100問</li>
            <li>・総合評価点：600 / 1,000点以上</li>
            <li>・分野別評価点：3分野それぞれ300 / 1,000点以上</li>
            <li>・採点：IRT（項目応答理論）に基づく評価点</li>
          </ul>
          <p className="mt-4 text-sm leading-6 text-slate-600">つまり「60問正解したら必ず合格」という単純な試験ではありません。直前期ほど、3分野の穴を確認することが重要です。</p>
          <a className="mt-3 inline-block font-semibold text-blue-700 underline" href="https://www3.jitec.ipa.go.jp/JitesCbt/html/about/range.html" target="_blank" rel="noreferrer">
            IPA：ITパスポート試験内容・出題範囲を確認する
          </a>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">試験2週間前にやること7選</h2>
          <div className="mt-6 space-y-5">
            {checklist.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-3 leading-8 text-slate-700">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">残り14日のおすすめ配分</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {[
              ["14〜11日前", "100問演習 → 弱点抽出", "現在地を測り、迷った問題まで記録する"],
              ["10〜7日前", "弱点分野の集中復習", "誤答原因ごとに短時間で復習する"],
              ["6〜4日前", "弱点テーマの再演習", "同じ種類のミスが減ったか確認する"],
              ["3〜2日前", "100問で最終確認", "時間配分と残った弱点を確認する"],
              ["前日", "誤答・用語だけ確認", "新しい教材を広げず、睡眠を優先する"],
            ].map(([period, action, purpose]) => (
              <div key={period} className="grid gap-2 border-b border-slate-200 p-5 last:border-b-0 sm:grid-cols-[120px_1fr]">
                <p className="font-bold text-blue-700">{period}</p>
                <div>
                  <p className="font-bold">{action}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{purpose}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-blue-200 bg-blue-50 p-7 sm:p-8">
          <p className="text-sm font-bold text-blue-700">直前期ほど「次に何をやるか」で迷わない</p>
          <h2 className="mt-2 text-2xl font-bold">it-learning-appで弱点から学習を組み立てる</h2>
          <p className="mt-4 leading-8 text-slate-700">
            参考書を読む時間、問題を解く時間、復習する時間を別々に考えると、直前期は優先順位が崩れやすくなります。it-learning-appでは、試験日と学習状況をもとに毎日の学習を整理し、理解度を確認しながら弱点対策へつなげられます。
          </p>
          <Link href={`${cta}&position=mid`} className="mt-5 inline-block rounded-xl bg-blue-700 px-5 py-3 font-bold text-white">
            残り日数から無料で学習計画を作る
          </Link>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">2026年受験者が注意すること</h2>
          <p className="mt-4 leading-8 text-slate-700">
            現行のITパスポート試験シラバスはVer.6.5です。また、IPAはシステムリプレースに伴い2026年12月28日以降のCBT試験を休止する予定としており、会場によってはそれより前に試験実施が休止となる場合があります。年内受験を予定している場合は、学習だけでなく受験日の確保も早めに確認してください。
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <a className="font-semibold text-blue-700 underline" href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" target="_blank" rel="noreferrer">IPA：試験要綱・シラバス</a>
            <a className="font-semibold text-blue-700 underline" href="https://www.ipa.go.jp/shiken/2026/cbt-202605-jisshi.html" target="_blank" rel="noreferrer">IPA：2026年のCBT試験実施について</a>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">よくある質問</h2>
          <div className="mt-6 space-y-7">
            <div>
              <h3 className="font-bold">Q. 本当に2週間で間に合いますか？</h3>
              <p className="mt-2 leading-7 text-slate-700">現在の知識量によります。ゼロからの合格を保証することはできませんが、すでに一度学習している人なら、直前2週間を弱点発見と再演習に集中させることで学習効率を上げられます。</p>
            </div>
            <div>
              <h3 className="font-bold">Q. 直前は参考書と過去問のどちらを優先すべき？</h3>
              <p className="mt-2 leading-7 text-slate-700">まず問題を解いて、分からなかった箇所だけ参考書へ戻る方法が効率的です。参考書を最初から読み直すより、問題→弱点→復習の順で絞り込むことをおすすめします。</p>
            </div>
            <div>
              <h3 className="font-bold">Q. AIに予想問題を作らせれば十分ですか？</h3>
              <p className="mt-2 leading-7 text-slate-700">AIは理解補助には有効ですが、出題範囲や試験制度の確認はIPA公式情報を基準にしてください。公式公開問題や信頼できる教材と組み合わせる方が安全です。</p>
            </div>
          </div>
        </section>

        <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-white sm:p-10">
          <p className="text-sm font-semibold text-amber-300">あと14日。全部やる必要はありません。</p>
          <h2 className="mt-3 text-3xl font-bold">合格に必要な弱点だけ、今日から潰す。</h2>
          <p className="mt-4 leading-8 text-slate-300">試験日を入力して、自分専用の学習計画を無料で作成できます。</p>
          <Link href={`${cta}&position=bottom`} className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-bold text-slate-900">
            無料で学習計画を作る
          </Link>
        </section>
      </article>
    </main>
  );
}
