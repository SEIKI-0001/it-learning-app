import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/compare/it-passport-study-app-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "study-app-comparison-2026";

export const metadata: Metadata = {
  title: "ITパスポート勉強アプリの選び方｜4タイプを比較【2026年版】",
  description:
    "ITパスポートの勉強アプリはどれがいい？一問一答、過去問サイト、動画講義、AI学習支援を比較し、初心者・社会人・直前期など目的別の選び方を解説します。",
  keywords: [
    "ITパスポート アプリ おすすめ",
    "ITパスポート 勉強アプリ",
    "ITパスポート アプリ 2026",
    "ITパスポート 過去問 アプリ",
    "ITパスポート AI 学習",
    "ITパスポート 独学 アプリ",
    "ITパスポート 勉強法",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポート勉強アプリの選び方｜4タイプを比較【2026年版】",
    description:
      "一問一答・過去問サイト・動画講義・AI学習支援を、弱点対策・計画・スキマ時間・理解の深さで比較。",
    type: "article",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート勉強アプリの選び方【2026年版】",
    description: "4タイプの学習ツールを比較し、自分に合う選び方を解説します。",
  },
};

const faq = [
  {
    q: "ITパスポートはアプリだけで合格できますか？",
    a: "アプリだけで学習を進めることは可能ですが、重要なのはアプリの数ではなく、現行シラバスの範囲確認、問題演習、弱点復習、本番形式の確認まで学習ループを作れるかです。足りない機能は別教材で補うと安全です。",
  },
  {
    q: "無料アプリと有料アプリはどちらがいいですか？",
    a: "問題演習が目的なら無料ツールでも十分役立つ場合があります。一方、学習計画、弱点分析、質問対応などに時間を使っているなら、その部分を支援するサービスに価値が出やすくなります。",
  },
  {
    q: "過去問アプリは何を基準に選べばいいですか？",
    a: "問題数だけでなく、解説の分かりやすさ、分野別の復習、間違えた問題の再演習、現行シラバスとの整合を確認してください。",
  },
  {
    q: "2026年のITパスポートはどのシラバスで勉強しますか？",
    a: "2026年8月時点でIPAが掲載しているITパスポート試験シラバスはVer.6.5です。教材やアプリを選ぶときも、現行範囲への対応状況を確認するのがおすすめです。",
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
      datePublished: "2026-08-19",
      dateModified: "2026-08-19",
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
    無料で自分専用の学習計画を作る
  </Link>
);

const rows = [
  {
    type: "一問一答アプリ",
    best: "スキマ時間で反復したい人",
    strength: "短時間で問題数をこなしやすい",
    weakness: "全体計画や弱点の優先順位は自分で決めることが多い",
  },
  {
    type: "過去問サイト・アプリ",
    best: "本番レベルを確認したい人",
    strength: "実際の出題イメージをつかみやすい",
    weakness: "正答率だけを追うと、理解不足を見落としやすい",
  },
  {
    type: "動画講義型",
    best: "文章だけでは理解しにくい初心者",
    strength: "背景や仕組みを順序立てて理解しやすい",
    weakness: "視聴だけで満足せず問題演習を組み合わせる必要がある",
  },
  {
    type: "AI学習支援型",
    best: "計画・弱点復習を効率化したい人",
    strength: "疑問の深掘りや次に学ぶ内容の整理と相性がよい",
    weakness: "AIの回答を鵜呑みにせず、公式情報や問題で確認する必要がある",
  },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-bold">it-learning-app</Link>
          <Cta position="header" />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <p className="text-sm font-bold text-slate-500">ITパスポート学習ツール比較・2026年版</p>
        <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight md:text-5xl">
          ITパスポート勉強アプリの選び方<br />4タイプを比較
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
          ITパスポート対策には、一問一答、過去問、動画講義、AI学習支援など多くの選択肢があります。重要なのは「一番人気のアプリ」を探すことではなく、自分の学習で不足している機能を選ぶことです。
        </p>
        <div className="mt-8"><Cta position="hero" /></div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-14">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4 font-bold">タイプ</th>
                <th className="p-4 font-bold">向いている人</th>
                <th className="p-4 font-bold">強み</th>
                <th className="p-4 font-bold">注意点</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.type} className="border-t border-slate-200 align-top">
                  <td className="p-4 font-bold">{row.type}</td>
                  <td className="p-4 text-slate-700">{row.best}</td>
                  <td className="p-4 text-slate-700">{row.strength}</td>
                  <td className="p-4 text-slate-700">{row.weakness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-5 pb-20">
        <section>
          <h2 className="text-2xl font-black">結論：アプリは「足りない機能」で選ぶ</h2>
          <p className="mt-4 leading-8 text-slate-700">
            問題を解く習慣がないなら一問一答、知識はあるが本番に不安があるなら過去問、用語の意味から理解したいなら動画講義が候補になります。一方、「今日は何を勉強するか」「どこを復習するか」を決めることに時間を使っている人は、AI学習支援型との相性がよいでしょう。
          </p>
          <p className="mt-4 leading-8 text-slate-700">
            複数のツールを入れること自体が目的ではありません。理解 → 問題演習 → 弱点発見 → 復習 → 再演習という一つの学習ループが回る組み合わせを作ることが重要です。
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black">選ぶ前に見るべき5つのポイント</h2>
          <div className="mt-6 space-y-6 text-slate-700">
            <div><h3 className="font-bold">1. 現行シラバスに沿っているか</h3><p className="mt-2 leading-7">2026年8月時点でIPAが掲載しているITパスポート試験シラバスはVer.6.5です。古い教材を使う場合は、現在の範囲との差分を公式シラバスで確認します。</p></div>
            <div><h3 className="font-bold">2. 正解・不正解の理由まで確認できるか</h3><p className="mt-2 leading-7">答えだけではなく、「なぜ他の選択肢が違うのか」まで確認できると、似た用語への対応力を上げやすくなります。</p></div>
            <div><h3 className="font-bold">3. 間違えた問題へ戻りやすいか</h3><p className="mt-2 leading-7">大量に解くだけではなく、誤答を後からまとめて復習できるかを見ます。弱点を放置しない仕組みが重要です。</p></div>
            <div><h3 className="font-bold">4. 分野ごとの偏りを把握できるか</h3><p className="mt-2 leading-7">本試験はストラテジ、マネジメント、テクノロジの3分野から出題されます。得意分野だけでなく、弱い分野を把握できる方が学習計画を立てやすくなります。</p></div>
            <div><h3 className="font-bold">5. 次に何をするか決めやすいか</h3><p className="mt-2 leading-7">学習のたびに教材や問題を選ぶ必要があると、開始までの負荷が増えます。学習計画や復習の優先順位まで扱えるかも比較軸になります。</p></div>
          </div>
        </section>

        <section className="mt-14 rounded-3xl bg-slate-50 p-7">
          <h2 className="text-2xl font-black">目的別：どのタイプを選ぶ？</h2>
          <div className="mt-6 space-y-5 text-slate-700">
            <p><b>IT未経験で最初から理解したい：</b>動画講義・基礎教材 + 一問一答</p>
            <p><b>通勤時間を中心に勉強したい：</b>一問一答 + 間違い復習</p>
            <p><b>試験まで1か月を切っている：</b>過去問 + 弱点分野の集中復習</p>
            <p><b>勉強計画を立てるのが苦手：</b>AI学習支援 + 過去問・問題演習</p>
            <p><b>同じ問題を何度も間違える：</b>解説・AIによる理由確認 + 別問題で再判定</p>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black">AI学習支援は「答えを聞く」より「弱点を整理する」ために使う</h2>
          <p className="mt-4 leading-8 text-slate-700">
            AIに正解だけを聞くと、理解したつもりになりやすくなります。おすすめは「この選択肢が違う理由を説明して」「AとBの違いを初心者向けに比較して」「同じ論点の類題を作って」のように、理解を深める補助として使う方法です。
          </p>
          <p className="mt-4 leading-8 text-slate-700">
            さらに、問題演習で見つかった弱点を次の学習計画へ反映できれば、「分からないことは分かったが、いつ復習するか決まっていない」という状態を減らせます。
          </p>
        </section>

        <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-white">
          <p className="text-sm font-bold text-slate-300">it-learning-app</p>
          <h2 className="mt-2 text-3xl font-black">アプリ選びより先に、自分の学習ルートを決める。</h2>
          <p className="mt-4 leading-8 text-slate-200">
            試験日と使える時間から学習計画を作り、問題演習で見つかった弱点を次の復習へつなげます。何を使うかで迷う時間を減らし、今日やることから始めましょう。
          </p>
          <div className="mt-6"><Cta position="mid" /></div>
        </section>

        <section className="mt-14 border-y border-slate-200 py-10">
          <h2 className="text-2xl font-black">2026年受験者が確認しておきたい公式情報</h2>
          <p className="mt-4 leading-8 text-slate-700">
            現行ITパスポート試験は120分・100問の多肢選択式です。IPAが2026年8月時点で掲載しているシラバスはVer.6.5です。教材やアプリの情報だけでなく、学習範囲はIPAの一次情報でも確認してください。
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold">
            <a className="underline" href="https://www.ipa.go.jp/shiken/kubun/ip.html" target="_blank" rel="noreferrer">IPA：ITパスポート試験</a>
            <a className="underline" href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" target="_blank" rel="noreferrer">IPA：試験要綱・シラバス</a>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black">よくある質問</h2>
          <div className="mt-6 space-y-6">
            {faq.map((item) => (
              <div key={item.q} className="rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold">Q. {item.q}</h3>
                <p className="mt-3 leading-7 text-slate-700">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 text-center">
          <h2 className="text-3xl font-black">自分に合う学習方法を、今日から始める。</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-600">
            試験日、使える時間、現在の理解度に合わせて、まず自分専用の学習計画を作ってみましょう。
          </p>
          <div className="mt-7"><Cta position="bottom" /></div>
        </section>
      </article>
    </main>
  );
}
