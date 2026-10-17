import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-3-months-year-end-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "3-months-year-end-2026";

export const metadata: Metadata = {
  title: "ITパスポートは3ヶ月で合格できる？年内受験から逆算する勉強法【2026年】",
  description: "ITパスポートを3ヶ月で合格したい社会人向けに、2026年末の受験期限を踏まえ、現在地測定から弱点学習・再測定までの100日プランを解説します。",
  keywords: ["ITパスポート 3ヶ月", "ITパスポート 年内 合格", "ITパスポート 3ヶ月 勉強", "ITパスポート 社会人 勉強法", "ITパスポート 100日", "ITパスポート 勉強スケジュール"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポートは3ヶ月で合格できる？【2026年】", description: "2026年末の受験から逆算する100日学習プラン。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポートは3ヶ月で合格できる？", description: "年内受験から逆算する100日学習プラン。" },
};

const faq = [
  { q: "ITパスポートは3ヶ月で合格できますか？", a: "可能性は十分あります。ただし必要な学習量はIT・ビジネス知識の現在地によって異なります。最初に初見問題で現在地を測り、既に知っている範囲を学習対象から外すことが重要です。" },
  { q: "2026年中はいつまで受験できますか？", a: "IPAの案内では、2025年12月27日以降に申し込んだ受験者は2026年12月28日以降の試験日を選択できず、2026年12月27日までの受験が必要です。空席状況もあるため早めの確認が必要です。" },
  { q: "毎日何時間勉強すればよいですか？", a: "一律の時間を決めるより、現在地を測って不足範囲を特定してから必要量を決める方が合理的です。社会人なら平日と休日で継続可能な時間を置き、測定結果に応じて週単位で調整します。" },
];

function Cta({ position, label }: { position: string; label: string }) {
  return <Link href={`/onboarding?source=${source}&position=${position}`} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-700">{label} →</Link>;
}

export default function Page() {
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "Article", headline: metadata.title, description: metadata.description, mainEntityOfPage: pageUrl, datePublished: "2026-09-18", dateModified: "2026-09-18", publisher: { "@type": "Organization", name: "it-learning-app" } },
    { "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }
  ] };

  return <main className="min-h-screen bg-white text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="border-b border-slate-200"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-black">it-learning-app</Link><Cta position="header" label="無料で学習計画を作る" /></div></header>

    <section className="mx-auto max-w-4xl px-5 py-16 text-center md:py-24">
      <p className="text-sm font-bold text-blue-700">2026年9月18日時点｜12月27日まで残り100日</p>
      <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">ITパスポート、<br/>3ヶ月で合格を目指せる？</h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">100日あるから参考書を100日読む、ではありません。最初に「もう知っていること」を除き、合格までに足りない部分へ時間を使う方が効率的です。</p>
      <div className="mt-8"><Cta position="hero" label="無料で今の実力を確認する" /></div>
    </section>

    <article className="mx-auto max-w-3xl px-5 pb-20">
      <section className="rounded-3xl bg-slate-900 p-7 text-white"><p className="text-sm font-bold text-blue-300">結論</p><h2 className="mt-2 text-2xl font-black">3ヶ月あるなら、まず「何時間必要か」を測る。</h2><p className="mt-4 leading-8 text-slate-300">資格スクール等では100〜150時間前後を目安とする例がありますが、必要時間は人によって変わります。経営・会計・法務を仕事で知っている人と、IT用語に慣れている人では、学ぶべき場所が違うからです。</p></section>

      <section className="mt-14"><h2 className="text-3xl font-black">2026年は「いつか受ける」が危ない</h2><p className="mt-5 leading-8 text-slate-700">IPAはシステムリプレースに伴い、2027年1月以降にITパスポート試験を一時休止する予定と案内しています。2025年12月27日以降に申し込んだ場合、2026年12月28日以降の試験日は選択できません。</p><p className="mt-4 leading-8 text-slate-700">今日9月18日から12月27日までは100日。年内合格を狙うなら、「勉強が終わったら申し込む」より、受験候補日を先に置いて残り日数から学習を逆算する時期です。</p></section>

      <section className="mt-14"><h2 className="text-3xl font-black">100日を4段階に分ける</h2><div className="mt-7 space-y-4">{[
        ["DAY 1–7", "現在地を測る", "初見問題を解き、ストラテジ・マネジメント・テクノロジのどこに不足があるか確認します。最初から全範囲を読み始めません。"],
        ["DAY 8–50", "弱点から学ぶ", "誤答が集中するテーマを優先。理解できている領域は短縮し、必要な解説・確認問題へ時間を集中します。"],
        ["DAY 51–80", "別問題で再測定", "同じ問題の正答率ではなく、未回答問題で改善を確認。残った弱点だけを次の学習対象にします。"],
        ["DAY 81–100", "合格を安定させる", "分野横断で演習し、特定分野の穴や忘れている論点を補修。直前は新しい教材を増やさず、失点要因を減らします。"],
      ].map(([n,h,p]) => <div key={n} className="rounded-2xl border border-slate-200 p-6"><p className="text-sm font-black text-blue-700">{n}</p><h3 className="mt-1 text-xl font-black">{h}</h3><p className="mt-2 leading-7 text-slate-600">{p}</p></div>)}</div></section>

      <section className="mt-14 rounded-3xl bg-blue-50 p-7"><p className="text-sm font-bold text-blue-700">時間を減らすポイント</p><h2 className="mt-2 text-2xl font-black">「全部やる」から「足りないところをやる」へ。</h2><p className="mt-4 leading-8 text-slate-700">it-learning-appは、問題を解いた結果から現在地と弱点を捉え、次に取り組む内容を決める学習ループを重視しています。100日を教材の消化日数にするのではなく、測定→学習→再測定の回数に変えます。</p><div className="mt-6"><Cta position="mid" label="無料で弱点から学習を始める" /></div></section>

      <section className="mt-14"><h2 className="text-3xl font-black">よくある質問</h2><div className="mt-6 space-y-4">{faq.map((x) => <details key={x.q} className="rounded-2xl border border-slate-200 p-5"><summary className="cursor-pointer font-bold">{x.q}</summary><p className="mt-3 leading-7 text-slate-600">{x.a}</p></details>)}</div></section>

      <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-center text-white"><p className="text-sm font-bold text-blue-300">年内合格を目指すなら</p><h2 className="mt-2 text-3xl font-black">100日全部を勉強日にしない。</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-slate-300">まず現在地を測って、あなたに必要な学習だけに絞りましょう。</p><div className="mt-7"><Link href={`/onboarding?source=${source}&position=bottom`} className="inline-flex rounded-xl bg-white px-7 py-4 font-bold text-slate-900">無料で自分専用の学習計画を作る →</Link></div></section>

      <p className="mt-10 text-sm leading-6 text-slate-500">試験日・申込可能日・休止予定は変更される場合があります。受験前にIPA公式のITパスポート試験案内で最新情報を確認してください。</p>
    </article>
  </main>;
}