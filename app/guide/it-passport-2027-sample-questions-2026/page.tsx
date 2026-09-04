import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-2027-sample-questions-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "2027-sample-questions-2026";

export const metadata: Metadata = {
  title: "2027年ITパスポートのサンプル問題4問を解説｜新試験で増える3テーマ【2026年最新】",
  description: "IPAが2026年8月31日に公開した2027年度ITパスポート新試験のサンプル問題4問を解説。マインド・スタンス、データマネジメント、情報倫理・AI倫理から、今後の勉強で押さえたいポイントを整理します。",
  keywords: [
    "ITパスポート 2027 サンプル問題",
    "ITパスポート 新試験 問題",
    "ITパスポート 新シラバス",
    "ITパスポート AI倫理",
    "ITパスポート データマネジメント",
    "ITパスポート 2027",
    "ITパスポート AI 学習",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "2027年ITパスポートのサンプル問題4問を解説",
    description: "IPAが公開した新試験サンプル問題から、2027年度に向けて増える学習テーマを整理。",
    type: "article",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "2027年ITパスポートのサンプル問題4問を解説",
    description: "マインド・スタンス、データマネジメント、情報倫理・AI倫理。新試験で何を学ぶ？",
  },
};

const themes = [
  {
    no: "01",
    title: "マインド・スタンス",
    sample: "失敗を小さく許容し、フィードバックを得ながら反復的に改善する姿勢",
    takeaway: "用語暗記だけでなく、DXの現場でどう行動するかを状況問題で判断する力が問われます。",
  },
  {
    no: "02",
    title: "データマネジメント",
    sample: "データのサイロ化、メタデータなど、データを組織で正しく扱う基礎",
    takeaway: "AI活用の前提となるデータの整備・意味・共有方法まで理解する必要があります。",
  },
  {
    no: "03",
    title: "情報倫理・AI倫理",
    sample: "生成AIへの機密情報・個人情報の入力、生成情報の誤りなどのリスク",
    takeaway: "生成AIの仕組みだけでなく、業務利用時の契約・個人情報・正確性のリスク判断が重要になります。",
  },
];

