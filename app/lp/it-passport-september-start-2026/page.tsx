import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/lp/it-passport-september-start-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "september-start-2026";

export const metadata: Metadata = {
  title: "9月からITパスポートを始める人へ｜年内合格の学習計画【2026年】",
  description: "2026年9月からITパスポート学習を始める人向けに、年内受験へ向けた12週間の勉強計画を解説。基礎、問題演習、弱点復習、本番対策を試験日から逆算します。",
  keywords: ["ITパスポート 9月から", "ITパスポート 年内合格", "ITパスポート 3ヶ月", "ITパスポート 勉強計画", "ITパスポート 2026", "ITパスポート AI 学習"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "9月からITパスポートを始める人へ｜年内合格の学習計画【2026年】", description: "9月開始から年内受験までを12週間に分けた実行プラン。", type: "website", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "9月から始めるITパスポート｜年内合格の12週間計画", description: "基礎→演習→弱点対策→本番演習を12週間に落とし込みます。" },
};

const phases = [
  ["1〜3週目", "3分野の全体像をつかむ", "最初から暗記を完成させようとせず、ストラテジ・マネジメント・テクノロジを一通り学びます。分からない用語には印を付け、まず全範囲に触れることを優先します。"],
  ["4〜6週目", "問題演習を増やす", "一問一答や公開問題を使い、知識を『見たことがある』状態から『問題で選べる』状態へ移します。正解でも迷った問題は復習対象に含めます。"],
  ["7〜9週目", "弱点へ時間を再配分する", "誤答を分野・論点・原因で整理し、弱い部分へ学習時間を寄せます。AIを使うなら、似た用語の比較や誤答理由の説明、類題作成に使います。"],
  ["10〜12週目", "本番形式で仕上げる", "100問・120分を意識した演習で時間配分と3分野の状態を確認します。新教材を増やすより、直近の誤答を減らすことを優先します。"],
];

const faq = [
  { q: "9月から始めて年内合格を目指せますか？", a: "必要な学習量は現在の知識や確保できる時間で変わります。ただし、受験日を先に決めて残り期間を基礎・演習・弱点復習・本番対策に分ければ、学習の優先順位は明確にできます。" },
  { q: "2026年はいつまで受験できますか？", a: "IPAはシステムリプレースに伴い、2026年12月28日以降のITパスポート試験を一時休止する予定と案内しています。会場や申込状況もあるため、年内受験を考える場合は早めに公式申込画面で候補日を確認してください。" },
  { q: "2027年度の新制度を待った方がいいですか？", a: "2026年中に資格が必要なら、未確定の新制度を待つより現行試験に合わせて学習する選択肢があります。IPAの2026年7月31日更新ページでは、新ITパスポートのシラバス案はまだ準備中です。" },
];

export default function Page() {
  const cta = (position: string) => `/onboarding?source=${source}&position=${position}`;
  const structuredData = { "@context": "https://schema.org", "@type": "WebPage", name: metadata.title, description: metadata.description, url: pageUrl };
  const faqData = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) };

  return <main className="min-h-screen bg-[#f7f7f4] text-[#1f2933]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }} />
    <header className="border-b border-black/10 bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><span className="font-bold">it-learning-app</span><Link href={cta("header")} className="rounded-lg bg-[#1f4d3e] px-4 py-2 text-sm font-semibold text-white">無料で計画を作る</Link></div></header>

    <section className="mx-auto max-w-5xl px-5 py-16 md:py-24"><p className="mb-4 text-sm font-semibold text-[#1f4d3e]">2026年9月スタート向け</p><h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">9月から始めても、<br />「何をやるか」で迷わない。</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-[#52606d]">年内受験を考えるなら、教材を探し続けるより先に受験候補日を置き、残り期間を逆算します。12週間を4段階に分ければ、今日やることが明確になります。</p><div className="mt-8 flex flex-wrap gap-3"><Link href={cta("hero")} className="rounded-lg bg-[#1f4d3e] px-6 py-3 font-semibold text-white">無料で自分専用の学習計画を作る</Link><a href="https://itee.ipa.go.jp/ipa/user/public/" className="rounded-lg border border-black/15 bg-white px-6 py-3 font-semibold" target="_blank" rel="noreferrer">IPAで受験日を確認</a></div></section>

    <section className="border-y border-black/10 bg-white"><div className="mx-auto max-w-5xl px-5 py-14"><h2 className="text-3xl font-bold">9月開始の12週間プラン</h2><div className="mt-8 grid gap-4 md:grid-cols-2">{phases.map(([week,title,body]) => <article key={week} className="rounded-xl border border-black/10 p-6"><p className="text-sm font-bold text-[#1f4d3e]">{week}</p><h3 className="mt-2 text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-[#52606d]">{body}</p></article>)}</div></div></section>

    <section className="mx-auto max-w-5xl px-5 py-16"><div className="grid gap-10 md:grid-cols-2"><div><h2 className="text-3xl font-bold">2026年は「受験日を先に決める」</h2><p className="mt-5 leading-8 text-[#52606d]">IPAは、システムリプレースに伴い2026年12月28日以降のITパスポート試験を一時休止する予定と案内しています。年内受験を考えているなら、勉強が終わるのを待つより、まず公式申込画面で受験可能日を確認する方が計画を作りやすくなります。</p><p className="mt-4 leading-8 text-[#52606d]">現行シラバスはVer.6.5です。2027年度から新試験制度が予定されていますが、IPAの2026年7月31日更新情報では、新ITパスポートのシラバス案はまだ準備中です。</p></div><div className="rounded-2xl bg-[#e8efe9] p-7"><h2 className="text-2xl font-bold">計画は毎週、弱点に合わせて変える</h2><p className="mt-4 leading-7">最初に作った予定を守ること自体が目的ではありません。問題を解いて弱点が分かったら、残り時間をそこへ再配分します。it-learning-appでは、試験日・学習可能時間・学習状況から「次に何をするか」を整理できます。</p><Link href={cta("mid")} className="mt-6 inline-block rounded-lg bg-[#1f4d3e] px-5 py-3 font-semibold text-white">無料で計画を作る</Link></div></div></section>

    <section className="bg-[#1f2933] text-white"><div className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-bold">9月の1日目にやること</h2><ol className="mt-7 grid gap-3 text-lg md:grid-cols-3"><li className="rounded-xl bg-white/10 p-5"><b>1.</b> 受験候補日を決める</li><li className="rounded-xl bg-white/10 p-5"><b>2.</b> 平日・休日の時間を決める</li><li className="rounded-xl bg-white/10 p-5"><b>3.</b> 3分野を少し解いて現在地を見る</li></ol></div></section>

    <section className="mx-auto max-w-3xl px-5 py-16"><h2 className="text-3xl font-bold">よくある質問</h2><div className="mt-7 divide-y divide-black/10">{faq.map((x) => <div key={x.q} className="py-6"><h3 className="font-bold">{x.q}</h3><p className="mt-3 leading-7 text-[#52606d]">{x.a}</p></div>)}</div></section>

    <section className="border-t border-black/10 bg-white"><div className="mx-auto max-w-3xl px-5 py-16 text-center"><h2 className="text-3xl font-bold">年内合格への計画を、今日作る。</h2><p className="mt-4 text-[#52606d]">試験日と使える時間を入力して、自分に必要な学習を整理しましょう。</p><Link href={cta("bottom")} className="mt-7 inline-block rounded-lg bg-[#1f4d3e] px-7 py-3 font-semibold text-white">無料で自分専用の学習計画を作る</Link></div></section>
  </main>;
}
