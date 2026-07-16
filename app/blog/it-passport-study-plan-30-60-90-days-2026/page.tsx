import type { Metadata } from "next";
import Link from "next/link";

const pageUrl = "https://it-learning-app.vercel.app/blog/it-passport-study-plan-30-60-90-days-2026";

export const metadata: Metadata = {
  title: "【2026年版】ITパスポート勉強計画｜30日・60日・90日の期間別ロードマップ",
  description:
    "ITパスポート試験まで30日・60日・90日の勉強計画を期間別に紹介。参考書、確認問題、単語復習、過去問をどう組み合わせるか、初心者向けに具体的な順番を解説します。",
  keywords: [
    "ITパスポート 勉強計画",
    "ITパスポート 30日",
    "ITパスポート 60日",
    "ITパスポート 90日",
    "ITパスポート 独学",
    "ITパスポート AI",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポート勉強計画｜30日・60日・90日の期間別ロードマップ",
    description:
      "試験までの残り期間に合わせて、理解・確認・復習・過去問の配分を整理します。",
    type: "article",
    url: pageUrl,
    siteName: "ITパスポート学習コーチ",
    locale: "ja_JP",
    publishedTime: "2026-07-17",
    modifiedTime: "2026-07-17",
  },
};

const plans = [
  {
    period: "90日プラン",
    fit: "IT未経験で、平日30〜60分ほど確保できる人",
    phases: [
      "1〜30日：参考書で全体像をつかみ、各章の確認問題を解く",
      "31〜60日：単語復習を続けながら、苦手テーマを学び直す",
      "61〜80日：過去問レベルの問題を分野別に解く",
      "81〜90日：誤答と苦手分野だけに絞って仕上げる",
    ],
    point: "理解に時間を使えるため、IT未経験者に最も安定した進め方です。",
  },
  {
    period: "60日プラン",
    fit: "基礎知識が少しある人、短期間でも毎日学習できる人",
    phases: [
      "1〜20日：参考書を速めに1周し、章ごとに確認問題を解く",
      "21〜40日：単語復習と分野別演習を並行する",
      "41〜52日：過去問レベルの問題で弱点を洗い出す",
      "53〜60日：誤答の原因を分類し、重点復習する",
    ],
    point: "読むだけで終わらず、早い段階から確認問題を入れることが重要です。",
  },
  {
    period: "30日プラン",
    fit: "試験日が近く、毎日60分以上を確保しやすい人",
    phases: [
      "1〜7日：全範囲を速く確認し、知らないテーマを把握する",
      "8〜18日：頻出テーマと苦手分野を優先して学ぶ",
      "19〜26日：過去問レベル演習と誤答復習を繰り返す",
      "27〜30日：新しい教材に手を出さず、間違えた内容だけを確認する",
    ],
    point: "全範囲を均等に勉強せず、現在地の確認と優先順位付けが必要です。",
  },
];

const mistakes = [
  "参考書を読み切ること自体が目的になる",
  "過去問の正答率だけを見て、間違えた理由を確認しない",
  "予定が遅れた日に計画を修正せず、そのまま止まる",
  "単語・確認問題・過去問を別々に管理して負担が増える",
];

