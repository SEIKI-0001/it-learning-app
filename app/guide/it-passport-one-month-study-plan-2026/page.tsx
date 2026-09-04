import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-one-month-study-plan-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "one-month-study-plan-2026";

export const metadata: Metadata = {
  title: "ITパスポートは1ヶ月で合格できる？30日勉強計画【2026年版】",
  description: "ITパスポートを1ヶ月で受験したい人向けに、30日間の勉強計画を4週間で解説。基礎、問題演習、弱点復習、本番対策を効率よく進める方法を紹介します。",
  keywords: ["ITパスポート 1ヶ月", "ITパスポート 1ヶ月 勉強", "ITパスポート 30日", "ITパスポート 短期合格", "ITパスポート 勉強計画", "ITパスポート AI 学習"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポートは1ヶ月で合格できる？30日勉強計画【2026年版】", description: "残り30日を基礎・演習・弱点復習・本番対策に分ける短期学習プラン。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポートを1ヶ月で受験する30日計画", description: "1ヶ月で何を優先するかを4週間に分けて解説。" },
};

const weeks = [
  { period: "1〜7日目", title: "3分野を一周して全体像をつかむ", text: "ストラテジ・マネジメント・テクノロジを一度通します。細部の暗記に止まらず、知らない用語には印だけ付けて先へ進みます。" },
  { period: "8〜14日目", title: "問題演習を始めて弱点を見つける", text: "問題を解き、誤答だけでなく『迷って正解した問題』も記録します。正答率を上げるより、弱い分野と論点を見つける期間です。" },
  { period: "15〜23日目", title: "弱点へ学習時間を集中する", text: "知らなかった、似た用語と混同した、計算手順が分からなかった、など誤答原因を分類し、必要な範囲だけ復習します。" },
  { period: "24〜30日目", title: "本番形式で再判定する", text: "100問・120分を意識した演習を行い、3分野に大きな穴がないか確認します。直前は新教材を増やさず、直近の誤答を優先します。" },
];

const faq = [
  { question: "ITパスポートは1ヶ月で合格できますか？", answer: "現在の知識量と1日に確保できる学習時間で変わります。1ヶ月合格を保証することはできませんが、基礎知識がある人や十分な学習時間を確保できる人は短期受験を狙えます。初学者は最初の問題演習で現在地を確認して判断してください。" },
  { question: "1ヶ月なら参考書と過去問のどちらを優先すべきですか？", answer: "最初から過去問だけに偏らず、短期間で基礎を一周した後は問題演習の比重を上げます。問題から弱点を発見し、必要な範囲だけ教材へ戻る方法が効率的です。" },
  { question: "AIは短期学習にどう使えますか？", answer: "似た用語の比較、間違えた選択肢の理由説明、数字を変えた類題作成などに使えます。答えを聞いて終わらず、理解後に別問題を自力で解くことが重要です。" },
];

const jsonLd = { "@context": "https://schema.org", "@graph": [
  { "@type": "Article", headline: "ITパスポートは1ヶ月で合格できる？30日勉強計画【2026年版】", description: metadata.description, url: pageUrl, inLanguage: "ja-JP", datePublished: "2026-08-29", dateModified: "2026-08-29" },
  { "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }
] };

const Cta = ({ position }: { position: string }) => (
  <Link href={`/onboarding?source=${source}&position=${position}`} className="inline-flex rounded-xl bg-slate-950 px-6 py-3.5 font-bold text-white transition hover:bg-slate-800">無料で30日の学習計画を作る →</Link>
);

export default function Page() {
  return <main className="min-h-screen bg-white text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="border-b border-slate-200"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><Link href="/" className="font-bold">it-learning-app</Link><Cta position="header" /></div></header>
    <section className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
      <p className="mb-4 text-sm font-bold text-slate-500">ITパスポート短期対策｜2026年版</p>
      <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">ITパスポートは<br className="hidden sm:block" />1ヶ月で合格できる？</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">残り30日なら、全部を完璧にする時間はありません。基礎を短く一周し、問題演習で弱点を特定して、必要なところへ時間を集中させます。</p>
      <div className="mt-8"><Cta position="hero" /></div>
    </section>

    <article className="mx-auto max-w-3xl px-6 pb-20">
      <section className="mb-14 rounded-2xl bg-slate-50 p-7"><h2 className="text-2xl font-bold">結論：1ヶ月で狙えるかは「今の実力」と「使える時間」で決まる</h2><p className="mt-4 leading-8 text-slate-700">「1ヶ月あれば必ず合格できる」という一律の目安はありません。IT経験がある人と初めてIT用語に触れる人では必要な学習量が違います。まず数日で基礎に触れ、早めに問題を解いて現在地を測ることが重要です。</p></section>

      <h2 className="mb-7 text-3xl font-black">30日間の4週間プラン</h2>
      <div className="space-y-6">{weeks.map((week) => <section key={week.period} className="border-l-4 border-slate-900 pl-6"><p className="text-sm font-bold text-slate-500">{week.period}</p><h3 className="mt-1 text-xl font-bold">{week.title}</h3><p className="mt-2 leading-7 text-slate-600">{week.text}</p></section>)}</div>

      <section className="my-14 rounded-2xl border border-slate-200 p-7"><h2 className="text-2xl font-bold">短期学習で避けたい3つ</h2><ul className="mt-5 space-y-3 leading-7 text-slate-700"><li><strong>参考書を完璧にしてから問題を解く：</strong>弱点が分かるまでに時間を使いすぎます。</li><li><strong>正解した問題を全部「理解済み」にする：</strong>迷って当たった問題は再確認対象です。</li><li><strong>苦手分野を捨てる：</strong>ITパスポートには総合評価だけでなく分野別の評価基準があります。</li></ul></section>

      <section className="my-14 bg-slate-950 p-8 text-white sm:rounded-2xl"><p className="text-sm font-bold text-slate-300">残り30日を自分向けに配分</p><h2 className="mt-2 text-3xl font-black">固定プランではなく、弱点に合わせて変える。</h2><p className="mt-4 leading-7 text-slate-300">it-learning-appなら、試験日や使える時間から学習を始め、問題演習で見つかった弱点を次の学習へつなげられます。</p><div className="mt-6"><Link href={`/onboarding?source=${source}&position=mid`} className="inline-flex rounded-xl bg-white px-6 py-3.5 font-bold text-slate-950">無料で30日の学習計画を作る →</Link></div></section>

      <section className="mb-14"><h2 className="text-3xl font-black">AIは「調べる時間」を短くするために使う</h2><p className="mt-4 leading-8 text-slate-700">短期学習では、分からない用語を延々と検索する時間も負担になります。AIに「RTOとRPOを比較して」「この選択肢が違う理由を初心者向けに説明して」「数字を変えた類題を1問作って」と依頼すると、理解確認を速くできます。ただしAIの回答を鵜呑みにせず、教材や公式情報と照合し、最後は自力で問題を解きます。</p></section>

      <section className="mb-14"><h2 className="text-3xl font-black">よくある質問</h2><div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">{faq.map((item) => <div key={item.question} className="py-6"><h3 className="font-bold">{item.question}</h3><p className="mt-2 leading-7 text-slate-600">{item.answer}</p></div>)}</div></section>

      <section className="rounded-2xl bg-slate-100 p-8 text-center"><h2 className="text-3xl font-black">30日を「何となく勉強」で終わらせない。</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">試験日と使える時間を入力して、今日からやることを具体化しましょう。</p><div className="mt-6"><Cta position="bottom" /></div></section>
    </article>
  </main>;
}
