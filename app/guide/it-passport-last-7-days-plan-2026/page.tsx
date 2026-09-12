import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-last-7-days-plan-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "last-7-days-plan-2026";

export const metadata: Metadata = {
  title: "ITパスポート試験まであと1週間｜直前にやること7選【2026年版】",
  description:
    "ITパスポート試験まで残り1週間の人向けに、過去問、弱点復習、100問・120分の時間配分、前日の過ごし方まで、直前期に優先したい7つの対策を解説します。",
  keywords: [
    "ITパスポート 1週間",
    "ITパスポート 直前対策",
    "ITパスポート 試験 1週間前",
    "ITパスポート 過去問",
    "ITパスポート 勉強法 2026",
    "ITパスポート AI 学習",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポート試験まであと1週間｜直前にやること7選【2026年版】",
    description: "残り7日で新しい教材を増やさず、弱点と本番対応に集中する直前対策を解説します。",
    type: "article",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート試験まであと1週間｜直前対策7選",
    description: "過去問・弱点復習・時間配分を7日間に落とし込む直前学習プラン。",
  },
};

const items = [
  {
    title: "1. 新しい教材を増やさない",
    body: "残り1週間では、参考書や動画を次々に追加するより、すでに使っている教材と公式公開問題を中心にします。学習対象を増やすより、間違えた論点を減らすことを優先します。",
  },
  {
    title: "2. まずまとまった問題数を解いて弱点を可視化する",
    body: "最初に実戦形式で問題を解き、正解・不正解だけでなく『迷った正解』も記録します。勘で正解した問題は本番で再現できない可能性があるため、復習対象に含めます。",
  },
  {
    title: "3. 誤答を『知らない・混同・計算・読み違い』に分ける",
    body: "原因ごとに復習方法を変えます。知らない用語は基礎へ戻る、混同した用語は比較する、計算ミスは同じ型をもう1問解く、読み違いは設問文の条件を確認する、というように対処します。",
  },
  {
    title: "4. 3分野のうち弱いところへ時間を寄せる",
    body: "ITパスポートは総合評価点だけでなく、ストラテジ・マネジメント・テクノロジの各分野にも基準があります。得意分野だけで全体を押し上げようとせず、弱い分野を放置しないことが重要です。",
  },
  {
    title: "5. AIは『答えを聞く』より『違いを説明させる』",
    body: "AIを使うなら、『なぜこの選択肢が誤り？』『AとBの違いを初心者向けに比較して』『数字を変えた類題を1問作って』のように、短時間で理解を補う用途に使います。",
  },
  {
    title: "6. 2〜3日前に100問・120分を意識した演習をする",
    body: "短い一問一答だけでは、本番の集中力や時間配分は確認できません。試験直前には、100問・120分という本番条件を意識したまとまった演習を行い、迷う問題に時間を使いすぎない感覚を確認します。",
  },
  {
    title: "7. 前日は新しい範囲より『最後に間違えたもの』を見る",
    body: "前日に知識を一気に増やそうとすると、復習対象が散らばりやすくなります。直近で間違えた用語、計算パターン、混同しやすい論点を短く確認し、当日の準備を優先します。",
  },
];

const faq = [
  {
    q: "ITパスポートは1週間の勉強で合格できますか？",
    a: "現在の知識量や学習時間によって大きく異なるため、1週間での合格を一律には保証できません。残り1週間なら、範囲を最初から学び直すより、問題演習で弱点を特定して優先順位を付ける方が現実的です。",
  },
  {
    q: "試験1週間前は過去問だけやればいいですか？",
    a: "過去問を中心にするのは有効ですが、間違えた理由を確認せず解き続けるだけでは改善しにくいです。誤答や迷った問題を特定し、必要な部分だけ基礎へ戻ってから別問題で再確認してください。",
  },
  {
    q: "直前はどの分野を優先すべきですか？",
    a: "一律にテクノロジ系などを優先するのではなく、自分の分野別結果を基準にします。現行試験は3分野それぞれに評価点の基準があるため、特に低い分野を残さないことを優先してください。",
  },
  {
    q: "2026年の学習範囲は何を基準にすればいいですか？",
    a: "2026年8月時点でIPAが掲載しているITパスポート試験シラバスはVer.6.5です。公式公開問題と現行シラバスを基準に確認してください。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: metadata.title,
      description: metadata.description,
      url: pageUrl,
      inLanguage: "ja-JP",
      datePublished: "2026-08-23",
      dateModified: "2026-08-23",
      author: { "@type": "Organization", name: "it-learning-app" },
      publisher: { "@type": "Organization", name: "it-learning-app" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faq.map((x) => ({
        "@type": "Question",
        name: x.q,
        acceptedAnswer: { "@type": "Answer", text: x.a },
      })),
    },
  ],
};

