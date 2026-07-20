import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/blog/it-passport-syllabus-6-5-study-guide-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const ipaSyllabusUrl = "https://www.ipa.go.jp/shiken/syllabus/gaiyou.html";
const ipaRangeUrl = "https://www3.jitec.ipa.go.jp/JitesCbt/html/about/range.html";

export const metadata: Metadata = {
  title: "ITパスポート シラバス6.5の変更点と勉強法｜2026年受験者向け",
  description:
    "ITパスポート試験シラバスVer.6.5の変更点と、2026年受験者が優先して確認すべき学習範囲を解説。最新版教材の見分け方、過去問との組み合わせ方、AIを使った復習方法まで整理します。",
  keywords: [
    "ITパスポート シラバス6.5",
    "ITパスポート 2026",
    "ITパスポート シラバス 変更",
    "ITパスポート 勉強法",
    "ITパスポート AI 学習",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポート シラバス6.5の変更点と勉強法",
    description:
      "2026年受験者向けに、最新版シラバスの確認ポイントと学習計画への反映方法を整理します。",
    type: "article",
    url: pageUrl,
    siteName: "ITパスポート学習コーチ",
    locale: "ja_JP",
    publishedTime: "2026-07-21",
    modifiedTime: "2026-07-21",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート シラバス6.5の変更点と勉強法",
    description: "最新版教材の確認方法と、2026年受験者が見直すべき学習ポイントを解説。",
  },
};

