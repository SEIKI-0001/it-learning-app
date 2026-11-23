import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/it-passport-study-plan-generator-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "study-plan-generator-2026";

export const metadata: Metadata = {
  title: "ITパスポート学習計画を自動作成｜試験日から逆算【2026年】",
  description: "ITパスポートの勉強計画を試験日・平日と休日の学習時間・弱点から逆算。何をいつ勉強するか迷う人向けに、計画の作り方とAI学習支援の使い方を解説します。",
  keywords: ["ITパスポート 学習計画", "ITパスポート 勉強 スケジュール", "ITパスポート 学習計画 自動", "ITパスポート AI 学習", "ITパスポート 2026"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポート学習計画を自動作成【2026年】", description: "試験日と使える時間から、今日やることを逆算。", type: "website", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポート学習計画を自動作成【2026年】", description: "試験日・学習時間・弱点から自分向けの勉強計画へ。" },
};

const steps = [
  ["01", "受験候補日を決める", "『勉強が終わったら受ける』ではなく、まずゴールの日付を置きます。残り日数が決まると、必要な学習量を週単位へ落とせます。"],
  ["02", "平日・休日の時間を入れる", "理想の勉強時間ではなく、実際に確保できる時間で設計します。忙しい週でも崩れにくい計画にするのがポイントです。"],
  ["03", "3分野の現在地を確認する", "ストラテジ・マネジメント・テクノロジを一度問題で確認し、均等配分ではなく弱い分野へ時間を寄せます。"],
  ["04", "演習結果で計画を更新する", "最初に作った予定を守ること自体を目的にせず、誤答や迷った問題が減っているかを見て復習量を調整します。"],
];

const faq = [
  ["ITパスポートの勉強計画は何か月で作ればいい？", "必要期間はIT経験、確保できる時間、現在の理解度で変わります。まず受験候補日を置き、残り日数と使える時間から逆算する方が実行しやすくなります。"],
  ["毎日同じ時間を勉強できなくても大丈夫？", "問題ありません。平日と休日を分けて現実的な時間を設定し、週単位で学習量を調整すると継続しやすくなります。"],
  ["2026年はいつまで受験できる？", "IPAはシステムリプレースに伴い2026年12月28日以降の試験休止を予定しています。会場によってはそれ以前に休止する場合があるため、年内受験なら早めの空席確認が重要です。"],
];

