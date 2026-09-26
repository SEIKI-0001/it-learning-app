import type { Metadata } from "next";
import Link from "next/link";
import PassReadinessCheck from "./PassReadinessCheck";

const pageUrl =
  "https://it-learning-app.vercel.app/lp/it-passport-pass-readiness-check";

export const metadata: Metadata = {
  title: "【無料診断】ITパスポートに合格できる？10項目の合格準備度チェック",
  description:
    "ITパスポート試験に合格できそうかを10項目で無料診断。学習計画、確認問題、用語復習、過去問、苦手分野の把握状況を確認し、次に優先すべき勉強を整理します。",
  keywords: [
    "ITパスポート 合格できるか",
    "ITパスポート 合格診断",
    "ITパスポート 勉強不足",
    "ITパスポート 独学",
    "ITパスポート 学習計画",
    "ITパスポート AI",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートに合格できる？10項目の無料準備度チェック",
    description:
      "計画・理解・復習・演習の準備状況を確認し、次に優先すべき学習を無料で整理します。",
    type: "website",
    url: pageUrl,
    siteName: "ITパスポート学習コーチ",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポートに合格できる？無料準備度チェック",
    description:
      "10項目を選ぶだけで、現在の準備状況と次に優先すべき学習を確認できます。",
  },
};

const diagnosisPoints = [
  {
    title: "学習計画",
    description: "試験日から逆算し、今日やる内容まで具体化できているか",
  },
  {
    title: "理解度",
    description: "参考書を読んだだけでなく、確認問題で理解を確かめているか",
  },
  {
    title: "復習",
    description: "用語や誤答を、忘れる前に繰り返し確認できているか",
  },
  {
    title: "実践力",
    description: "過去問レベルの問題で、知識を使える状態になっているか",
  },
];

const faqItems = [
  {
    question: "この診断だけで合否を判断できますか？",
    answer:
      "いいえ。この診断は合否を保証するものではなく、独学で抜けやすい学習行動を確認するためのチェックです。過去問の正答率や分野別の理解度と合わせて利用してください。",
  },
  {
    question: "チェックが少ない場合は、最初からやり直す必要がありますか？",
    answer:
      "全範囲を最初からやり直す必要はありません。チェックが付かなかった項目を優先し、計画、確認問題、復習、過去問演習の順番を整えるほうが効率的です。",
  },
  {
    question: "it-learning-appでは何を支援しますか？",
    answer:
      "試験日と確保できる時間から学習計画を作り、今日やる内容、確認問題、単語復習、進捗の見直しを一つの流れにまとめます。",
  },
];