const priorities = [
  {
    title: "1. 教材がシラバス6.5対応か確認する",
    body: "表紙や出版社ページで対応版を確認します。古い教材を捨てる必要はありませんが、法令名や新しい用語は最新版資料で補完しましょう。",
  },
  {
    title: "2. 3分野を均等に捨てない",
    body: "本試験は総合評価だけでなく、ストラテジ・マネジメント・テクノロジの各分野にも基準があります。得意分野だけで押し切る計画は避けます。",
  },
  {
    title: "3. 変更点だけを丸暗記しない",
    body: "新旧の名称を覚えるだけでなく、どの業務や制度に関係する用語なのかまで説明できる状態を目指します。",
  },
  {
    title: "4. 過去問と確認問題を役割分担する",
    body: "過去問は出題形式と弱点発見に使い、最新版で追加・変更された項目は確認問題や教材で補います。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "ITパスポート シラバス6.5の変更点と勉強法｜2026年受験者向け",
  description:
    "ITパスポート試験シラバスVer.6.5の確認ポイントと、2026年受験者向けの学習方法を解説します。",
  datePublished: "2026-07-21",
  dateModified: "2026-07-21",
  author: { "@type": "Organization", name: "ITパスポート学習コーチ編集部" },
  publisher: { "@type": "Organization", name: "ITパスポート学習コーチ" },
  mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
  url: pageUrl,
};

export default function SyllabusGuidePage() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/blog" className="font-black text-[#12384d]">ITパスポート学習ガイド</Link>
          <Link href="/onboarding?source=syllabus-6-5-guide" className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white">無料で学習計画を作る</Link>
        </div>
      </header>

      <article>
        <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <p className="inline-flex rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-black text-[#1b75a6]">2026年版・最新シラバス解説</p>
            <h1 className="mt-5 text-4xl font-black leading-tight text-[#12384d] sm:text-6xl">ITパスポート シラバス6.5の変更点と勉強法</h1>
            <p className="mt-6 text-lg leading-9 text-slate-700">2026年に受験するなら、古い勉強法をすべて変える必要はありません。重要なのは、最新版の出題範囲を確認し、教材の不足部分だけを補いながら、理解・確認・復習・演習をつなげることです。</p>
            <div className="mt-7 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f7fbfe] p-4"><p className="font-black text-[#12384d]">SEOキーワード</p><p className="mt-2 leading-6 text-slate-600">ITパスポート シラバス6.5 / 2026 / 変更点</p></div>
              <div className="rounded-2xl bg-[#f7fbfe] p-4"><p className="font-black text-[#12384d]">想定読者</p><p className="mt-2 leading-6 text-slate-600">2026年受験予定で、手元の教材が古くないか不安な初心者</p></div>
              <div className="rounded-2xl bg-[#f7fbfe] p-4"><p className="font-black text-[#12384d]">訴求軸</p><p className="mt-2 leading-6 text-slate-600">変更点の暗記ではなく、最新版に合わせて学習計画を補正する</p></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="rounded-[24px] border border-[#cfe5f2] bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-black text-[#12384d]">まず確認：現在の公式シラバスはVer.6.5</h2>
            <p className="mt-4 leading-8 text-slate-700">IPAは2026年1月8日付でITパスポート試験シラバスVer.6.5を掲載しています。今回の更新では、法令名の変更として「下請法」を削除し、「中小受託取引適正化法」を追加したことが明記されています。</p>
            <p className="mt-4 leading-8 text-slate-700">試験は120分・100問の四肢択一式で、ストラテジ系、マネジメント系、テクノロジ系の3分野から出題されます。総合評価だけでなく、各分野の評価点にも基準があるため、変更点だけに集中しすぎないことが重要です。</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href={ipaSyllabusUrl} target="_blank" rel="noreferrer" className="inline-flex justify-center rounded-full border border-[#1b75a6] px-6 py-3 text-sm font-black text-[#1b75a6]">IPA公式シラバスを確認</a>
              <a href={ipaRangeUrl} target="_blank" rel="noreferrer" className="inline-flex justify-center rounded-full border border-[#1b75a6] px-6 py-3 text-sm font-black text-[#1b75a6]">試験内容・出題範囲を確認</a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl space-y-6 px-4 pb-12 sm:px-6">
          <h2 className="text-3xl font-black text-[#12384d]">2026年受験者が見直すべき4項目</h2>
          {priorities.map((item) => (
            <section key={item.title} className="rounded-[24px] border border-[#cfe5f2] bg-white p-6 shadow-[0_12px_30px_rgba(22,94,131,0.07)] sm:p-8">
              <h3 className="text-2xl font-black text-[#12384d]">{item.title}</h3>
              <p className="mt-4 leading-8 text-slate-700">{item.body}</p>
            </section>
          ))}
        </section>

        <section className="bg-white px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-black text-[#12384d]">最新版シラバスを学習計画へ反映する方法</h2>
            <ol className="mt-6 space-y-4 leading-8 text-slate-700">
              <li><span className="font-black text-[#1b75a6]">1.</span> 手元の教材の対応シラバスを確認する</li>
              <li><span className="font-black text-[#1b75a6]">2.</span> 未対応の用語・法令だけを補足リストにする</li>
              <li><span className="font-black text-[#1b75a6]">3.</span> 各章の確認問題で理解度を測る</li>
              <li><span className="font-black text-[#1b75a6]">4.</span> 間違えた範囲だけを翌日以降の復習に回す</li>
              <li><span className="font-black text-[#1b75a6]">5.</span> 過去問レベル演習で3分野の偏りを確認する</li>
            </ol>
            <div className="mt-8 rounded-[24px] bg-[#fff7df] p-6 sm:p-8">
              <h3 className="text-xl font-black text-[#7a5200]">AIを使う場合の注意点</h3>
              <p className="mt-3 leading-8 text-slate-700">生成AIは用語の比較や復習問題の作成に便利ですが、法令名や試験範囲などの最新情報は公式資料を基準にしてください。AIには「シラバス6.5を前提に」「出典が不明な場合は断定しない」と条件を付けると使いやすくなります。</p>
            </div>
          </div>
        </section>

        <section className="bg-[#12384d] px-4 py-12 text-white sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-black">シラバスの確認だけで終わらせず、今日の学習へ落とし込む</h2>
            <p className="mt-5 max-w-3xl leading-8 text-[#e6f6fc]">it-learning-appは、試験日と使える時間から学習計画を作り、確認問題・用語復習・過去問レベル演習を「今日やること」に整理します。最新版で補うべき範囲も、毎日の学習に組み込みやすくなります。</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/onboarding?source=syllabus-6-5-guide" className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 font-black text-white">無料で自分専用の学習計画を作る</Link>
              <Link href="/lp/it-passport-study-time-calculator" className="inline-flex justify-center rounded-full border border-white/50 px-7 py-4 font-black text-white">必要な勉強時間を計算する</Link>
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
