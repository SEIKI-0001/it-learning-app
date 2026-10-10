import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/lp/it-passport-90-days-before-year-end-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "90-days-before-year-end-2026";

export const metadata: Metadata = {
  title: "ITパスポートを年内に取るなら今から｜90日で進める勉強計画【2026年】",
  description: "2026年中にITパスポートを受験したい人向けに、約90日で基礎・問題演習・弱点復習・本番対策を進める学習計画を解説。試験日から逆算した自分専用プランも無料で作れます。",
  keywords: ["ITパスポート 年内", "ITパスポート 3ヶ月", "ITパスポート 90日", "ITパスポート 勉強計画", "ITパスポート 2026", "ITパスポート AI 学習"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポートを年内に取るなら今から｜90日学習計画【2026年】", description: "約90日を4段階に分けて、年内受験へ向けた勉強を逆算。", type: "website", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポートを年内に取るなら今から【2026年】", description: "90日で基礎から本番対策まで進める学習計画。" },
};

const phases = [
  ["1〜3週目", "3分野の全体像をつかむ", "ストラテジ・マネジメント・テクノロジを一通り学びます。最初から完璧を目指さず、用語を見たときに『何の話か』が分かる状態を目標にします。"],
  ["4〜6週目", "問題演習を増やす", "問題を解き、誤答だけでなく『迷って正解した問題』も記録します。正答率だけでなく、どの分野・論点で判断が曖昧なのかを把握します。"],
  ["7〜9週目", "弱点へ時間を再配分", "3分野を均等に勉強し続けず、間違いが集中している論点へ学習時間を移します。復習後は別問題で理解できたかを再確認します。"],
  ["10〜12週目", "100問・120分を意識する", "本番と同じ時間感覚でまとまった問題を解き、知識だけでなく時間配分も確認します。直前は新しい教材を増やさず、直近の弱点を優先します。"],
];

const faq = [
  { q: "3ヶ月でITパスポート合格を目指せますか？", a: "必要な学習量はIT経験や現在の理解度によって異なります。3ヶ月という期間だけで合格を保証することはできませんが、試験日を決め、問題演習で現在地を測りながら弱点へ時間を配分すると計画を具体化できます。" },
  { q: "2026年中ならいつでも受験できますか？", a: "IPAはシステムリプレースに伴い2026年12月28日以降の試験を休止予定としています。会場によっては12月27日より前に実施が止まる場合もあるため、年内受験を考える場合は早めに会場・空席を確認してください。" },
  { q: "9月28日以降に新規申込みするとどうなりますか？", a: "IPAの2026年8月3日更新情報では、ITパスポート試験は2026年9月28日以降の新規申込みについて、申込日から2026年12月27日までの開催日から選択可能となる予定です。" },
  { q: "AIはITパスポート学習にどう使えばいいですか？", a: "答えだけを聞くのではなく、間違えた選択肢の理由、似た用語の比較、自分が苦手な論点の類題作成などに使うと、弱点復習を短縮しやすくなります。" },
];

