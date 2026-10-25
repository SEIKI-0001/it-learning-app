import type { Metadata } from "next";
import Link from "next/link";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/it-passport-study-coach";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;

export const metadata: Metadata = {
  title: "ITパスポートAI学習コーチ｜試験日から今日やることを無料で整理",
  description:
    "ITパスポートの独学で、何を・いつ・どこまで勉強すべきか迷う人へ。試験日と学習時間から計画を作り、確認問題・単語復習・進捗管理まで支えるAI学習コーチを紹介します。",
  keywords: [
    "ITパスポート 学習計画",
    "ITパスポート AI",
    "ITパスポート 勉強アプリ",
    "ITパスポート 独学",
    "ITパスポート 初心者",
    "ITパスポート 勉強法",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートAI学習コーチ｜独学の迷いを今日の学習に変える",
    description:
      "試験日から逆算した計画、今日やること、理解度確認、復習管理を一つにつなぐITパスポート学習支援アプリ。",
    type: "website",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポートAI学習コーチ",
    description:
      "独学で迷いやすい計画・理解度確認・復習を一つにつなげます。",
  },
};

const problems = [
  {
    title: "参考書を買ったが、毎日の進め方が決まらない",
    text: "試験日までの残り日数と使える時間を基準に、今日取り組む範囲を小さく具体化します。",
  },
  {
    title: "読んだだけで、理解できたか判断できない",
    text: "短い確認問題で理解度を確かめ、分かったつもりのまま先へ進むのを防ぎます。",
  },
  {
    title: "復習の優先順位が分からない",
    text: "単語、確認問題、過去問レベル演習の結果から、次に戻るべきテーマを整理します。",
  },
];

const steps = [
  {
    number: "01",
    title: "試験日と学習時間を入力",
    text: "平日・休日に使える時間と、現在の学習状況を登録します。",
  },
  {
    number: "02",
    title: "合格までの進め方を整理",
    text: "参考書、確認問題、単語復習、過去問レベル演習を試験日から逆算します。",
  },
  {
    number: "03",
    title: "今日やることだけに集中",
    text: "全体計画を見失わず、毎日は小さな学習メニューから始められます。",
  },
  {
    number: "04",
    title: "結果から計画を調整",
    text: "学習時間の自己申告ではなく、確認問題などの結果を中心に理解度を判断します。",
  },
];

const faq = [
  {
    question: "市販の参考書は不要ですか？",
    answer:
      "いいえ。it-learning-appは参考書を置き換えるのではなく、参考書を最後まで使い切るための計画・確認・復習を支援するサービスです。",
  },
  {
    question: "IT未経験でも使えますか？",
    answer:
      "IT未経験者が何から始めるか迷わないことを重視しています。最初から難しい過去問だけに進まず、理解、確認、復習、演習の順で進めます。",
  },
  {
    question: "毎日の細かな学習報告が必要ですか？",
    answer:
      "細かな入力を前提にしません。学習の実施状況は簡単に記録し、理解度は確認問題や演習結果を中心に判断する設計です。",
  },
  {
    question: "無料で試せますか？",
    answer:
      "オンボーディングから試験日や学習条件を入力し、学習計画の作成を始められます。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "it-learning-app",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description:
        "ITパスポート受験者向けに、試験日から逆算した学習計画、確認問題、単語復習、進捗管理を提供する学習支援アプリ。",
      url: pageUrl,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "JPY",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ],
};