export default function Page() {
  const cta = (position: string) => `/onboarding?source=${source}&position=${position}`;
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "WebPage", name: "ITパスポート学習計画を自動作成｜試験日から逆算【2026年】", url: pageUrl, description: metadata.description },
    { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "it-learning-app", applicationCategory: "EducationalApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q,a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];

  return <main className="min-h-screen bg-[#f7f8f5] text-[#17201b]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="border-b border-black/10 bg-white/90"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><Link href="/" className="font-bold">it-learning-app</Link><Link href={cta("header")} className="rounded-full bg-[#17201b] px-5 py-2.5 text-sm font-semibold text-white">無料で計画を作る</Link></div></header>

    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28"><div className="max-w-4xl"><p className="mb-5 text-sm font-bold tracking-[.18em] text-[#4d6857]">IT PASSPORT STUDY PLAN · 2026</p><h1 className="text-4xl font-bold leading-tight md:text-6xl">ITパスポートの勉強、<br/>「今日は何をやる？」から迷わない。</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-black/65">試験日、平日・休日に使える時間、3分野の現在地から学習を逆算。固定された一般論ではなく、自分の残り時間に合わせて「次にやること」を決めます。</p><div className="mt-9 flex flex-wrap gap-3"><Link href={cta("hero")} className="rounded-xl bg-[#17201b] px-7 py-4 font-bold text-white">無料で自分専用の学習計画を作る</Link><a href="#how" className="rounded-xl border border-black/15 bg-white px-7 py-4 font-bold">作り方を見る</a></div></div></section>

    <section className="border-y border-black/10 bg-white"><div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 md:grid-cols-3"><div><b className="text-2xl">試験日</b><p className="mt-2 text-sm text-black/60">ゴールから残り日数を逆算</p></div><div><b className="text-2xl">使える時間</b><p className="mt-2 text-sm text-black/60">平日・休日を現実的に設定</p></div><div><b className="text-2xl">弱点</b><p className="mt-2 text-sm text-black/60">演習結果で配分を更新</p></div></div></section>

    <section id="how" className="mx-auto max-w-6xl px-6 py-20"><p className="text-sm font-bold tracking-[.16em] text-[#4d6857]">HOW IT WORKS</p><h2 className="mt-3 text-3xl font-bold md:text-4xl">学習計画は4ステップで作る</h2><div className="mt-10 grid gap-5 md:grid-cols-2">{steps.map(([n,t,d]) => <article key={n} className="rounded-2xl border border-black/10 bg-white p-7"><span className="text-sm font-bold text-[#607b69]">{n}</span><h3 className="mt-3 text-xl font-bold">{t}</h3><p className="mt-3 leading-7 text-black/65">{d}</p></article>)}</div></section>

    <section className="bg-[#17201b] text-white"><div className="mx-auto max-w-5xl px-6 py-16 md:flex md:items-center md:justify-between"><div><p className="text-sm font-bold tracking-[.16em] text-white/55">2026年受験の注意</p><h2 className="mt-3 text-2xl font-bold">年内受験なら、受験日を後回しにしない。</h2><p className="mt-4 max-w-2xl leading-7 text-white/70">IPAは2026年12月28日以降のCBT試験休止を予定しています。さらに9月28日以降の新規申込みでは、選択できるITパスポート試験開催日は2026年12月27日までとなる予定です。会場によってはそれ以前に休止する場合があります。</p></div><a href="https://www.ipa.go.jp/shiken/2026/cbt-202605-jisshi.html" className="mt-6 inline-block whitespace-nowrap rounded-xl border border-white/25 px-5 py-3 text-sm font-bold md:ml-8 md:mt-0">IPA公式情報を確認</a></div></section>

    <section className="mx-auto max-w-5xl px-6 py-20"><h2 className="text-3xl font-bold">「計画を作る」より、「計画を更新する」</h2><p className="mt-5 max-w-3xl text-lg leading-8 text-black/65">最初から完璧なスケジュールを作る必要はありません。問題を解けば、苦手な分野や曖昧な用語が見えてきます。その結果に合わせて次の学習を変える方が合理的です。it-learning-appは、学習→測定→弱点→復習→再測定の流れで、次にやることを決めやすくします。</p><div className="mt-8"><Link href={cta("mid")} className="inline-block rounded-xl bg-[#17201b] px-7 py-4 font-bold text-white">無料で学習計画を作る</Link></div></section>

    <section className="border-t border-black/10 bg-white"><div className="mx-auto max-w-5xl px-6 py-20"><h2 className="text-3xl font-bold">よくある質問</h2><div className="mt-8 divide-y divide-black/10">{faq.map(([q,a]) => <div key={q} className="py-6"><h3 className="font-bold">{q}</h3><p className="mt-2 leading-7 text-black/65">{a}</p></div>)}</div></div></section>

    <section className="mx-auto max-w-5xl px-6 py-20 text-center"><p className="text-sm font-bold tracking-[.16em] text-[#4d6857]">START FROM TODAY</p><h2 className="mt-3 text-3xl font-bold md:text-4xl">受験日から、今日やることを逆算する。</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-black/60">教材探しで止まらず、まず自分の残り時間に合う学習計画を作ってみてください。</p><Link href={cta("bottom")} className="mt-8 inline-block rounded-xl bg-[#17201b] px-8 py-4 font-bold text-white">無料で自分専用の学習計画を作る</Link></section>
  </main>;
}