const faq = [
  {
    q: "2027年度のITパスポートでは、この4問と同じ形式が出ますか？",
    a: "断定できません。IPAは、今回のサンプル問題は新たな出題分野・出題形式のイメージ共有を目的としたもので、実際の試験と同じ問題作成・チェックのプロセスを経たものではないと説明しています。",
  },
  {
    q: "2026年中に受験する人も新しい3テーマを勉強すべきですか？",
    a: "2026年度は現行試験制度での受験を優先し、現行シラバスを基準に学習するのが基本です。2027年度以降に受験する人は、新シラバス案の更新を追いながら新分野を加えてください。",
  },
  {
    q: "2027年度からITパスポートは難しくなりますか？",
    a: "現時点では単純に難化すると断定できません。出題分野は再整理され、新しい学習テーマが明確化されていますが、シラバス案Ver.0.1は今後変更される可能性があります。",
  },
  {
    q: "AIを使って新分野を勉強するなら何をさせると効果的ですか？",
    a: "用語の答えを聞くだけでなく、ケース問題の判断理由を説明させる、似た概念を比較させる、自分の弱点テーマの類題を作らせる、といった使い方が有効です。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: "2027年ITパスポートのサンプル問題4問を解説｜新試験で増える3テーマ【2026年最新】",
      description: metadata.description,
      url: pageUrl,
      inLanguage: "ja-JP",
      datePublished: "2026-09-01",
      dateModified: "2026-09-01",
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

const cta = (position: string) => `/onboarding?source=${source}&position=${position}`;

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-bold text-blue-700">it-learning-app</Link>
          <Link href={cta("header")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">無料で学習計画を作る</Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-5 py-12">
        <div className="mb-4 text-sm font-semibold text-blue-700">2027年度新試験まとめ｜2026年9月1日更新</div>
        <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">2027年ITパスポートの<br /><span className="text-blue-700">サンプル問題4問から分かること</span></h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">IPAは2026年8月31日、2027年度から開始予定の新ITパスポート試験について、4問のサンプル問題を公開しました。問題から見えるのは、単なる用語追加ではなく、<strong>DXでの行動、データ活用の基礎、生成AIを安全に使う判断</strong>がより明確に問われる方向性です。</p>

        <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <p className="font-bold">先に結論</p>
          <p className="mt-2 leading-7">新たに示されたサンプル問題は、①マインド・スタンス、②データマネジメント、③情報倫理・AI倫理の3テーマです。2027年度受験者は「用語を知っている」だけでなく、仕事の場面でどう判断するかまで説明できる学習へ切り替える必要があります。</p>
        </div>

        <Link href={cta("hero")} className="mt-8 block rounded-xl bg-blue-600 px-6 py-4 text-center text-lg font-bold text-white">新試験に合わせた学習計画を無料で作る →</Link>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">IPAが公開したサンプル問題は4問</h2>
          <p className="mt-4 leading-8 text-slate-700">IPAの公式PDFは4ページで、問題は計4問です。問1がマインド・スタンス、問2・問3がデータマネジメント、問4が情報倫理・AI倫理に分類されています。</p>
          <p className="mt-4 leading-8 text-slate-700">ただし、IPAはこの4問を<strong>「新たな出題分野、出題形式のイメージを共有するため」</strong>のサンプルと説明しています。本番の出題比率や難易度を4問だけから推定するのは避けるべきです。</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="https://www.ipa.go.jp/shiken/syllabus/henkou/2026/20260622.html" target="_blank" rel="noreferrer" className="rounded-lg border bg-white px-4 py-3 font-semibold text-blue-700">IPA サンプル問題一覧を見る</a>
            <a href="https://www.ipa.go.jp/shiken/syllabus/henkou/2026/20260630.html" target="_blank" rel="noreferrer" className="rounded-lg border bg-white px-4 py-3 font-semibold text-blue-700">IPA 新シラバス案を見る</a>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">サンプル問題から見える3つの新テーマ</h2>
          <div className="mt-6 grid gap-5">
            {themes.map((item) => (
              <div key={item.no} className="rounded-2xl border bg-white p-6">
                <div className="text-sm font-bold text-blue-600">THEME {item.no}</div>
                <h3 className="mt-1 text-xl font-bold">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate-700"><strong>サンプルで問われた内容：</strong>{item.sample}</p>
                <p className="mt-3 rounded-xl bg-slate-50 p-4 leading-7 text-slate-600"><strong>学習への示唆：</strong>{item.takeaway}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-2xl bg-slate-900 p-7 text-white">
          <h2 className="text-2xl font-bold">4問を解いて終わりでは足りない</h2>
          <p className="mt-4 leading-8 text-slate-200">重要なのは正解を覚えることではなく、「なぜその判断になるのか」を説明できることです。新テーマはケース問題との相性がよいため、次の3つをセットで学ぶのがおすすめです。</p>
          <ol className="mt-6 space-y-4">
            <li className="rounded-xl bg-white/10 p-5"><strong>1. 用語の意味</strong><p className="mt-2 text-slate-200">サイロ化、メタデータ、生成AI利用リスクなどの基本語を理解する。</p></li>
            <li className="rounded-xl bg-white/10 p-5"><strong>2. 実務での具体例</strong><p className="mt-2 text-slate-200">どんな場面で問題になるかを自分の言葉で説明する。</p></li>
            <li className="rounded-xl bg-white/10 p-5"><strong>3. 類似ケースで再判断</strong><p className="mt-2 text-slate-200">条件が変わっても正しい判断ができるか、別問題で確認する。</p></li>
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">AI学習と相性がいい3つの使い方</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["判断理由を説明させる", "『なぜこの選択肢が適切なのか』を初心者向けに説明させる。"],
              ["似た概念を比較する", "データサイロとデータ品質問題など、混同しやすい概念を横並びにする。"],
              ["類題を作らせる", "同じ論点で業務シーンだけ変えた問題を作り、自力で再回答する。"],
            ].map(([h, p]) => (
              <div key={h} className="rounded-2xl border bg-white p-5">
                <h3 className="font-bold">{h}</h3>
                <p className="mt-3 leading-7 text-slate-600">{p}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 leading-8 text-slate-700">ただし、AIに毎回答えだけを聞くと、自分の弱点が見えません。先に自分で解き、迷った理由を残し、その後でAIを解説役として使う方が学習データを蓄積しやすくなります。</p>
          <Link href={cta("mid")} className="mt-7 block rounded-xl bg-blue-600 px-6 py-4 text-center text-lg font-bold text-white">弱点から次にやることを自動で決める →</Link>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">2026年受験者と2027年度受験者で、今やることは違う</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6">
              <div className="text-sm font-bold text-emerald-700">2026年中に受験</div>
              <h3 className="mt-2 text-xl font-bold">現行シラバスを優先</h3>
              <p className="mt-3 leading-7 text-slate-600">制度変更ニュースに振り回されず、現行試験の3分野と公開問題を優先します。資格が必要な時期が近いなら、新制度を待つ必要はありません。</p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
              <div className="text-sm font-bold text-blue-700">2027年度に受験</div>
              <h3 className="mt-2 text-xl font-bold">新シラバス案を学習計画へ追加</h3>
              <p className="mt-3 leading-7 text-slate-700">現行範囲の基礎に加えて、マインド・スタンス、データマネジメント、情報倫理・AI倫理を早めに学び始めます。正式版の更新も追跡しましょう。</p>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">新試験対策で最初に作るべき学習ループ</h2>
          <ol className="mt-6 space-y-4">
            {[
              ["1. 受験年度を決める", "2026年中か2027年度以降かで、優先するシラバスを決めます。"],
              ["2. サンプル問題を初見で解く", "正誤だけでなく、迷った問題も記録します。"],
              ["3. 弱点テーマを1つずつ補う", "用語→具体例→ケース判断の順で理解します。"],
              ["4. 別問題で再測定する", "答えを覚えたのではなく、理解できたかを確認します。"],
            ].map(([h, p]) => (
              <li key={h} className="rounded-xl border bg-white p-5">
                <h3 className="font-bold">{h}</h3>
                <p className="mt-2 text-slate-600">{p}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">よくある質問</h2>
          <div className="mt-6 space-y-4">
            {faq.map((item) => (
              <div key={item.q} className="rounded-2xl border bg-white p-6">
                <h3 className="font-bold">Q. {item.q}</h3>
                <p className="mt-3 leading-7 text-slate-600">A. {item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-3xl bg-blue-700 p-8 text-center text-white">
          <p className="text-sm font-bold text-blue-100">it-learning-app</p>
          <h2 className="mt-2 text-2xl font-extrabold md:text-3xl">新試験情報を「読むだけ」で終わらせない。</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-blue-100">受験時期と現在地から、次に学ぶべき範囲を整理。問題演習の結果に合わせて弱点復習へつなげます。</p>
          <Link href={cta("bottom")} className="mt-7 inline-block rounded-xl bg-white px-7 py-4 font-bold text-blue-700">無料で自分専用の学習計画を作る →</Link>
        </section>

        <footer className="mt-10 border-t pt-6 text-sm leading-6 text-slate-500">
          <p>参考：IPA「新試験制度のサンプル問題について」「新試験制度のシラバス案について」。新制度の内容は2026年9月1日時点の案であり、今後変更される可能性があります。</p>
        </footer>
      </article>
    </main>
  );
}
