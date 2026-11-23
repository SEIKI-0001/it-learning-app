import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-study-habit-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;

export const metadata: Metadata = {
  title: "ITパスポートの勉強が続かない人へ｜3日坊主を防ぐ学習設計【2026年版】",
  description:
    "ITパスポートの勉強が続かない原因と対策を初心者向けに解説。毎日の負担を減らし、確認問題・単語復習・過去問を無理なく続ける学習設計を紹介します。",
  keywords: [
    "ITパスポート 勉強 続かない",
    "ITパスポート 挫折",
    "ITパスポート 勉強 習慣",
    "ITパスポート 独学",
    "ITパスポート 学習計画",
    "ITパスポート AI",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートの勉強が続かない人へ｜3日坊主を防ぐ学習設計",
    description:
      "続かない原因を意志の弱さではなく学習設計から見直し、今日やることを小さくする方法を解説します。",
    type: "article",
    url: pageUrl,
    siteName: "ITパスポート学習コーチ",
    locale: "ja_JP",
    publishedTime: "2026-07-28",
    modifiedTime: "2026-07-28",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポートの勉強が続かない人へ",
    description: "3日坊主を防ぐための学習量、復習、進捗管理の設計を初心者向けに解説。",
  },
};

const causes = [
  {
    title: "毎日の学習量が大きすぎる",
    body: "最初から1時間以上を前提にすると、残業や予定が入った日に計画が崩れます。平日は10〜20分でも完了できる単位に分け、休日に演習量を確保する方が継続しやすくなります。",
  },
  {
    title: "今日やることが決まっていない",
    body: "勉強を始めるたびに教材や範囲を選ぶと、開始前に判断疲れが起きます。前日までに『参考書4ページ』『確認問題3問』のように行動単位まで決めておきます。",
  },
  {
    title: "読むだけで達成感がない",
    body: "インプットだけでは理解できた実感を得にくいため、各トピックの直後に確認問題を入れます。正答数ではなく、説明できなかった箇所を次の復習対象にします。",
  },
  {
    title: "遅れを取り戻そうとして負荷が増える",
    body: "できなかった分を翌日に全て上乗せすると、計画がさらに重くなります。未実施分は捨てるのではなく、試験日までの残日数と理解度を見て再配置します。",
  },
];

const sevenDayPlan = [
  ["1日目", "確認問題を10問だけ解き、現在地を把握する"],
  ["2日目", "最も弱かった分野を参考書で15分読む"],
  ["3日目", "前日の範囲から確認問題を3〜5問解く"],
  ["4日目", "重要用語を10個だけ復習する"],
  ["5日目", "次に弱い分野を15分学ぶ"],
  ["6日目", "過去問レベルの問題を20〜30分解く"],
  ["7日目", "誤答だけを見直し、翌週の重点分野を決める"],
];

