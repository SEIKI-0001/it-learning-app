import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/lp/it-passport-score-600-strategy-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const cta = "/onboarding?source=score-600-strategy-2026";

export const metadata: Metadata = {
  title: "ITパスポート600点を取る勉強法｜分野別300点も落とさない合格戦略【2026年】",
  description: "ITパスポートは総合600点だけでは不十分。ストラテジ・マネジメント・テクノロジ各300点以上も必要です。2026年受験者向けに、弱点を残さず合格を狙う学習順序を解説します。",
  keywords: ["ITパスポート 600点", "ITパスポート 合格点", "ITパスポート 300点", "ITパスポート 勉強法", "ITパスポート 合格ライン", "ITパスポート 弱点対策"],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポート600点を取る勉強法｜分野別300点も落とさない",
    description: "総合点だけを追わない。3分野の足切りを避けながら合格ラインを目指す学習戦略。",
    type: "website", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP",
  },
  twitter: { card: "summary_large_image", title: "ITパスポート600点を取る勉強法", description: "総合600点＋3分野300点を意識した2026年向け合格戦略。" },
};

const domains = [
  ["ストラテジ系", "35問程度", "経営戦略・企業活動・法務など"],
  ["マネジメント系", "20問程度", "プロジェクト・サービス・監査など"],
  ["テクノロジ系", "45問程度", "セキュリティ・ネットワーク・DBなど"],
];

const steps = [
  ["01", "まず3分野を一度解く", "得意分野だけで点を稼ぐ前に、ストラテジ・マネジメント・テクノロジを横断して問題を解きます。正答率だけでなく、迷った問題も弱点候補として残します。"],
  ["02", "弱い分野を先に300点圏外から出す", "総合点を伸ばすより先に、極端に弱い分野を放置しないことが重要です。苦手テーマを小さく分け、解説→確認問題→再演習の順で埋めます。"],
  ["03", "600点ぎりぎりではなく余裕を作る", "本試験はIRT方式で評価点が算出されるため、単純な正答数＝評価点ではありません。『60問正解なら必ず600点』とは考えず、幅広く安定して解ける状態を目指します。"],
  ["04", "過去問で弱点を更新する", "一度覚えたテーマも、時間がたつと抜けます。演習結果から苦手を更新し、試験直前ほど『新しく広げる』より『落とす分野を減らす』ことを優先します。"],
];

const faq = [
  { q: "ITパスポートは600点を取れば必ず合格ですか？", a: "いいえ。総合評価点600点以上に加え、ストラテジ系・マネジメント系・テクノロジ系の各分野別評価点がそれぞれ300点以上である必要があります。" },
  { q: "60問正解すれば600点になりますか？", a: "単純には換算できません。ITパスポート試験はIRT（項目応答理論）に基づいて評価点を算出するため、正答数と評価点は1対1では対応しません。" },
  { q: "どの分野から勉強すればよいですか？", a: "最初に3分野を横断して現在地を確認し、極端に弱い分野を優先するのがおすすめです。その後、全体の得点力を伸ばします。" },
  { q: "2026年の試験範囲は何を見ればよいですか？", a: "IPAが2026年1月8日に掲載したITパスポート試験シラバスVer.6.5が現行の学習指針です。" },
];

