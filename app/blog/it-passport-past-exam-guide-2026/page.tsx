import type { Metadata } from "next";
import Link from "next/link";

const pageUrl = "https://it-learning-app.vercel.app/blog/it-passport-past-exam-guide-2026";
const cta = "/past-exams/2026?source=past-exam-guide-2026";

export const metadata: Metadata = {
  title: "ITパスポート過去問の使い方｜2026年公開問題100問の勉強法",
  description: "ITパスポートの過去問は何周すべき？2026年公開問題100問を使い、実力確認、弱点発見、復習、再演習まで効率よく進める方法を解説します。",
  keywords: ["ITパスポート 過去問", "ITパスポート 2026 過去問", "ITパスポート 過去問 勉強法", "ITパスポート 独学"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポート過去問の効果的な使い方【2026年版】", description: "2026年公開問題100問を、解くだけで終わらせない。弱点発見と復習につなげる過去問勉強法。", type: "article", url: pageUrl, locale: "ja_JP", siteName: "it-learning-app" },
};

export default function Page() {
  const jsonLd = { "@context": "https://schema.org", "@type": "BlogPosting", headline: "ITパスポート過去問の効果的な使い方", url: pageUrl, inLanguage: "ja", datePublished: "2026-08-07" };
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
        <p className="mb-4 text-sm font-semibold text-blue-700">ITパスポート独学ガイド</p>
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">ITパスポート過去問の効果的な使い方｜2026年公開問題100問で合格力を伸ばす</h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">過去問は「何問解いたか」より、間違いから何を理解したかが重要です。実力確認から弱点復習までを一つのサイクルにする方法を解説します。</p>
        <div className="mt-8 rounded-2xl bg-blue-50 p-6"><p className="font-bold">まず現在地を確認したい人へ</p><p className="mt-2 text-slate-700">it-learning-appでは2026年の公式公開問題100問を、独自解説付きで練習できます。</p><Link href={cta} className="mt-4 inline-block rounded-xl bg-blue-700 px-6 py-3 font-bold text-white">2026年公開問題を無料で解く →</Link></div>
        <section className="mt-14"><h2 className="text-2xl font-bold">過去問はいつから始めるべき？</h2><p className="mt-4 leading-8 text-slate-700">参考書を完璧に覚えてから始める必要はありません。基礎を一通り見た段階で過去問を解くと、「分かったつもり」の領域と本当に解ける領域を切り分けられます。最初は点数より、弱点を発見する診断として使いましょう。</p></section>
        <section className="mt-12"><h2 className="text-2xl font-bold">おすすめは「解く→理解する→解き直す」</h2><div className="mt-5 space-y-4 text-slate-700"><p><strong>1周目：</strong>100問を解き、現在地と苦手分野を把握する。</p><p><strong>復習：</strong>誤答と迷った問題の解説を確認し、間違えた理由を説明できる状態にする。</p><p><strong>2周目：</strong>間違えた問題を中心に解き直し、知識の穴が埋まったか確認する。</p><p><strong>仕上げ：</strong>本番を意識した通し演習で時間配分と残った弱点を確認する。</p></div></section>
        <section className="mt-12"><h2 className="text-2xl font-bold">間違えた問題で確認する3つのこと</h2><ol className="mt-5 space-y-4 text-slate-700"><li><strong>用語を知らなかった：</strong>用語と意味をセットで復習する。</li><li><strong>知っていたのに選べなかった：</strong>似た概念との違いまで説明できるようにする。</li><li><strong>問題文を読み違えた：</strong>条件や否定表現を確認する。</li></ol><p className="mt-5 leading-8 text-slate-700">正解した問題でも、消去法で偶然当たった問題は復習対象です。正答率だけでなく、確信を持って答えられたかも確認しましょう。</p></section>
        <section className="mt-12 rounded-2xl border border-slate-200 p-6"><h2 className="text-2xl font-bold">過去問だけで勉強してもいい？</h2><p className="mt-4 leading-8 text-slate-700">答えを暗記するだけでは初見問題への対応力が伸びません。誤答をきっかけに関連知識へ戻り、理解したあとで再び問題を解くことが重要です。参考書などのインプットと過去問演習を往復してください。</p></section>
        <section className="mt-12"><h2 className="text-2xl font-bold">it-learning-appなら2026年公開問題をすぐ演習できる</h2><p className="mt-4 leading-8 text-slate-700">it-learning-appには令和8年度のITパスポート公式公開問題100問を収録しています。練習モードでは1問ごとに本サービス独自の解説を確認でき、本番モードでは採点まで正答・解説を表示せずに通し演習できます。</p></section>
        <section className="mt-14 rounded-3xl bg-slate-950 p-7 text-white sm:p-10"><h2 className="text-2xl font-bold sm:text-3xl">まず100問で、今の実力を確認する</h2><p className="mt-4 leading-7 text-slate-300">点数を見るだけで終わらせず、苦手を見つけて次の学習につなげましょう。</p><Link href={`${cta}&position=bottom`} className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-bold text-slate-950">2026年公開問題を無料で解く →</Link></section>
      </article>
    </main>
  );
}