const faq = [
  {
    question: "毎日勉強できなくても合格を目指せますか？",
    answer:
      "毎日同じ時間を確保する必要はありません。平日は短い確認・復習、休日は過去問レベル演習というように役割を分け、未実施分を理解度に応じて再配置する方が現実的です。",
  },
  {
    question: "モチベーションがない日は何をすればよいですか？",
    answer:
      "新しい範囲を進めず、単語5個、確認問題1問、誤答1件の見直しなど、5分以内に終わる復習へ切り替えます。学習をゼロにしないことを優先します。",
  },
  {
    question: "参考書を途中で変えた方がよいですか？",
    answer:
      "難易度が明らかに合わない場合を除き、教材を増やす前に学習量と順番を見直します。複数教材を並行すると、進捗と復習対象が分散しやすくなります。",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "ITパスポートの勉強が続かない人へ｜3日坊主を防ぐ学習設計【2026年版】",
    description:
      "ITパスポート学習が続かない原因と、無理なく継続するための学習量・復習・進捗管理を解説します。",
    datePublished: "2026-07-28",
    dateModified: "2026-07-28",
    author: { "@type": "Organization", name: "ITパスポート学習コーチ編集部" },
    publisher: { "@type": "Organization", name: "ITパスポート学習コーチ" },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    url: pageUrl,
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

export default function ItPassportStudyHabitGuidePage() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/blog" className="font-black text-[#12384d]">ITパスポート学習ガイド</Link>
          <Link
            href="/onboarding?source=study-habit-guide-2026&position=header"
            className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white transition hover:bg-[#d98f00]"
          >
            無料で計画を作る
          </Link>
        </div>
      </header>

      <article>
        <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <p className="inline-flex rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-black text-[#1b75a6]">
              2026年版・独学が続かない初心者向け
            </p>
            <h1 className="mt-5 text-4xl font-black leading-tight text-[#12384d] sm:text-6xl">
              ITパスポートの勉強が続かない人へ
            </h1>
            <p className="mt-6 text-lg leading-9 text-slate-700">
              3日坊主の原因は、意志の弱さよりも「毎日の負荷」「今日やること」「復習の順番」が曖昧なことです。続けられる最小単位に学習を分け、結果に応じて計画を調整しましょう。
            </p>

            <div className="mt-7 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f7fbfe] p-4">
                <p className="font-black text-[#12384d]">SEOキーワード</p>
                <p className="mt-2 leading-6 text-slate-600">ITパスポート 勉強 続かない / 挫折 / 学習習慣</p>
              </div>
              <div className="rounded-2xl bg-[#f7fbfe] p-4">
                <p className="font-black text-[#12384d]">想定読者</p>
                <p className="mt-2 leading-6 text-slate-600">参考書を買ったが、数日で止まってしまった独学初心者</p>
              </div>
              <div className="rounded-2xl bg-[#f7fbfe] p-4">
                <p className="font-black text-[#12384d]">訴求軸</p>
                <p className="mt-2 leading-6 text-slate-600">気合ではなく、学習量・確認・復習の設計で継続する</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/onboarding?source=study-habit-guide-2026&position=hero"
                className="inline-flex justify-center rounded-full bg-[#f7a600] px-6 py-3 text-sm font-black text-white transition hover:bg-[#d98f00]"
              >
                今日から続く無料計画を作る
              </Link>
              <Link
                href="/lp/it-passport-study-time-calculator"
                className="inline-flex justify-center rounded-full border border-[#1b75a6] px-6 py-3 text-sm font-black text-[#1b75a6] transition hover:bg-[#e8f5fb]"
              >
                勉強時間を計算する
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-[24px] border border-[#f0d99b] bg-[#fff8e5] p-6 sm:p-8">
            <h2 className="text-2xl font-black text-[#7a5200]">最初に変えるべきこと</h2>
            <p className="mt-4 leading-8 text-slate-700">
              「毎日1時間」ではなく、「疲れていても終えられる最小メニュー」を先に決めます。学習できた時間を細かく記録するより、確認問題で理解できたかを見て次の内容を調整する方が、計画の修正に使えます。
            </p>
          </div>
        </section>

        <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-black text-[#12384d]">勉強が続かない4つの原因</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {causes.map((item, index) => (
                <section key={item.title} className="rounded-[22px] border border-[#cfe5f2] bg-[#f7fbfe] p-6">
                  <p className="text-sm font-black text-[#1b75a6]">原因 {index + 1}</p>
                  <h3 className="mt-2 text-xl font-black text-[#12384d]">{item.title}</h3>
                  <p className="mt-4 leading-8 text-slate-700">{item.body}</p>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-3xl font-black text-[#12384d]">再開するための7日間プラン</h2>
          <p className="mt-4 leading-8 text-slate-700">
            最初の1週間は、全範囲を進めることより「学習→確認→復習」の流れを作ることを優先します。
          </p>
          <div className="mt-8 overflow-hidden rounded-[22px] border border-[#cfe5f2] bg-white">
            {sevenDayPlan.map(([day, action], index) => (
              <div key={day} className={`grid gap-2 px-5 py-4 sm:grid-cols-[90px_1fr] ${index > 0 ? "border-t border-[#e1eef5]" : ""}`}>
                <p className="font-black text-[#1b75a6]">{day}</p>
                <p className="leading-7 text-slate-700">{action}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#12384d] px-4 py-12 text-white sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-black text-[#8dd8f3]">it-learning-appでできること</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">毎日考える負担を減らし、結果から次を決める</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                "試験日から逆算した学習計画",
                "今日やる内容の提示",
                "確認問題による理解度チェック",
                "単語帳の反復復習",
                "過去問レベル演習の進捗管理",
                "遅れや苦手分野に応じた計画調整",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white/10 p-4 font-bold">✓ {item}</div>
              ))}
            </div>
            <p className="mt-8 leading-8 text-[#e6f6fc]">
              教材を増やすのではなく、参考書・確認問題・単語復習・過去問を一つの流れにします。細かな学習時間の入力ではなく、理解度を使って次の行動を決めます。
            </p>
            <Link
              href="/onboarding?source=study-habit-guide-2026&position=mid"
              className="mt-8 inline-flex rounded-full bg-[#f7a600] px-7 py-4 text-sm font-black text-white transition hover:bg-[#d98f00]"
            >
              無料で自分専用の学習計画を作る
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-3xl font-black text-[#12384d]">よくある質問</h2>
          <div className="mt-8 space-y-4">
            {faq.map((item) => (
              <section key={item.question} className="rounded-[20px] border border-[#cfe5f2] bg-white p-6">
                <h3 className="text-lg font-black text-[#12384d]">{item.question}</h3>
                <p className="mt-3 leading-8 text-slate-700">{item.answer}</p>
              </section>
            ))}
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 sm:py-18">
          <div className="mx-auto max-w-4xl rounded-[28px] bg-[#e8f5fb] p-7 text-center sm:p-10">
            <h2 className="text-3xl font-black text-[#12384d]">今日の5分から、学習を再開する</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-700">
              試験日と使える時間を入力すると、今日やる内容を小さな単位で整理できます。止まった分を無理に取り戻すのではなく、現在の理解度から再設計します。
            </p>
            <Link
              href="/onboarding?source=study-habit-guide-2026&position=final"
              className="mt-7 inline-flex rounded-full bg-[#f7a600] px-8 py-4 text-sm font-black text-white transition hover:bg-[#d98f00]"
            >
              it-learning-appを無料で始める
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
