import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const PAGE_PATH = "/blog/it-passport-calculation-problems-2026";
const PAGE_URL = `${SITE_URL.replace(/\/$/, "")}${PAGE_PATH}`;

const title = "ITパスポートの計算問題7選｜初心者向けの解き方と対策【2026年版】";
const description =
  "ITパスポートで対策しておきたい代表的な計算問題を7種類に整理。損益分岐点、稼働率、データ量、論理演算などの考え方と、独学での復習方法を初心者向けに解説します。";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "ITパスポート 計算問題",
    "ITパスポート 計算",
    "ITパスポート 損益分岐点",
    "ITパスポート 稼働率",
    "ITパスポート 初心者",
    "ITパスポート 独学",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title,
    description,
    type: "article",
    url: PAGE_URL,
    siteName: "it-learning-app",
    locale: "ja_JP",
    publishedTime: "2026-07-26",
    modifiedTime: "2026-07-26",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

const problems = [
  {
    number: "01",
    title: "損益分岐点",
    formula: "損益分岐点売上高 ＝ 固定費 ÷ 限界利益率",
    point:
      "固定費と変動費を区別し、売上がいくらになれば利益が0になるかを求めます。式を丸暗記する前に、売上から変動費を引いた残りで固定費を回収する問題だと理解すると整理しやすくなります。",
  },
  {
    number: "02",
    title: "稼働率・直列システム",
    formula: "直列システムの稼働率 ＝ 各装置の稼働率を掛ける",
    point:
      "どれか1台が停止すると全体が停止する構成では、各装置が同時に動く確率を掛け合わせます。パーセントを小数へ直してから計算します。",
  },
  {
    number: "03",
    title: "並列システムの稼働率",
    formula: "並列システムの稼働率 ＝ 1 − 全装置が停止する確率",
    point:
      "少なくとも1台が動けばよい場合は、先に『全部止まる確率』を求め、1から引くと計算しやすくなります。直列との違いを図で確認すると混同を防げます。",
  },
  {
    number: "04",
    title: "データ量・通信時間",
    formula: "通信時間 ＝ データ量 ÷ 実効速度",
    point:
      "bitとbyte、K・M・Gの単位をそろえることが最重要です。1byte＝8bitを使う場面と、伝送効率を掛けて実効速度を出す場面を分けて考えます。",
  },
  {
    number: "05",
    title: "表計算・相対参照と絶対参照",
    formula: "コピー後に変わる参照と固定する参照を見分ける",
    point:
      "数値計算より、セル参照がどのように移動するかを追う問題です。行と列を別々に見て、$が付いている側だけ固定されると判断します。",
  },
  {
    number: "06",
    title: "論理演算・真理値表",
    formula: "AND・OR・NOTの条件を表にする",
    point:
      "文章のまま考え続けず、入力の組合せと出力を小さな表にします。排他的論理和は『どちらか一方だけが真』という条件です。",
  },
  {
    number: "07",
    title: "期待値・確率",
    formula: "期待値 ＝ 結果 × その確率 の合計",
    point:
      "各結果が起きる確率を掛けて合計します。確率の合計が1になっているか確認すると、条件の読み落としに気づきやすくなります。",
  },
];

const faq = [
  {
    question: "ITパスポートの計算問題は捨ててもよいですか？",
    answer:
      "すべてを捨てる前提はおすすめしません。代表的な型は限られるため、公式を丸暗記するより、問題文からどの型かを判定する練習を優先すると得点源にしやすくなります。",
  },
  {
    question: "計算が苦手な人は何から始めるべきですか？",
    answer:
      "単位変換、割合、小数とパーセントの変換から確認し、その後に損益分岐点や稼働率などの代表問題を1種類ずつ練習するのが効率的です。",
  },
  {
    question: "公式を覚えても問題が解けません。",
    answer:
      "問題文の数値をすぐ式へ入れず、『何を求めるか』『与えられた数値は何か』『単位はそろっているか』の3点を書き出してください。誤答原因を型ごとに記録すると改善しやすくなります。",
  },
];