export default function StudyPlanArticlePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "ITパスポート勉強計画｜30日・60日・90日の期間別ロードマップ",
    description:
      "ITパスポート試験まで30日・60日・90日の勉強計画を、初心者向けに期間別で解説します。",
    datePublished: "2026-07-17",
    dateModified: "2026-07-17",
    author: { "@type": "Organization", name: "ITパスポート学習コーチ編集部" },
    publisher: { "@type": "Organization", name: "ITパスポート学習コーチ" },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    url: pageUrl,
  };

  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/blog" className="font-black text-[#12384d]">ITパスポート学習ガイド</Link>
          <Link href="/onboarding" className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white">無料で計画を作る</Link>
        </div>
      </header>

      <article>
        <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <p className="inline-flex rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-black text-[#1b75a6]">期間別・勉強計画まとめ</p>
            <h1 className="mt-5 text-4xl font-black leading-tight text-[#12384d] sm:text-6xl">
              ITパスポート勉強計画<br />30日・60日・90日のロードマップ
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-700 sm:text-lg">
              ITパスポートの勉強は、残り期間によって重点を変える必要があります。参考書、確認問題、単語復習、過去問をどの順番で進めるかを、30日・60日・90日の3パターンで整理します。
            </p>
            <dl className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f7fbfe] p-4"><dt className="text-sm font-black text-[#12384d]">SEOキーワード</dt><dd className="mt-2 text-sm leading-6">ITパスポート 勉強計画／30日／60日／90日</dd></div>
              <div className="rounded-2xl bg-[#f7fbfe] p-4"><dt className="text-sm font-black text-[#12384d]">想定読者</dt><dd className="mt-2 text-sm leading-6">試験日を決めたが、毎日の配分が分からない初心者</dd></div>
              <div className="rounded-2xl bg-[#f7fbfe] p-4"><dt className="text-sm font-black text-[#12384d]">訴求軸</dt><dd className="mt-2 text-sm leading-6">残り日数ではなく、理解度に合わせて計画を調整する</dd></div>
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="rounded-[24px] border border-[#cfe5f2] bg-white p-6 sm:p-8">
            <h2 className="text-3xl font-black text-[#12384d]">最初に決めるのは「教材」ではなく、学習の順番</h2>
            <p className="mt-5 leading-8 text-slate-700">
              教材を増やしても、今日やることが決まっていなければ学習は進みません。基本は「理解する → 確認する → 覚える → 過去問で試す → 間違いを戻す」の順番です。残り期間が短いほど、全範囲を均等に進めるのではなく、苦手分野へ時間を寄せます。
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {plans.map((plan) => (
              <section key={plan.period} className="rounded-[24px] border border-[#cfe5f2] bg-white p-6 shadow-[0_12px_28px_rgba(22,94,131,0.07)] sm:p-8">
                <h2 className="text-3xl font-black text-[#12384d]">{plan.period}</h2>
                <p className="mt-3 rounded-xl bg-[#e8f5fb] px-4 py-3 text-sm font-bold text-[#155f87]">向いている人：{plan.fit}</p>
                <ol className="mt-6 space-y-3">
                  {plan.phases.map((phase) => (
                    <li key={phase} className="flex gap-3 leading-7 text-slate-700"><span className="mt-1 font-black text-[#1b75a6]">●</span><span>{phase}</span></li>
                  ))}
                </ol>
                <p className="mt-6 border-l-4 border-[#f7a600] pl-4 font-bold leading-7 text-[#12384d]">ポイント：{plan.point}</p>
              </section>
            ))}
          </div>

          <section className="mt-8 rounded-[24px] bg-[#12384d] p-6 text-white sm:p-8">
            <h2 className="text-3xl font-black">計画が崩れる4つの原因</h2>
            <ul className="mt-6 space-y-3">
              {mistakes.map((mistake) => (
                <li key={mistake} className="flex gap-3 leading-7"><span className="font-black text-[#ffd36b]">×</span><span>{mistake}</span></li>
              ))}
            </ul>
            <p className="mt-6 leading-8 text-[#e6f6fc]">
              計画は一度作って終わりではありません。確認問題や過去問の結果を使い、理解が早い範囲は短く、苦手分野は長くする調整が必要です。
            </p>
          </section>

          <section className="mt-8 rounded-[24px] border-2 border-[#f7a600] bg-white p-6 sm:p-10">
            <p className="text-sm font-black text-[#9a6400]">it-learning-appでできること</p>
            <h2 className="mt-3 text-3xl font-black text-[#12384d]">残り日数と理解度から、今日やることを無料で整理</h2>
            <p className="mt-5 leading-8 text-slate-700">
              it-learning-appは、試験日、使える学習時間、確認問題の結果をもとに、参考書・単語復習・確認問題・過去問レベル演習を一つの計画につなげます。予定より早い人にも、遅れた人にも、次にやる内容が分かる設計です。
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/onboarding" className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 font-black text-white transition hover:bg-[#d98f00]">無料で自分専用の勉強計画を作る</Link>
              <Link href="/lp/it-passport-study-time-calculator" className="inline-flex justify-center rounded-full border border-[#1b75a6] px-7 py-4 font-black text-[#1b75a6]">勉強時間を先に計算する</Link>
            </div>
          </section>

          <section className="mt-8 rounded-[24px] bg-white p-6 sm:p-8">
            <h2 className="text-3xl font-black text-[#12384d]">まとめ</h2>
            <p className="mt-5 leading-8 text-slate-700">
              90日なら理解を厚く、60日なら理解と演習を並行し、30日なら優先順位を明確にすることが重要です。どの期間でも、計画・確認・復習・演習を分断せず、結果に応じて計画を調整してください。
            </p>
          </section>
        </section>
      </article>
    </main>
  );
}