export default function ItPassportStudyCoachPage() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1b75a6] text-sm font-black text-white">
              IP
            </span>
            <span className="font-black text-[#12384d]">it-learning-app</span>
          </Link>
          <Link
            href="/onboarding"
            className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white transition hover:bg-[#d98f00]"
          >
            無料で計画を作る
          </Link>
        </div>
      </header>

      <section className="overflow-hidden bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-[#e8f5fb] px-4 py-2 text-sm font-black text-[#1b75a6]">
              ITパスポート独学者向け AI学習コーチ
            </p>
            <h1 className="mt-6 text-[38px] font-black leading-[1.13] text-[#12384d] sm:text-6xl">
              「何を勉強する？」を考える時間を、合格に近づく学習時間へ。
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
              it-learning-appは、試験日から逆算した計画、今日やること、確認問題、単語復習、過去問レベル演習を一つにつなぐITパスポート学習支援アプリです。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/onboarding"
                className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 text-base font-black text-white transition hover:bg-[#d98f00]"
              >
                無料で自分専用の学習計画を作る
              </Link>
              <Link
                href="/lp/it-passport-study-time-calculator"
                className="inline-flex justify-center rounded-full border-2 border-[#1b75a6] px-7 py-4 text-base font-black text-[#1b75a6] transition hover:bg-[#e8f5fb]"
              >
                必要な勉強時間を計算する
              </Link>
            </div>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              参考書や過去問と組み合わせて使う学習管理サービスです。
            </p>
          </div>

          <aside className="rounded-[28px] bg-[#12384d] p-6 text-white shadow-[0_24px_64px_rgba(18,56,77,0.25)] sm:p-8">
            <p className="text-sm font-black text-[#8dd7f3]">今日の学習メニュー例</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[18px] bg-white/10 p-5">
                <p className="text-xs font-bold text-[#bdeafb]">理解する・15分</p>
                <p className="mt-2 text-lg font-black">経営戦略の基本用語を1テーマ読む</p>
              </div>
              <div className="rounded-[18px] bg-white/10 p-5">
                <p className="text-xs font-bold text-[#bdeafb]">確認する・5分</p>
                <p className="mt-2 text-lg font-black">確認問題4問で理解度をチェック</p>
              </div>
              <div className="rounded-[18px] bg-white/10 p-5">
                <p className="text-xs font-bold text-[#bdeafb]">定着させる・5分</p>
                <p className="mt-2 text-lg font-black">復習対象の用語をフラッシュカードで確認</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-[#d9f2fb]">
              その日の実施量だけでなく、確認結果を使って次の学習を調整します。
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-black text-[#1b75a6]">独学が止まる本当の理由</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#12384d] sm:text-5xl">
            教材不足より、学習の判断を毎日自分で行う負担が大きい。
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-700">
            参考書、動画、過去問サイトが揃っていても、今日の優先順位、復習のタイミング、次へ進んでよいかを毎回判断する必要があります。it-learning-appは、その判断を学習フローとして整理します。
          </p>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {problems.map((problem) => (
            <article
              key={problem.title}
              className="rounded-[22px] border border-[#cfe5f2] bg-white p-6 shadow-[0_14px_34px_rgba(22,94,131,0.08)]"
            >
              <h3 className="text-xl font-black leading-snug text-[#12384d]">
                {problem.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-700">
                {problem.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#12384d] px-4 py-14 text-white sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-sm font-black text-[#8dd7f3]">合格までの使い方</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-5xl">
            計画を立てて終わらず、学習結果から次の一手を決める。
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {steps.map((step) => (
              <article key={step.number} className="rounded-[22px] bg-white/10 p-6">
                <p className="text-3xl font-black text-[#8dd7f3]">{step.number}</p>
                <h3 className="mt-4 text-xl font-black">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#d9f2fb]">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div>
            <p className="text-sm font-black text-[#1b75a6]">向いている人</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#12384d] sm:text-5xl">
              IT未経験でも、独学の進め方を自分で設計したくない人へ。
            </h2>
            <ul className="mt-8 space-y-4 text-base leading-8 text-slate-700">
              {[
                "試験日までに何を終えればよいか分からない",
                "参考書を読むだけで理解できたか不安になる",
                "学習が遅れたとき、計画を立て直せず止まってしまう",
                "過去問を解いても、次に何を復習すべきか分からない",
                "毎日の入力や細かな進捗報告は続けられない",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8f5fb] text-sm font-black text-[#1b75a6]">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <aside className="rounded-[24px] border border-[#f4d17b] bg-[#fff9e9] p-6 sm:p-8">
            <p className="text-sm font-black text-[#9a6400]">最初に必要な入力</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
              <li>・受験予定日</li>
              <li>・学習開始日</li>
              <li>・平日と休日に使える時間</li>
              <li>・使用する参考書</li>
              <li>・現在の学習状況</li>
            </ul>
            <Link
              href="/onboarding"
              className="mt-7 inline-flex w-full justify-center rounded-full bg-[#f7a600] px-6 py-4 text-sm font-black text-white transition hover:bg-[#d98f00]"
            >
              条件を入力して無料で始める
            </Link>
          </aside>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-4xl">
          <p className="text-sm font-black text-[#1b75a6]">よくある質問</p>
          <h2 className="mt-3 text-3xl font-black text-[#12384d] sm:text-5xl">
            始める前に確認したいこと
          </h2>
          <div className="mt-8 space-y-4">
            {faq.map((item) => (
              <details
                key={item.question}
                className="group rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5"
              >
                <summary className="cursor-pointer list-none font-black text-[#12384d]">
                  {item.question}
                </summary>
                <p className="mt-4 text-sm leading-7 text-slate-700">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-5xl rounded-[30px] bg-[#1b75a6] px-6 py-10 text-center text-white shadow-[0_24px_60px_rgba(27,117,166,0.24)] sm:px-10 sm:py-14">
          <p className="text-sm font-black text-[#cbeefa]">無料で学習計画を作成</p>
          <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            今日やることが決まれば、独学は始めやすくなる。
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#e9f8fd]">
            試験日と使える時間を入力して、参考書・確認問題・復習・演習をつないだ学習計画を作りましょう。
          </p>
          <Link
            href="/onboarding"
            className="mt-8 inline-flex justify-center rounded-full bg-[#f7a600] px-8 py-4 text-base font-black text-white transition hover:bg-[#d98f00]"
          >
            it-learning-appを無料で試す
          </Link>
        </div>
      </section>
    </main>
  );
}