export default function CalculationProblemsPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: title,
      description,
      datePublished: "2026-07-26",
      dateModified: "2026-07-26",
      inLanguage: "ja-JP",
      mainEntityOfPage: { "@type": "WebPage", "@id": PAGE_URL },
      author: { "@type": "Organization", name: "it-learning-app編集部" },
      publisher: { "@type": "Organization", name: "it-learning-app" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#d7e8f2] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/blog" className="font-black text-[#12384d]">
            ITパスポート学習ガイド
          </Link>
          <Link
            href="/onboarding?source=calculation-problems-2026&position=header"
            className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white"
          >
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <article>
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <p className="inline-flex rounded-full bg-[#e8f5fb] px-4 py-2 text-sm font-black text-[#1b75a6]">
                初心者向け・計算問題まとめ
              </p>
              <h1 className="mt-6 text-4xl font-black leading-tight text-[#12384d] sm:text-6xl">
                ITパスポートの計算問題は、
                <br />
                7つの型で整理する。
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
                計算が苦手でも、問題ごとにゼロから考える必要はありません。損益分岐点、稼働率、データ量など、対策しておきたい代表的な型と、間違えにくい考え方をまとめます。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#problem-list"
                  className="inline-flex justify-center rounded-full bg-[#1b75a6] px-7 py-4 font-black text-white transition hover:bg-[#155d84]"
                >
                  7種類を確認する
                </a>
                <Link
                  href="/onboarding?source=calculation-problems-2026&position=hero"
                  className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 font-black text-white transition hover:bg-[#d98f00]"
                >
                  苦手に合わせた計画を無料作成
                </Link>
              </div>
            </div>

            <aside className="rounded-[26px] bg-[#12384d] p-7 text-white shadow-[0_18px_44px_rgba(18,56,77,0.22)]">
              <p className="text-sm font-black text-[#9edaf3]">SEOキーワード</p>
              <p className="mt-2 font-black">ITパスポート 計算問題</p>
              <p className="mt-6 text-sm font-black text-[#9edaf3]">想定読者</p>
              <p className="mt-2 leading-7">過去問で計算問題を後回しにしており、何から覚えるべきか分からない初心者</p>
              <p className="mt-6 text-sm font-black text-[#9edaf3]">訴求軸</p>
              <p className="mt-2 leading-7">公式の暗記ではなく、問題の型・単位・誤答原因を整理して得点につなげる</p>
            </aside>
          </div>
        </section>

        <section id="problem-list" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-black text-[#1b75a6]">7 CALCULATION TYPES</p>
            <h2 className="mt-3 text-3xl font-black text-[#12384d] sm:text-5xl">最初に押さえたい代表的な計算問題</h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              出題内容は問題ごとに異なりますが、考え方の入口は共通しています。まず型を判定し、単位をそろえてから式へ進みます。
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {problems.map((item) => (
              <section
                key={item.number}
                className="rounded-[22px] border border-[#cfe5f2] bg-white p-6 shadow-[0_12px_28px_rgba(22,94,131,0.07)]"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8f5fb] text-sm font-black text-[#1b75a6]">
                    {item.number}
                  </span>
                  <div>
                    <h3 className="text-2xl font-black text-[#12384d]">{item.title}</h3>
                    <p className="mt-3 rounded-[14px] bg-[#fff7df] px-4 py-3 text-sm font-bold leading-6 text-[#785000]">
                      {item.formula}
                    </p>
                    <p className="mt-4 leading-8 text-slate-700">{item.point}</p>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <div className="max-w-3xl">
              <p className="text-sm font-black text-[#1b75a6]">HOW TO IMPROVE</p>
              <h2 className="mt-3 text-3xl font-black text-[#12384d] sm:text-5xl">計算問題が伸びないときの復習順</h2>
            </div>
            <div className="mt-9 grid gap-5 lg:grid-cols-3">
              {[
                ["1. 型を判定する", "損益分岐点、稼働率、データ量など、何を求める問題かを先に分類します。"],
                ["2. 単位をそろえる", "bitとbyte、%と小数、秒と分などを式へ入れる前に統一します。"],
                ["3. 誤答理由を残す", "公式忘れ、単位ミス、条件の読み違いを分け、次の復習内容を決めます。"],
              ].map(([heading, body]) => (
                <section key={heading} className="rounded-[22px] bg-[#f4f8fb] p-6">
                  <h3 className="text-xl font-black text-[#12384d]">{heading}</h3>
                  <p className="mt-4 leading-8 text-slate-700">{body}</p>
                </section>
              ))}
            </div>

            <div className="mt-10 rounded-[26px] bg-[#12384d] p-7 text-white sm:p-10">
              <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <p className="text-sm font-black text-[#9edaf3]">it-learning-app</p>
                  <h2 className="mt-3 text-3xl font-black sm:text-4xl">苦手な型だけを、次の学習計画へ。</h2>
                  <p className="mt-4 max-w-3xl leading-8 text-[#e6f6fc]">
                    計算問題を解いた結果と試験日をもとに、確認問題、用語復習、過去問レベル演習の優先順位を整理します。学習時間の記録ではなく、理解度から次にやることを決めます。
                  </p>
                </div>
                <Link
                  href="/onboarding?source=calculation-problems-2026&position=mid-cta"
                  className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 font-black text-white transition hover:bg-[#d98f00]"
                >
                  無料で学習計画を作る
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="text-3xl font-black text-[#12384d] sm:text-4xl">よくある質問</h2>
          <div className="mt-8 space-y-4">
            {faq.map((item) => (
              <details key={item.question} className="rounded-[18px] border border-[#cfe5f2] bg-white p-5">
                <summary className="cursor-pointer font-black text-[#12384d]">{item.question}</summary>
                <p className="mt-4 leading-8 text-slate-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-[#e8f5fb] px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-black text-[#1b75a6]">NEXT ACTION</p>
            <h2 className="mt-3 text-3xl font-black text-[#12384d] sm:text-5xl">計算問題を後回しにしない学習計画を作る</h2>
            <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-700">
              試験日、現在の理解度、使える時間を入力すると、今日取り組むテーマと復習内容を整理できます。
            </p>
            <Link
              href="/onboarding?source=calculation-problems-2026&position=final-cta"
              className="mt-8 inline-flex justify-center rounded-full bg-[#f7a600] px-8 py-4 font-black text-white transition hover:bg-[#d98f00]"
            >
              it-learning-appを無料で始める
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
