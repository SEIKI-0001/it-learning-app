import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/blog/it-passport-2026-autumn-study-plan";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const ctaBase = "/onboarding?source=autumn-study-plan-2026";
const title = "ITパスポートを2026年秋に受ける人へ｜8月から始める合格スケジュール";
const description = "2026年秋にITパスポートを受験する人向けに、8月から試験日までの勉強順序を解説。基礎、問題演習、弱点復習、本番対策を段階別に整理し、自分専用の学習計画も無料で作れます。";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["ITパスポート 2026 秋", "ITパスポート 8月 勉強", "ITパスポート 勉強 スケジュール", "ITパスポート 3ヶ月", "ITパスポート AI 学習"],
  alternates: { canonical: pageUrl },
  openGraph: { title, description, type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title, description },
};

const phases = [
  ["STEP 1", "最初の2週間：全体像をつかむ", "ストラテジ・マネジメント・テクノロジを一通り学びます。最初から完璧に暗記せず、『見たことがある』状態を増やすことを優先します。"],
  ["STEP 2", "3〜5週目：問題を解いて弱点を見つける", "分野別の問題演習へ移ります。正答率だけでなく、なぜ間違えたかを記録し、知識不足・用語混同・計算ミスなどに分けます。"],
  ["STEP 3", "6〜8週目：弱点だけを重点復習", "全範囲を最初から読み直すのではなく、間違いが多いテーマへ戻ります。AIには答えそのものではなく、比較説明や具体例を求めると理解を深めやすくなります。"],
  ["STEP 4", "試験前2週間：100問・120分で仕上げる", "本番と同じ時間感覚で演習し、3分野すべてに穴がないか確認します。直前期は新しい教材を増やさず、誤答の再発防止を優先します。"],
];

const faq = [
  ["2026年秋から勉強を始めても間に合いますか？", "必要期間は現在の知識と確保できる学習時間で変わります。まず試験日を決め、残り日数から週ごとの学習量を逆算するのが合理的です。"],
  ["ITパスポートは何点で合格ですか？", "総合評価点600/1,000点以上に加え、ストラテジ・マネジメント・テクノロジの各分野で300/1,000点以上が必要です。"],
  ["2026年末まで受験できますか？", "IPAはシステムリプレースに伴い2026年12月28日以降の試験休止を予定しています。会場によってはそれ以前に実施を終了する場合があるため、最新の会場日程を確認してください。"],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "BlogPosting", headline: title, description, url: pageUrl, inLanguage: "ja", datePublished: "2026-08-16", dateModified: "2026-08-16" },
    { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ],
};

function CTA({ position, label = "無料で自分専用の学習計画を作る" }: { position: string; label?: string }) {
  return <Link href={`${ctaBase}&position=${position}`} className="inline-flex rounded-xl bg-slate-900 px-6 py-3.5 font-bold text-white transition hover:bg-slate-700">{label} →</Link>;
}

export default function Page() {
  return <main className="min-h-screen bg-white text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="border-b border-slate-200"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold">it-learning-app</Link><CTA position="header" label="無料で始める" /></div></header>

    <article>
      <section className="bg-slate-50"><div className="mx-auto max-w-5xl px-5 py-16 md:py-24"><p className="text-sm font-bold text-slate-500">2026年秋受験向け｜ITパスポート学習計画</p><h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">8月からITパスポートを始めるなら、<br />試験日から逆算しよう。</h1><p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600">秋に受験したいのに、参考書を何ページ進めればいいか分からない。そんな状態なら、教材選びより先に「いつ受けるか」を決めるのが近道です。試験日、残り日数、弱点の順に逆算して学習を組み立てます。</p><div className="mt-8"><CTA position="hero" /></div></div></section>

      <section className="mx-auto max-w-4xl px-5 py-14"><h2 className="text-3xl font-black">2026年秋は「受験日を先に決める」意味が大きい</h2><p className="mt-5 leading-8 text-slate-700">ITパスポートはCBT方式で、現在は試験日時と会場を選んで受験できます。一方、IPAはシステムリプレースのため2026年12月28日以降の試験を一時休止する予定と案内しています。会場によっては12月27日より前に実施を終了する場合もあります。</p><p className="mt-4 leading-8 text-slate-700">そのため、2026年内の合格を狙うなら「勉強が終わったら申し込む」より、受験可能な日を確認してから学習期間を逆算する方が計画を立てやすくなります。</p><p className="mt-4 text-sm text-slate-500">出典：IPA「CBT方式で実施するITパスポート試験等における2026年5月以降の試験実施について」</p></section>

      <section className="bg-slate-50"><div className="mx-auto max-w-4xl px-5 py-14"><h2 className="text-3xl font-black">8月からの学習を4段階に分ける</h2><div className="mt-8 space-y-4">{phases.map(([n,h,t]) => <div key={n} className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-xs font-black text-slate-400">{n}</p><h3 className="mt-1 text-xl font-bold">{h}</h3><p className="mt-3 leading-7 text-slate-600">{t}</p></div>)}</div></div></section>

      <section className="mx-auto max-w-4xl px-5 py-14"><h2 className="text-3xl font-black">「600点だけ」を目標にしない</h2><p className="mt-5 leading-8 text-slate-700">現行試験は100問・120分。合格には総合評価点600/1,000点以上だけでなく、ストラテジ・マネジメント・テクノロジの各分野で300/1,000点以上が必要です。IRT方式で評価されるため、単純な正答数だけで合格点を計算することもできません。</p><p className="mt-4 leading-8 text-slate-700">だからこそ、学習後半では「全体で何割取れたか」だけではなく、苦手分野が残っていないかを見る必要があります。</p><div className="mt-8 rounded-2xl bg-slate-900 p-7 text-white"><h3 className="text-2xl font-black">毎週、計画を作り直す。</h3><p className="mt-3 leading-7 text-slate-300">最初に作った計画を守ることが目的ではありません。問題を解いて弱点が見つかったら、翌週の学習量を弱点へ寄せる。それが合格までの最短ルートです。</p><div className="mt-6"><CTA position="mid" label="自分の試験日から学習計画を作る" /></div></div></section>

      <section className="bg-slate-50"><div className="mx-auto max-w-4xl px-5 py-14"><h2 className="text-3xl font-black">よくある質問</h2><div className="mt-7 space-y-4">{faq.map(([q,a]) => <details key={q} className="rounded-xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-3 leading-7 text-slate-600">{a}</p></details>)}</div></div></section>

      <section className="mx-auto max-w-4xl px-5 py-16 text-center"><h2 className="text-3xl font-black">今日やる範囲を、今日決める。</h2><p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-600">it-learning-appなら、試験日と学習可能時間を起点に学習を始められます。計画を考える時間ではなく、実際に理解する時間を増やしましょう。</p><div className="mt-7"><CTA position="bottom" /></div></section>
    </article>
  </main>;
}
