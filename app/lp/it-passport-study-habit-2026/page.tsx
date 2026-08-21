import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/lp/it-passport-study-habit-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "study-habit-2026";

export const metadata: Metadata = {
  title: "ITパスポートの勉強が続かない人へ｜挫折しない学習習慣の作り方【2026年】",
  description: "ITパスポートの勉強が続かない人向けに、毎日の学習量を小さく固定し、問題演習と弱点復習を習慣化する方法を解説。無料で自分専用の学習計画も作れます。",
  keywords: ["ITパスポート 勉強 続かない", "ITパスポート 挫折", "ITパスポート モチベーション", "ITパスポート 学習習慣", "ITパスポート AI 学習", "ITパスポート 2026"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポートの勉強が続かない人へ｜挫折しない学習習慣", description: "やる気に頼らず、毎日やることを小さく固定するITパスポート学習法。", type: "website", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポートの勉強が続かない人へ【2026年】", description: "学習を再開しやすくする小さな習慣と弱点復習の仕組みを紹介。" },
};

const faq = [
  { q: "ITパスポートの勉強が三日坊主になります。どうすればいいですか？", a: "最初から長時間を目標にせず、10〜20分でも開始できる固定メニューを作るのがおすすめです。学習量より『次に何をするか迷わない状態』を先に作ります。" },
  { q: "毎日勉強しないと合格できませんか？", a: "毎日である必要はありません。確保できる曜日と時間を決め、問題演習と弱点復習を継続できる計画にすることが重要です。" },
  { q: "モチベーションがない日は何をすればいいですか？", a: "新しい範囲を進めるより、前回間違えた問題を数問だけ解くなど、開始負荷の低い復習に切り替えると学習を途切れさせにくくなります。" },
  { q: "2026年中に受験する場合の注意点はありますか？", a: "IPAはシステムリプレースに伴い2026年12月28日以降のCBT試験を一時休止予定と案内しています。会場によってはそれより前に試験実施が止まる場合があるため、年内受験なら早めに日程を確認してください。" },
];

const jsonLd = { "@context": "https://schema.org", "@graph": [
  { "@type": "WebPage", name: metadata.title, description: metadata.description, url: pageUrl, inLanguage: "ja-JP", datePublished: "2026-08-18", dateModified: "2026-08-18" },
  { "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) },
]};

const Cta = ({ position }: { position: string }) => (
  <Link href={`/onboarding?source=${source}&position=${position}`} className="inline-flex rounded-xl bg-slate-900 px-6 py-3 font-bold text-white hover:bg-slate-700">無料で続けられる学習計画を作る</Link>
);

export default function Page() {
  return <main className="min-h-screen bg-white text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="border-b border-slate-200"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold">it-learning-app</Link><Cta position="header" /></div></header>
    <article className="mx-auto max-w-3xl px-5 py-14">
      <p className="mb-3 text-sm font-bold text-slate-500">ITパスポート学習・2026年版</p>
      <h1 className="text-4xl font-black leading-tight tracking-tight">ITパスポートの勉強が続かない人へ<br />「やる気」に頼らない学習習慣の作り方</h1>
      <p className="mt-6 text-lg leading-8 text-slate-600">参考書を買ったのに開かなくなった。過去問を数日解いて止まった。そんなとき、必要なのは気合いではなく「次にやることが決まっている状態」です。学習を小さく固定し、できた量に応じて次の課題を調整します。</p>
      <div className="mt-8"><Cta position="hero" /></div>

      <section className="mt-16"><h2 className="text-2xl font-black">続かない原因は「意志の弱さ」ではなく、計画が重すぎることが多い</h2><p className="mt-4 leading-8 text-slate-700">「毎日2時間」「参考書を1章」「過去問100問」のような大きな単位だけを設定すると、忙しい日に開始できません。最低ラインを小さくして、余裕がある日に追加する方が再開しやすくなります。</p></section>

      <section className="mt-14"><h2 className="text-2xl font-black">まずは20分の固定メニューにする</h2><div className="mt-6 grid gap-4 sm:grid-cols-3">{[["5分","前回の誤答を確認"],["10分","問題を数問解く"],["5分","間違いの理由を確認"]].map(([t,d]) => <div key={t} className="rounded-2xl border border-slate-200 p-5"><p className="text-2xl font-black">{t}</p><p className="mt-2 text-slate-600">{d}</p></div>)}</div><p className="mt-5 leading-8 text-slate-700">20分できたらその日は合格。時間がある日は問題数を増やします。最初から上限を目標にせず、最低限の開始条件を低くするのがポイントです。</p></section>

      <section className="mt-14 rounded-3xl bg-slate-50 p-7"><h2 className="text-2xl font-black">学習を続ける4つのルール</h2><ol className="mt-5 space-y-4 text-slate-700"><li><b>1. 受験日を先に決める：</b>期限がなければ学習計画も決まりません。</li><li><b>2. 曜日ごとの最低量を決める：</b>「時間があれば」ではなく、平日20分・休日60分など現実的な量にします。</li><li><b>3. 正解数より弱点を記録する：</b>間違えたテーマが、次回の復習メニューになります。</li><li><b>4. 遅れたら計画を捨てずに更新する：</b>できなかった分を翌日に全部上乗せせず、残り日数から再配分します。</li></ol></section>

      <section className="mt-14"><h2 className="text-2xl font-black">AIは「勉強を代わりにする」のではなく、再開を速くする</h2><p className="mt-4 leading-8 text-slate-700">学習が止まりやすいのは、分からない用語を調べ続けたり、次に復習する場所を探したりするときです。AIには「この選択肢が違う理由を初心者向けに説明」「似た用語を2つだけ比較」「同じ論点の確認問題を1問」と依頼し、自分は問題を解くことに時間を使います。</p></section>

      <section className="mt-14 border-y border-slate-200 py-10"><h2 className="text-2xl font-black">2026年中に受験するなら、日程を先に確認</h2><p className="mt-4 leading-8 text-slate-700">IPAは、システムリプレースに伴い2026年12月28日以降のITパスポートCBT試験を一時休止予定と案内しています。会場によっては12月27日より前に試験実施が止まる場合もあります。現行シラバスはVer.6.5です。年内受験を考えているなら、学習完了を待たずに受験可能日を確認して逆算しましょう。</p><div className="mt-4 flex flex-wrap gap-4 text-sm font-bold"><a className="underline" href="https://www.ipa.go.jp/shiken/2026/cbt-202605-jisshi.html" target="_blank" rel="noreferrer">IPA：2026年5月以降の試験実施</a><a className="underline" href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" target="_blank" rel="noreferrer">IPA：試験要綱・シラバス</a></div></section>

      <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-white"><p className="text-sm font-bold text-slate-300">it-learning-app</p><h2 className="mt-2 text-3xl font-black">毎回「今日は何をする？」から考えない。</h2><p className="mt-4 leading-8 text-slate-200">試験日と確保できる時間を決め、問題演習で見つかった弱点を次の学習につなげる。まずは自分用の計画を作って、今日の1回を始めましょう。</p><div className="mt-6"><Cta position="mid" /></div></section>

      <section className="mt-14"><h2 className="text-2xl font-black">よくある質問</h2><div className="mt-6 space-y-6">{faq.map((x) => <div key={x.q}><h3 className="font-bold">{x.q}</h3><p className="mt-2 leading-7 text-slate-600">{x.a}</p></div>)}</div></section>
      <div className="mt-14 text-center"><Cta position="bottom" /><p className="mt-3 text-sm text-slate-500">学習を再開するなら、まず今日やる量を決めるところから。</p></div>
    </article>
  </main>;
}