const Cta = ({ position }: { position: string }) => (
  <Link
    href={`/onboarding?source=${source}&position=${position}`}
    className="inline-flex rounded-xl bg-slate-900 px-6 py-3 font-bold text-white transition hover:bg-slate-700"
  >
    無料で残り7日の学習計画を作る
  </Link>
);

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="font-bold">it-learning-app</Link>
          <Cta position="header" />
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-14">
        <p className="mb-3 text-sm font-bold text-slate-500">ITパスポート直前対策・2026年版</p>
        <h1 className="text-4xl font-black leading-tight tracking-tight">
          ITパスポート試験まであと1週間<br />直前にやること7選
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          試験まで残り7日。ここから重要なのは、学習範囲を広げることではありません。問題を解いて「まだ落としやすいところ」を見つけ、その弱点に残り時間を集中させることです。1週間を、焦って全部やり直す期間ではなく、合格に必要な穴を減らす期間に変えましょう。
        </p>
        <div className="mt-8"><Cta position="hero" /></div>

        <section className="mt-16 rounded-3xl bg-amber-50 p-7">
          <p className="text-sm font-bold text-amber-900">先に結論</p>
          <h2 className="mt-2 text-2xl font-black">残り1週間は「新しく覚える量」より「間違いを繰り返さない率」を上げる</h2>
          <p className="mt-4 leading-8 text-slate-700">
            1週間で合格できるかは、スタート時点の知識や確保できる時間によって変わります。短期合格の体験談をそのまま自分へ当てはめるのではなく、まず現在地を測り、残り日数を弱点へ再配分してください。
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black">試験1週間前にやること7選</h2>
          <div className="mt-7 space-y-8">
            {items.map((item) => (
              <div key={item.title} className="border-b border-slate-200 pb-7 last:border-0">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-3 leading-8 text-slate-700">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black">7日間の使い方：一例</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[90px_1fr] border-b border-slate-200 p-4"><b>7日前</b><span>まとまった問題を解き、弱点TOP3を決める</span></div>
            <div className="grid grid-cols-[90px_1fr] border-b border-slate-200 p-4"><b>6〜5日前</b><span>弱点TOP3を基礎に戻って復習し、類題で確認する</span></div>
            <div className="grid grid-cols-[90px_1fr] border-b border-slate-200 p-4"><b>4日前</b><span>3分野の結果を見直し、弱い分野へ時間を追加する</span></div>
            <div className="grid grid-cols-[90px_1fr] border-b border-slate-200 p-4"><b>3〜2日前</b><span>100問・120分を意識した実戦演習と誤答復習</span></div>
            <div className="grid grid-cols-[90px_1fr] p-4"><b>前日</b><span>直近の誤答だけ確認し、受験準備と睡眠を優先する</span></div>
          </div>
        </section>

        <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-white">
          <p className="text-sm font-bold text-slate-300">it-learning-app</p>
          <h2 className="mt-2 text-3xl font-black">残り7日。「全部やる」から「次にやることを決める」へ。</h2>
          <p className="mt-4 leading-8 text-slate-200">
            試験日、使える時間、今の弱点から、残り期間の学習優先順位を整理します。毎日の学習を「何をやるか迷う時間」から始めないための計画を作れます。
          </p>
          <div className="mt-6"><Cta position="mid" /></div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black">直前でも確認したい現行試験の基準</h2>
          <p className="mt-4 leading-8 text-slate-700">
            ITパスポート試験は100問・120分のCBT方式です。合格には総合評価点600/1,000点以上に加え、ストラテジ・マネジメント・テクノロジの各分野で300/1,000点以上が必要です。評価点はIRT方式で算出されるため、単純に「正答率60％なら必ず600点」とは換算できません。
          </p>
          <p className="mt-4 leading-8 text-slate-700">
            2026年8月時点でIPAが掲載している現行シラバスはVer.6.5です。直前期に古い教材を使っている場合は、現行シラバスと2026年度の公式公開問題も確認しておくと安全です。
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold">
            <a className="underline" href="https://www.ipa.go.jp/shiken/kubun/ip.html" target="_blank" rel="noreferrer">IPA：ITパスポート試験</a>
            <a className="underline" href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" target="_blank" rel="noreferrer">IPA：試験要綱・シラバス</a>
            <a className="underline" href="https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/questions.html" target="_blank" rel="noreferrer">IPA：公開問題・解答例</a>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black">よくある質問</h2>
          <div className="mt-6 space-y-6">
            {faq.map((x) => (
              <div key={x.q} className="rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold">{x.q}</h3>
                <p className="mt-3 leading-7 text-slate-700">{x.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 border-t border-slate-200 pt-10 text-center">
          <h2 className="text-3xl font-black">残り1週間なら、今日やることから決める。</h2>
          <p className="mx-auto mt-4 max-w-xl leading-8 text-slate-600">
            学習時間を増やす前に、今の弱点へ時間を集中させる計画を作りましょう。
          </p>
          <div className="mt-7"><Cta position="bottom" /></div>
        </section>
      </article>
    </main>
  );
}
