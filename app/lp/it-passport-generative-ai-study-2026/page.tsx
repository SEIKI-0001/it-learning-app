import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/lp/it-passport-generative-ai-study-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const ctaBase = "/onboarding?source=generative-ai-study-2026";
const title = "ITパスポートの生成AI対策｜出題範囲とAIを使った勉強法【2026年版】";
const description = "ITパスポートでは生成AIも学習対象です。IPAシラバスをもとに押さえたいポイントと、生成AIを家庭教師のように使って弱点を復習する方法を初心者向けに解説します。";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["ITパスポート 生成AI", "ITパスポート AI", "ITパスポート 生成AI 問題", "ITパスポート AI 勉強", "ITパスポート シラバス 6.5", "ITパスポート 2026"],
  alternates: { canonical: pageUrl },
  openGraph: { title, description, type: "website", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title, description },
};

const topics = [
  ["生成AIの基本", "生成AIがどのように新しい文章・画像などを生成する技術なのか、従来のAIとの違いを大づかみに理解する。"],
  ["活用場面", "文章作成、要約、アイデア出しなど、業務でどのように利用されるかを具体例と結び付ける。"],
  ["利用時の注意", "出力をそのまま正しいと決めつけず確認することや、入力する情報の扱いなど、利用者側の注意点を押さえる。"],
];

const steps = [
  ["01", "まず自分で問題を解く", "最初からAIに答えを聞かず、自分が分からない場所を特定します。"],
  ["02", "分からない理由をAIに説明させる", "『初心者向けに』『具体例を使って』『AとBを比較して』のように条件を付け、理解できる粒度まで分解します。"],
  ["03", "自分の言葉で説明する", "説明を読んだだけで終わらず、なぜその答えになるのかを短く言語化します。"],
  ["04", "類題で理解を確認する", "別の問題で正解できるかを確認し、知識ではなく解答力になったかを判定します。"],
];

const faq = [
  ["ITパスポートに生成AIは出題されますか？", "IPAは生成AIの仕組み、活用例、留意事項などをITパスポートのシラバスへ追加し、2024年4月の試験から適用しています。現行シラバスはVer.6.5です。"],
  ["ChatGPTなどの生成AIだけで試験勉強できますか？", "AIは質問や比較説明には便利ですが、試験範囲の網羅性や自分の弱点管理は別途必要です。シラバス、問題演習、学習計画と組み合わせるのが安全です。"],
  ["AIに答えを聞けば効率的では？", "答えを見るだけでは理解できたか判定しにくいため、先に自力で解き、解説、再説明、類題という順番がおすすめです。"],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", name: title, description, url: pageUrl, inLanguage: "ja" },
    { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ],
};

function CTA({ position, label = "無料で自分専用の学習計画を作る" }: { position: string; label?: string }) {
  return <Link href={`${ctaBase}&position=${position}`} className="inline-flex rounded-xl bg-slate-900 px-6 py-3.5 font-bold text-white shadow-sm transition hover:bg-slate-700">{label} →</Link>;
}

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b border-slate-200"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold">it-learning-app</Link><CTA position="header" label="無料で始める" /></div></header>

      <section className="bg-slate-50"><div className="mx-auto max-w-5xl px-5 py-16 md:py-24"><p className="mb-4 text-sm font-bold text-slate-500">ITパスポート × 生成AI｜2026年版</p><h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">ITパスポートの生成AI対策。<br />試験範囲を学びながら、AIも勉強に使う。</h1><p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600">生成AIは「勉強に使う道具」であると同時に、ITパスポートで学ぶテーマでもあります。暗記だけで終わらせず、仕組み・活用・注意点を理解し、そのAIを弱点復習にも活用する方法を整理します。</p><div className="mt-8"><CTA position="hero" /></div><p className="mt-3 text-sm text-slate-500">登録後、試験日や学習可能時間に合わせて学習を開始できます。</p></div></section>

      <section className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-black">生成AIはITパスポートの学習対象</h2><p className="mt-5 leading-8 text-slate-700">IPAは2023年にITパスポートのシラバスへ生成AIの仕組み、活用例、留意事項などを追加し、2024年4月の試験から適用しました。2026年8月現在、現行のITパスポート試験シラバスはVer.6.5です。</p><div className="mt-8 grid gap-4 md:grid-cols-3">{topics.map(([h, t]) => <article key={h} className="rounded-2xl border border-slate-200 p-6"><h3 className="text-xl font-bold">{h}</h3><p className="mt-3 leading-7 text-slate-600">{t}</p></article>)}</div><p className="mt-6 text-sm text-slate-500">出典：IPA「試験要綱・シラバスについて」「ITパスポート試験におけるシラバスの一部改訂について」</p></section>

      <section className="bg-slate-900 text-white"><div className="mx-auto max-w-5xl px-5 py-16"><p className="text-sm font-bold text-slate-300">POINT</p><h2 className="mt-2 text-3xl font-black">AIに答えを聞くほど、勉強が速くなるとは限らない。</h2><p className="mt-5 max-w-3xl leading-8 text-slate-300">重要なのは「答えを生成すること」ではなく、「自分がなぜ間違えたかを理解し、次は自力で正解できる状態にすること」です。生成AIは、そのための説明役として使うと強力です。</p></div></section>

      <section className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-black">生成AIを家庭教師にする4ステップ</h2><div className="mt-8 space-y-4">{steps.map(([n, h, t]) => <div key={n} className="flex gap-5 rounded-2xl border border-slate-200 p-6"><div className="text-2xl font-black text-slate-300">{n}</div><div><h3 className="text-xl font-bold">{h}</h3><p className="mt-2 leading-7 text-slate-600">{t}</p></div></div>)}</div></section>

      <section className="bg-slate-50"><div className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-black">ただし、AIだけでは「何をいつ勉強するか」は管理しにくい。</h2><p className="mt-5 max-w-3xl leading-8 text-slate-700">質問への回答と、試験合格までの学習設計は別物です。it-learning-appでは、試験日・学習時間・問題演習の結果を学習の流れにつなげ、「今日は何をやるか」を迷いにくくします。</p><div className="mt-8"><CTA position="mid" /></div></div></section>

      <section className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-black">よくある質問</h2><div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">{faq.map(([q, a]) => <div key={q} className="py-6"><h3 className="font-bold">{q}</h3><p className="mt-2 leading-7 text-slate-600">{a}</p></div>)}</div></section>

      <section className="mx-auto max-w-5xl px-5 pb-20"><div className="rounded-3xl bg-slate-900 px-7 py-12 text-center text-white md:px-12"><h2 className="text-3xl font-black">AIに「何を聞くか」で迷う前に、<br />今日やる学習を決める。</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">試験日から逆算した学習計画と問題演習で、弱点を一つずつ減らしていきましょう。</p><div className="mt-7"><CTA position="bottom" /></div></div></section>
    </main>
  );
}