export default function PassReadinessCheckPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "ITパスポート合格準備度チェック",
      description:
        "ITパスポート試験に向けた学習計画、理解度、復習、演習の準備状況を10項目で確認する無料診断です。",
      url: pageUrl,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "JPY",
      },
      provider: {
        "@type": "Organization",
        name: "it-learning-app",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/blog" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b75a6] text-sm font-black text-white">
              IP
            </span>
            <span className="text-sm font-black text-[#12384d] sm:text-base">
              ITパスポート学習ガイド
            </span>
          </Link>
          <Link
            href="/onboarding?source=pass-readiness-header"
            className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white"
          >
            無料で計画を作る
          </Link>
        </div>
      </header>

      <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-9 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-[#fff2cc] px-3 py-1 text-xs font-black text-[#9a6400]">
              無料・1分・登録不要
            </p>
            <h1 className="mt-5 max-w-4xl text-[38px] font-black leading-[1.15] text-[#12384d] sm:text-6xl">
              ITパスポートに合格できる？
              <br />
              10項目で準備度をチェック
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
              過去問の点数だけでは、学習の抜け漏れは分かりません。計画・理解・復習・演習の4つを確認し、今のあなたが次に優先すべき勉強を整理します。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#diagnosis"
                className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 font-black text-white transition hover:bg-[#d98f00]"
              >
                無料診断を始める
              </a>
              <Link
                href="/lp/it-passport-study-time-calculator"
                className="inline-flex justify-center rounded-full border border-[#1b75a6] px-7 py-4 font-black text-[#1b75a6] transition hover:bg-[#e8f5fb]"
              >
                勉強時間を先に計算する
              </Link>
            </div>
          </div>

          <aside className="rounded-[24px] bg-[#12384d] p-6 text-white sm:p-8">
            <p className="text-sm font-black text-[#ffd36b]">この診断で分かること</p>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-[#e6f6fc]">
              <li>・今の学習で不足している行動</li>
              <li>・全範囲をやり直す必要があるか</li>
              <li>・試験日までに優先すべき復習</li>
              <li>・学習計画を見直すタイミング</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {diagnosisPoints.map((point, index) => (
            <article
              key={point.title}
              className="rounded-[20px] border border-[#cfe5f2] bg-white p-5"
            >
              <p className="text-sm font-black text-[#1b75a6]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-2 text-xl font-black text-[#12384d]">
                {point.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {point.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="diagnosis" className="mx-auto w-full max-w-4xl scroll-mt-6 px-4 pb-12 sm:px-6 sm:pb-16">
        <PassReadinessCheck />
      </section>

      <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-sm font-black text-[#1b75a6]">訴求軸</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#12384d] sm:text-4xl">
              合格に近づくのは、教材を増やした人ではなく、学習の抜けを埋めた人
            </h2>
            <p className="mt-5 leading-8 text-slate-700">
              参考書、単語帳、過去問を持っていても、今日何をするか、いつ復習するか、どこで次へ進むかが曖昧だと学習は止まりやすくなります。it-learning-appは、教材を置き換えるのではなく、学習計画・確認問題・復習・過去問レベル演習を一つにつなぐための学習支援アプリです。
            </p>
            <div className="mt-7 rounded-[22px] border-2 border-[#f7a600] bg-[#fffaf0] p-6">
              <h3 className="text-2xl font-black text-[#12384d]">
                診断結果を、今日の学習メニューに変える
              </h3>
              <p className="mt-4 leading-8 text-slate-700">
                試験日、平日・休日に使える時間、現在の理解度を入力すると、まず何を進めるべきかを整理できます。予定どおりに進まなかった日も、結果を見て計画を調整します。
              </p>
              <Link
                href="/onboarding?source=pass-readiness-bottom"
                className="mt-6 inline-flex w-full justify-center rounded-full bg-[#f7a600] px-7 py-4 font-black text-white transition hover:bg-[#d98f00] sm:w-auto"
              >
                無料で自分専用の学習計画を作る
              </Link>
            </div>
          </div>

          <aside className="rounded-[24px] border border-[#cfe5f2] bg-[#f7fbfe] p-6 sm:p-8">
            <p className="text-lg font-black text-[#12384d]">SEO設計</p>
            <dl className="mt-5 space-y-5 text-sm leading-7">
              <div>
                <dt className="font-black text-[#1b75a6]">主要キーワード</dt>
                <dd className="mt-1 text-slate-700">ITパスポート 合格できるか／合格診断</dd>
              </div>
              <div>
                <dt className="font-black text-[#1b75a6]">想定読者</dt>
                <dd className="mt-1 text-slate-700">独学中で、試験までに何を改善すべきか不安な初心者</dd>
              </div>
              <div>
                <dt className="font-black text-[#1b75a6]">CTA</dt>
                <dd className="mt-1 text-slate-700">診断結果を使って、無料の個別学習計画を作成する</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="text-3xl font-black text-[#12384d]">よくある質問</h2>
        <div className="mt-6 space-y-4">
          {faqItems.map((item) => (
            <details
              key={item.question}
              className="rounded-[18px] border border-[#cfe5f2] bg-white p-5"
            >
              <summary className="cursor-pointer font-black text-[#12384d]">
                {item.question}
              </summary>
              <p className="mt-4 leading-8 text-slate-700">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