export default function Page() {
  const cta = (position: string) => `/onboarding?source=${source}&position=${position}`;
  const jsonLd = { "@context": "https://schema.org", "@type": "WebPage", name: metadata.title, description: metadata.description, url: pageUrl, dateModified: "2026-08-27", publisher: { "@type": "Organization", name: "it-learning-app" } };
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };

  return <main className="min-h-screen bg-stone-50 text-slate-950">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4"><Link href="/" className="font-bold">it-learning-app</Link><Link href={cta("header")} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">無料で学習計画を作る</Link></div></header>

    <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <p className="mb-4 text-sm font-semibold text-emerald-700">2026年8月27日更新｜年内受験を考えている人へ</p>
      <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">年内にITパスポートを取るなら、<br className="hidden md:block" />「いつか」ではなく90日を逆算。</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">2026年は年末にCBT試験の休止予定があります。教材を探し続ける前に受験候補日を置き、基礎・問題演習・弱点復習・本番対策へ残り期間を割り振りましょう。</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link href={cta("hero")} className="rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white">無料で自分専用の計画を作る</Link><a href="https://www.ipa.go.jp/shiken/2026/cbt-202605-jisshi.html" target="_blank" rel="noreferrer" className="rounded-xl border border-stone-300 bg-white px-6 py-3 font-semibold">IPAの2026年日程を確認</a></div>
    </section>

    <section className="border-y border-stone-200 bg-white"><div className="mx-auto max-w-5xl px-6 py-12"><h2 className="text-2xl font-bold">2026年は「年末までまだある」と考えすぎない</h2><p className="mt-4 max-w-3xl leading-7 text-slate-600">IPAはシステムリプレースに伴い2026年12月28日以降のITパスポート試験を休止予定としています。さらに、9月28日以降の新規申込みでは、選択できる試験開催日は2026年12月27日までとなる予定です。会場によってはそれ以前に休止する場合もあるため、年内受験を考えるなら受験候補日と空席を先に確認するのが合理的です。</p></div></section>

    <section className="mx-auto max-w-5xl px-6 py-16"><p className="text-sm font-semibold text-emerald-700">90-DAY PLAN</p><h2 className="mt-2 text-3xl font-bold">90日を4段階に分ける</h2><div className="mt-8 grid gap-5 md:grid-cols-2">{phases.map(([period,title,body]) => <article key={period} className="rounded-2xl border border-stone-200 bg-white p-6"><p className="text-sm font-bold text-emerald-700">{period}</p><h3 className="mt-2 text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-slate-600">{body}</p></article>)}</div></section>

    <section className="bg-slate-950 text-white"><div className="mx-auto grid max-w-5xl gap-8 px-6 py-14 md:grid-cols-2 md:items-center"><div><p className="text-sm font-semibold text-emerald-300">POINT</p><h2 className="mt-2 text-3xl font-bold">同じ90日でも、必要な勉強は人によって違う。</h2><p className="mt-4 leading-7 text-slate-300">IT経験、平日・休日に使える時間、3分野の理解度は人それぞれです。固定の「90日メニュー」を消化するより、問題演習で現在地を測り、残り日数に合わせて弱点へ時間を配分する方が実行しやすくなります。</p></div><div className="rounded-2xl bg-white p-6 text-slate-950"><h3 className="font-bold">it-learning-appで決めること</h3><ul className="mt-4 space-y-3 text-sm text-slate-700"><li>✓ 試験日から残り期間を逆算</li><li>✓ 平日・休日の学習可能時間を設定</li><li>✓ 問題演習から弱点を把握</li><li>✓ 次に何を勉強するかを具体化</li></ul><Link href={cta("mid")} className="mt-6 block rounded-xl bg-emerald-700 px-5 py-3 text-center font-semibold text-white">無料で90日の計画を作る</Link></div></div></section>

    <section className="mx-auto max-w-5xl px-6 py-16"><h2 className="text-3xl font-bold">AIは「分からない時間」を短くするために使う</h2><p className="mt-4 max-w-3xl leading-7 text-slate-600">AIに正解だけを聞くと、問題を解けた気になりやすくなります。間違えた選択肢について「なぜ違う？」「似た用語との違いは？」「同じ論点で数字や状況を変えた問題を作って」と質問し、自分で再回答する使い方が向いています。学習計画と弱点管理はアプリ側に残し、AIは理解を補う役割に分けます。</p></section>

    <section className="border-y border-stone-200 bg-white"><div className="mx-auto max-w-5xl px-6 py-16"><h2 className="text-3xl font-bold">よくある質問</h2><div className="mt-8 space-y-4">{faq.map(({q,a}) => <details key={q} className="rounded-xl border border-stone-200 p-5"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-3 leading-7 text-slate-600">{a}</p></details>)}</div></div></section>

    <section className="mx-auto max-w-4xl px-6 py-20 text-center"><p className="text-sm font-semibold text-emerald-700">START TODAY</p><h2 className="mt-2 text-3xl font-bold md:text-4xl">年内合格を考えるなら、今日やることを決める。</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">受験候補日と使える時間を入力して、自分の残り期間に合った学習計画から始めましょう。</p><Link href={cta("bottom")} className="mt-8 inline-block rounded-xl bg-emerald-700 px-7 py-4 font-semibold text-white">無料で自分専用の学習計画を作る</Link></section>
  </main>;
}
