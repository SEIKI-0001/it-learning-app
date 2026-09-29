import type { Metadata } from "next";
import Link from "next/link";
import StudyTimeCalculator from "./StudyTimeCalculator";

const title = "ITパスポート勉強時間シミュレーター｜試験日から無料で学習計画を計算";
const description =
  "ITパスポート合格までに必要な勉強時間を無料でシミュレーション。試験日、平日・休日の学習時間、現在の理解度から、1日あたりの目安と学習計画を確認できます。";
const canonical =
  "https://it-learning-app.vercel.app/lp/it-passport-study-time-calculator";

export const metadata: Metadata = {
  title: `${title} | ITパスポート学習コーチ`,
  description,
  alternates: { canonical },
  keywords: [
    "ITパスポート 勉強時間",
    "ITパスポート 学習計画",
    "ITパスポート 何日",
    "ITパスポート 独学",
    "ITパスポート AI",
    "ITパスポート 無料",
  ],
  openGraph: {
    title,
    description,
    type: "website",
    url: canonical,
    siteName: "ITパスポート学習コーチ",
    locale: "ja_JP",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: title,
  description,
  url: canonical,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "JPY",
  },
};

const steps = [
  {
    title: "試験日から逆算する",
    body: "残り日数を先に決めると、参考書・確認問題・復習・過去問演習をいつ行うか整理できます。",
  },
  {
    title: "使える時間で現実的に計算する",
    body: "理想ではなく、平日と休日に実際に確保できる時間を入力し、無理のない計画を作ります。",
  },
  {
    title: "理解度で学習量を調整する",
    body: "IT未経験者と過去問演習中の人では必要な学習量が異なるため、現在地に合わせて目安を変えます。",
  },
];

const faq = [
  {
    q: "ITパスポートの勉強時間は何時間必要ですか？",
    a: "必要時間はIT知識や教材によって異なります。このページでは、初心者は約100時間、学習開始済みは約70時間、問題演習開始済みは約40時間を目安として計算します。",
  },
  {
    q: "30日でも合格を目指せますか？",
    a: "毎日確保できる時間と現在の理解度次第です。短期間の場合は、頻出分野の理解、確認問題、過去問レベル演習を優先し、復習対象を絞る必要があります。",
  },
  {
    q: "計算結果はそのまま学習計画になりますか？",
    a: "結果は全体量の目安です。it-learning-appでは、試験日と学習時間をもとに、今日やる内容まで具体化できます。",
  },
];

export default function ItPassportStudyTimeCalculatorPage() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/blog" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b75a6] text-sm font-black text-white">IP</span>
            <span className="text-sm font-black text-[#12384d] sm:text-base">ITパスポート学習ガイド</span>
          </Link>
          <Link href="/onboarding" className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white transition hover:bg-[#d98f00]">無料で学習計画を作る</Link>
        </div>
      </header>

      <section className="bg-white px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto w-full max-w-6xl">
          <p className="inline-flex rounded-full bg-[#fff2cc] px-3 py-1 text-xs font-black text-[#9a6400]">無料ツール型LP</p>
          <h1 className="mt-5 max-w-5xl text-[34px] font-black leading-[1.16] text-[#12384d] sm:text-6xl">ITパスポート合格まで、あと何時間必要？</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">試験日、平日・休日に使える時間、現在の学習状況を入力すると、確保できる総学習時間と1日あたりの目安を無料で計算できます。</p>
          <p className="mt-4 text-xs font-bold text-slate-500">SEOキーワード：ITパスポート 勉強時間 / ITパスポート 学習計画 / ITパスポート 何日 / ITパスポート 独学</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <StudyTimeCalculator />
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="rounded-[26px] border border-[#cfe5f2] bg-white p-6 shadow-[0_14px_34px_rgba(22,94,131,0.08)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <p className="text-sm font-black text-[#1b75a6]">想定読者</p>
              <h2 className="mt-3 text-3xl font-black text-[#12384d]">勉強を始めたいが、必要な量が見えない人へ</h2>
              <p className="mt-4 text-sm leading-8 text-slate-700 sm:text-base">IT未経験で受験を検討している人、参考書を買ったものの試験日までの進め方が分からない人、忙しい中で独学できるか判断したい社会人を想定しています。</p>
            </div>
            <aside className="rounded-[20px] bg-[#f7fbfe] p-5">
              <p className="text-sm font-black text-[#12384d]">訴求軸</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">単なる「必要時間の目安」で終わらせず、入力条件をそのまま毎日の学習計画へつなげること。計画・理解度確認・復習を一体化するit-learning-appの価値を訴求します。</p>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-3">
        {steps.map((step, index) => (
          <article key={step.title} className="rounded-[22px] border border-[#cfe5f2] bg-white p-6 shadow-[0_12px_28px_rgba(22,94,131,0.08)]">
            <span className="text-3xl font-black text-[#1b75a6]">{String(index + 1).padStart(2, "0")}</span>
            <h2 className="mt-4 text-2xl font-black text-[#12384d]">{step.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">{step.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-[26px] bg-[#12384d] p-6 text-white sm:p-10">
          <p className="text-sm font-black text-[#9edbf2]">計算の次は、実行できる計画へ</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">総学習時間だけでは、今日何をやるかは決まりません。</h2>
          <p className="mt-5 max-w-3xl text-sm leading-8 text-[#e6f6fc] sm:text-base">it-learning-appは、試験日と使える時間から学習順を整理し、確認問題の結果を見ながら復習や次のテーマを調整します。計画を作って終わりではなく、毎日の行動につなげます。</p>
          <Link href="/onboarding" className="mt-7 inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 text-sm font-black text-white transition hover:bg-[#d98f00]">無料で自分専用の学習計画を作る</Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <h2 className="text-3xl font-black text-[#12384d]">よくある質問</h2>
        <div className="mt-6 grid gap-4">
          {faq.map((item) => (
            <article key={item.q} className="rounded-[20px] border border-[#cfe5f2] bg-white p-6">
              <h3 className="text-lg font-black text-[#12384d]">{item.q}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#cfe5f2] bg-white px-4 py-8 text-center text-xs text-slate-500 sm:px-6">
        <p>タイトル案：{title}</p>
        <p className="mt-2">メタディスクリプション：{description}</p>
      </footer>
    </main>
  );
}
