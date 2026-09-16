import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-600-score-not-enough-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "600-score-not-enough-2026";

export const metadata: Metadata = {
  title: "ITパスポートは600点だけでは合格できない？合格基準と落とし穴【2026年】",
  description: "ITパスポートは総合評価点600点以上だけでは不十分。分野別評価点の基準と、600点前後の人が再受験までに何を直すべきかを分かりやすく解説します。",
  keywords: ["ITパスポート 600点", "ITパスポート 合格点", "ITパスポート 600点 落ちた", "ITパスポート 合格基準", "ITパスポート 分野別 300点", "ITパスポート 不合格"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポートは600点だけでは合格できない？【2026年】", description: "総合点だけ見ていると見落とす、ITパスポートの合格基準と弱点対策。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポートは600点だけでは合格できない？", description: "合格基準と600点前後からの弱点対策を解説。" },
};

const faq = [
  { q: "ITパスポートは600点取れば必ず合格ですか？", a: "いいえ。総合評価点が600点以上であることに加え、ストラテジ系・マネジメント系・テクノロジ系の各分野別評価点が300点以上である必要があります。" },
  { q: "総合600点以上なのに不合格になることはありますか？", a: "あります。3分野のうち1分野でも評価点が300点未満なら、総合評価点が600点以上でも合格基準を満たしません。" },
  { q: "600点前後なら何を勉強すべきですか？", a: "全範囲を最初からやり直すより、分野別結果と初見問題から失点が集中する領域を特定し、そこを補強して別問題で再測定する方が学習対象を絞れます。" },
];

function Cta({ position, label = "無料で自分の弱点を確認する" }: { position: string; label?: string }) {
  return <Link href={`/onboarding?source=${source}&position=${position}`} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-700">{label} →</Link>;
}

export default function Page() {
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "Article", headline: metadata.title, description: metadata.description, mainEntityOfPage: pageUrl, datePublished: "2026-09-17", dateModified: "2026-09-17", publisher: { "@type": "Organization", name: "it-learning-app" } },
    { "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }
  ] };

  return <main className="min-h-screen bg-white text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="border-b border-slate-200"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-black">it-learning-app</Link><Cta position="header" /></div></header>

    <section className="mx-auto max-w-4xl px-5 py-16 text-center md:py-24">
      <p className="text-sm font-bold text-blue-700">2026年版｜合格基準を3分で整理</p>
      <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">ITパスポートは<br/>「600点」だけでは合格できない。</h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">総合評価点600点以上に加えて、3分野それぞれにも基準があります。600点前後まで来た人ほど、全範囲をやり直すより「どこで落としているか」を先に確認することが重要です。</p>
      <div className="mt-8"><Cta position="hero" label="無料で現在地を測る" /></div>
    </section>

    <article className="mx-auto max-w-3xl px-5 pb-20">
      <section className="rounded-3xl bg-slate-900 p-7 text-white">
        <p className="text-sm font-bold text-blue-300">合格基準</p>
        <h2 className="mt-2 text-2xl font-black">総合600点以上 ＋ 3分野すべて300点以上</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/10 p-5"><p className="text-sm text-slate-300">総合評価点</p><p className="mt-1 text-3xl font-black">600 / 1,000点以上</p></div><div className="rounded-2xl bg-white/10 p-5"><p className="text-sm text-slate-300">分野別評価点</p><p className="mt-1 text-3xl font-black">各300 / 1,000点以上</p></div></div>
        <p className="mt-5 leading-7 text-slate-300">対象はストラテジ系・マネジメント系・テクノロジ系の3分野です。総合点だけでなく、苦手分野を基準未満にしないことが必要です。</p>
      </section>

      <section className="mt-14"><h2 className="text-3xl font-black">なぜ「600点を目指す」だけでは危ないのか</h2><p className="mt-5 leading-8 text-slate-700">例えば得意分野で大きく得点できても、1つの分野が基準を下回れば合格基準を満たしません。したがって、勉強の終盤では総合正答率だけを見るのではなく、分野別に弱点が残っていないかを見る必要があります。</p><p className="mt-4 leading-8 text-slate-700">特に600点前後の人は、知識がゼロなのではなく「一部の穴が合否を不安定にしている」可能性があります。参考書を最初からもう一周する前に、その穴を特定する方が合理的です。</p></section>

      <section className="mt-14"><h2 className="text-3xl font-black">600点前後からやることは3つ</h2><div className="mt-7 space-y-4">{[
        ["1", "分野別に失点を見る", "総合点だけでなく、ストラテジ・マネジメント・テクノロジのどこが不安定か確認します。"],
        ["2", "初見問題で弱点を確かめる", "同じ問題の反復では答えの記憶が混ざります。未回答の問題を使い、本当に理解できているか測ります。"],
        ["3", "弱点だけ補強して再測定する", "間違えた論点だけを学び直し、別の初見問題で改善したか確認します。改善していなければ、そこだけ追加学習します。"],
      ].map(([n,h,p]) => <div key={n} className="flex gap-4 rounded-2xl border border-slate-200 p-6"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-black text-white">{n}</span><div><h3 className="text-xl font-black">{h}</h3><p className="mt-2 leading-7 text-slate-600">{p}</p></div></div>)}</div></section>

      <section className="mt-14 rounded-3xl bg-blue-50 p-7"><p className="text-sm font-bold text-blue-700">it-learning-appの考え方</p><h2 className="mt-2 text-2xl font-black">「あと何点」ではなく「次に何を直すか」まで決める。</h2><p className="mt-4 leading-8 text-slate-700">点数を眺めるだけでは次の行動は決まりません。問題履歴から弱点を見つけ、必要な範囲を学び、別問題で再測定する。このループを繰り返して、合格水準へ近づけます。</p><div className="mt-6"><Cta position="mid" label="無料で弱点から学習を始める" /></div></section>

      <section className="mt-14"><h2 className="text-3xl font-black">よくある質問</h2><div className="mt-6 space-y-4">{faq.map((x) => <details key={x.q} className="rounded-2xl border border-slate-200 p-5"><summary className="cursor-pointer font-bold">{x.q}</summary><p className="mt-3 leading-7 text-slate-600">{x.a}</p></details>)}</div></section>

      <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-center text-white"><h2 className="text-3xl font-black">600点前後なら、全部やり直さない。</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-slate-300">今の実力を測り、合否を不安定にしている弱点から埋めていきましょう。</p><div className="mt-7"><Link href={`/onboarding?source=${source}&position=bottom`} className="inline-flex rounded-xl bg-white px-7 py-4 font-bold text-slate-900">無料で自分専用の学習計画を作る →</Link></div></section>

      <p className="mt-10 text-sm leading-6 text-slate-500">合格基準など試験制度の最新情報は、受験前にIPA公式サイトで必ず確認してください。</p>
    </article>
  </main>;
}
