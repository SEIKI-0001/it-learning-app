import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-exam-date-change-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "exam-date-change-2026";

export const metadata: Metadata = {
  title: "ITパスポートの試験日は変更できる？2026年の期限・注意点と勉強計画",
  description: "ITパスポートの試験日を変更したい人向けに、2026年の変更ルールと12月の試験休止予定を整理。延期を繰り返さず、残り日数から学習計画を立て直す方法も解説します。",
  keywords: ["ITパスポート 試験日 変更", "ITパスポート 日程変更", "ITパスポート 2026", "ITパスポート 受験日", "ITパスポート 勉強計画"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポートの試験日は変更できる？【2026年】", description: "変更ルールと、延期する前に確認したい学習計画を整理。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポートの試験日は変更できる？【2026年】", description: "2026年の変更ルールと残り日数からの学習計画を解説。" },
};

const checks = [
  ["1", "まず空席と受験可能期間を確認", "変更先を決める前に、ITパスポート試験公式サイトで会場と空席を確認します。2026年はシステムリプレースに伴う休止予定があるため、通常年と同じ感覚で先延ばししないことが重要です。"],
  ["2", "延期理由を『時間不足』だけにしない", "過去問の点数だけでなく、ストラテジ・マネジメント・テクノロジのどこに穴があるかを確認します。弱点が限定的なら、受験日を動かすより残り期間の配分変更で対応できる場合があります。"],
  ["3", "新しい受験日から逆算し直す", "延期した日数をそのまま追加勉強時間にするのではなく、弱点復習→別問題で再確認→本番形式の演習という順番で予定を組み直します。"],
  ["4", "変更後は再延期の条件を決める", "『不安だから』ではなく、分野別の弱点や本番形式での時間配分など、再判断する基準を先に決めておくと延期の繰り返しを防ぎやすくなります。"],
];

const faq = [
  { q: "2026年12月28日以降へ変更できますか？", a: "IPAはシステムリプレースのため2026年12月28日以降の試験を休止予定と案内しています。2025年12月27日以降に申し込んだ場合、2026年12月28日以降の試験日は選択できません。" },
  { q: "2026年9月28日以降に新規申込みするとどうなりますか？", a: "IPAの2026年8月3日更新情報では、ITパスポート試験は9月28日以降の新規申込みで、申込日から2026年12月27日までの開催日から選択可能となる予定です。" },
  { q: "試験日を延ばせば合格しやすくなりますか？", a: "日数を増やすだけでは十分ではありません。現在の弱点を確認し、追加された期間を何の復習に使うか決めることが重要です。" },
];

export default function Page() {
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: "ITパスポートの試験日は変更できる？2026年の期限・注意点と勉強計画", description: metadata.description, mainEntityOfPage: pageUrl, dateModified: "2026-08-26", publisher: { "@type": "Organization", name: "it-learning-app" } };
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  const cta = (position: string) => `/onboarding?source=${source}&position=${position}`;

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4"><Link href="/" className="font-bold">it-learning-app</Link><Link href={cta("header")} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">無料で学習計画を作る</Link></div></header>

    <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <p className="mb-4 text-sm font-semibold text-blue-700">2026年8月26日更新｜ITパスポート受験ガイド</p>
      <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">試験日を変える前に、<br className="hidden md:block"/>学習計画を変えてみる。</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">ITパスポートの試験日は自分で選べる一方、2026年は年末に試験休止予定があります。変更ルールを確認したうえで、本当に延期が必要かを弱点と残り日数から判断しましょう。</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link href={cta("hero")} className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white">無料で残り日数から計画を作る</Link><a href="https://www.ipa.go.jp/shiken/2026/cbt-202605-jisshi.html" className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold" target="_blank" rel="noreferrer">IPA公式情報を確認</a></div>
    </section>

    <section className="border-y bg-white"><div className="mx-auto max-w-5xl px-6 py-12"><h2 className="text-2xl font-bold">2026年は「とりあえず先延ばし」に注意</h2><div className="mt-6 grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-amber-50 p-6"><p className="font-bold">12月28日以降</p><p className="mt-2 text-slate-700">IPAはシステムリプレースに伴う試験休止を予定。会場によっては12月27日より前に休止する場合もあります。</p></div><div className="rounded-2xl bg-blue-50 p-6"><p className="font-bold">9月28日以降の新規申込み</p><p className="mt-2 text-slate-700">2026年12月27日までの開催日から選択可能となる予定です。秋以降は受験可能期間を先に確認しましょう。</p></div></div></div></section>

    <section className="mx-auto max-w-5xl px-6 py-16"><h2 className="text-3xl font-bold">試験日を変更する前の4チェック</h2><div className="mt-8 grid gap-5 md:grid-cols-2">{checks.map(([n,t,d]) => <article key={n} className="rounded-2xl border bg-white p-6"><p className="text-sm font-bold text-blue-700">CHECK {n}</p><h3 className="mt-2 text-xl font-bold">{t}</h3><p className="mt-3 leading-7 text-slate-600">{d}</p></article>)}</div></section>

    <section className="bg-slate-900 text-white"><div className="mx-auto max-w-5xl px-6 py-16"><h2 className="text-3xl font-bold">延期より先に「何が足りないか」を決める</h2><p className="mt-5 max-w-3xl leading-8 text-slate-300">あと2週間必要なのか、苦手テーマを3つ復習すればよいのかでは、次の行動が違います。it-learning-appでは、試験日と学習可能時間から計画を作り、問題演習で見えた弱点に合わせて次の学習を考えられます。</p><Link href={cta("mid")} className="mt-8 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-slate-900">無料で学習計画を作る</Link></div></section>

    <section className="mx-auto max-w-5xl px-6 py-16"><h2 className="text-3xl font-bold">よくある質問</h2><div className="mt-8 space-y-4">{faq.map(x => <details key={x.q} className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-bold">{x.q}</summary><p className="mt-3 leading-7 text-slate-600">{x.a}</p></details>)}</div><div className="mt-12 rounded-2xl bg-blue-50 p-8 text-center"><h2 className="text-2xl font-bold">受験日を変える前に、残り日数でできることを確認</h2><p className="mx-auto mt-3 max-w-2xl text-slate-600">試験日・平日と休日の学習時間から、自分向けの学習計画を作ってみましょう。</p><Link href={cta("bottom")} className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white">無料で自分専用の学習計画を作る</Link></div><p className="mt-10 text-sm leading-6 text-slate-500">出典：IPA「CBT方式で実施するITパスポート試験、情報セキュリティマネジメント試験及び基本情報技術者試験における2026年5月以降の試験実施について」（最終更新2026年8月3日）。実際の申込・変更条件は必ずIPA公式サイトで最新情報をご確認ください。</p></section>
  </main>;
}