export default function Page() {
  const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(x => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) };
  const webJsonLd = { "@context": "https://schema.org", "@type": "WebPage", name: metadata.title, description: metadata.description, url: pageUrl, dateModified: "2026-08-09", inLanguage: "ja-JP" };
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <header className="border-b border-white/10"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold">it-learning-app</Link><Link href={`${cta}&position=header`} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950">無料で学習計画を作る</Link></div></header>

      <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="max-w-4xl">
          <p className="mb-5 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300">2026年版 ITパスポート合格戦略</p>
          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">600点だけ見ていると、<br/><span className="text-emerald-300">合格を逃す。</span></h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">ITパスポートの合格基準は、総合評価点600点以上だけではありません。3つの分野すべてで300点以上が必要です。だから、得意分野を伸ばすだけではなく「弱点を残さない学習」が重要です。</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href={`${cta}&position=hero`} className="rounded-xl bg-emerald-300 px-6 py-4 font-black text-slate-950">無料で自分専用の学習計画を作る →</Link><a href="#strategy" className="rounded-xl border border-white/15 px-6 py-4 font-bold">合格戦略を見る</a></div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]"><div className="mx-auto grid max-w-6xl gap-5 px-5 py-12 md:grid-cols-4"><div><p className="text-sm text-slate-400">総合評価点</p><p className="mt-1 text-3xl font-black">600<span className="text-base"> / 1,000点以上</span></p></div>{domains.map(d => <div key={d[0]}><p className="text-sm text-slate-400">{d[0]}</p><p className="mt-1 text-3xl font-black">300<span className="text-base"> / 1,000点以上</span></p></div>)}</div></section>

      <section id="strategy" className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-sm font-bold text-emerald-300">PASS STRATEGY</p><h2 className="mt-3 text-3xl font-black md:text-4xl">合格ラインから逆算する4ステップ</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">{steps.map(s => <article key={s[0]} className="rounded-2xl border border-white/10 bg-white/[0.04] p-7"><p className="text-sm font-black text-emerald-300">STEP {s[0]}</p><h3 className="mt-2 text-xl font-black">{s[1]}</h3><p className="mt-4 leading-7 text-slate-300">{s[2]}</p></article>)}</div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20"><div className="rounded-3xl bg-emerald-300 p-8 text-slate-950 md:p-12"><p className="text-sm font-black">it-learning-app</p><h2 className="mt-2 text-3xl font-black md:text-4xl">「あと何時間」ではなく、<br/>「どこが弱いか」を学習につなげる。</h2><p className="mt-5 max-w-3xl leading-7">試験日から学習計画を作り、確認問題や演習を進めながら理解度を確認。毎日何をするかを整理し、苦手を復習する流れを一つにまとめます。</p><Link href={`${cta}&position=mid`} className="mt-7 inline-block rounded-xl bg-slate-950 px-6 py-4 font-black text-white">無料で学習計画を作る →</Link></div></section>

      <section className="mx-auto max-w-6xl px-5 pb-20"><h2 className="text-3xl font-black">出題構成も知っておこう</h2><div className="mt-7 overflow-hidden rounded-2xl border border-white/10">{domains.map((d,i) => <div key={d[0]} className={`grid gap-2 p-5 md:grid-cols-3 ${i ? "border-t border-white/10" : ""}`}><strong>{d[0]}</strong><span className="text-slate-300">{d[1]}</span><span className="text-slate-400">{d[2]}</span></div>)}</div><p className="mt-5 text-sm leading-6 text-slate-400">IPAによる現行試験の出題数は100問、試験時間は120分。評価点はIRT（項目応答理論）に基づいて算出されます。2026年の学習範囲はシラバスVer.6.5を基準に確認してください。</p></section>

      <section className="mx-auto max-w-4xl px-5 pb-20"><h2 className="text-3xl font-black">よくある質問</h2><div className="mt-7 space-y-4">{faq.map(x => <details key={x.q} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><summary className="cursor-pointer font-bold">{x.q}</summary><p className="mt-4 leading-7 text-slate-300">{x.a}</p></details>)}</div></section>

      <section className="border-t border-white/10 bg-white/[0.03]"><div className="mx-auto max-w-4xl px-5 py-20 text-center"><h2 className="text-3xl font-black md:text-4xl">合格ラインまでの道筋を、今日決める。</h2><p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-300">試験日と使える時間から、毎日の学習を具体化。まずは無料で学習計画を作成できます。</p><Link href={`${cta}&position=bottom`} className="mt-8 inline-block rounded-xl bg-emerald-300 px-7 py-4 font-black text-slate-950">無料で自分専用の学習計画を作る →</Link></div></section>
    </main>
  );
}
