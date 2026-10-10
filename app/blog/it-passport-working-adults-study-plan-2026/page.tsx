import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/blog/it-passport-working-adults-study-plan-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "working-adults-study-plan-2026";

export const metadata: Metadata = {
  title: "社会人のITパスポート勉強法｜忙しくても続く平日30分の学習計画【2026年】",
  description: "仕事が忙しい社会人向けに、ITパスポートを平日30分＋休日の学習で進める具体的な勉強法を解説。スキマ時間、過去問、弱点復習、AI活用まで、続けやすい学習計画を紹介します。",
  keywords: ["ITパスポート 社会人 勉強法", "ITパスポート 社会人", "ITパスポート 平日 30分", "ITパスポート 勉強時間 社会人", "ITパスポート AI 学習", "ITパスポート 2026"],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "社会人のITパスポート勉強法｜平日30分で続ける学習計画",
    description: "忙しい社会人向け。平日30分を基礎・問題演習・弱点復習に分けて、試験日まで学習を続ける方法を解説。",
    type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP",
  },
  twitter: { card: "summary_large_image", title: "社会人のITパスポート勉強法【2026年】", description: "仕事がある日でも続けやすい、平日30分＋休日のITパスポート学習計画。" },
};

const faq = [
  { q: "社会人は毎日何時間勉強すればいいですか？", a: "一律の必要時間はありません。まず試験日を決め、平日と休日に現実的に確保できる時間から逆算する方が続けやすくなります。平日は30分でも、問題演習と弱点復習を継続することを優先しましょう。" },
  { q: "平日30分だけでも意味がありますか？", a: "あります。30分を『10分復習・15分問題演習・5分誤答確認』のように目的別に分けると、短時間でも学習サイクルを回せます。休日にまとまった演習時間を加えるとさらに進めやすくなります。" },
  { q: "通勤時間は何を勉強すればいいですか？", a: "用語確認や短い問題演習など、中断しやすい学習に向いています。計算問題や100問通し演習など集中が必要な内容は、自宅や休日に分けるのがおすすめです。" },
  { q: "AIはどう使えばいいですか？", a: "答えを先に聞くより、間違えた理由の説明、似た用語の比較、短い確認問題の作成に使うと弱点復習を効率化できます。" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "BlogPosting", headline: "社会人のITパスポート勉強法｜忙しくても続く平日30分の学習計画【2026年】", description: metadata.description, url: pageUrl, inLanguage: "ja-JP", datePublished: "2026-08-17", dateModified: "2026-08-17" },
    { "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) },
  ],
};

const Cta = ({ position }: { position: string }) => (
  <Link href={`/onboarding?source=${source}&position=${position}`} className="inline-flex rounded-xl bg-slate-900 px-6 py-3 font-bold text-white hover:bg-slate-700">
    無料で自分専用の学習計画を作る
  </Link>
);

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold">it-learning-app</Link><Cta position="header" /></div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-14">
        <p className="mb-3 text-sm font-bold text-slate-500">ITパスポート勉強法・2026年版</p>
        <h1 className="text-4xl font-black leading-tight tracking-tight">社会人のITパスポート勉強法<br />忙しくても続く「平日30分」の学習計画</h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">仕事が終わってから毎日2時間勉強する計画は、続かなければ意味がありません。社会人のITパスポート対策では、まず受験日を決め、平日に確保できる短い時間と休日のまとまった時間を役割分担するのが現実的です。</p>
        <div className="mt-8"><Cta position="hero" /></div>

        <section className="mt-16">
          <h2 className="text-2xl font-black">社会人が挫折しやすいのは「勉強時間」より「毎日何をするか」</h2>
          <p className="mt-4 leading-8 text-slate-700">「今日は参考書を読むべきか、問題を解くべきか」を仕事後に毎回考えると、学習開始までの負担が増えます。そこで平日の30分を固定フォーマットにします。</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[['10分','前回の誤答を復習'],['15分','問題を解く'],['5分','迷った理由を記録']].map(([t,d]) => <div key={t} className="rounded-2xl border border-slate-200 p-5"><p className="text-2xl font-black">{t}</p><p className="mt-2 text-slate-600">{d}</p></div>)}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black">平日と休日で役割を変える</h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-3 bg-slate-50 p-4 font-bold"><span>時間</span><span>向いている学習</span><span>避けたいこと</span></div>
            <div className="grid grid-cols-3 border-t p-4"><span>通勤・スキマ</span><span>用語、短い問題</span><span>長い計算</span></div>
            <div className="grid grid-cols-3 border-t p-4"><span>平日30分</span><span>演習＋誤答復習</span><span>教材を探し続ける</span></div>
            <div className="grid grid-cols-3 border-t p-4"><span>休日60〜120分</span><span>分野別・本番形式演習</span><span>読むだけの復習</span></div>
          </div>
        </section>

        <section className="mt-14 rounded-3xl bg-slate-50 p-7">
          <h2 className="text-2xl font-black">4週間の基本サイクル</h2>
          <ol className="mt-5 space-y-4 text-slate-700">
            <li><b>1週目：</b>ストラテジ・マネジメント・テクノロジの全体像をつかむ。</li>
            <li><b>2週目：</b>問題演習を増やし、間違いが多いテーマを特定する。</li>
            <li><b>3週目：</b>弱点テーマを優先して復習し、別問題で再確認する。</li>
            <li><b>4週目：</b>休日にまとまった問題演習を行い、次の4週間の重点分野を決める。</li>
          </ol>
          <p className="mt-5 text-sm leading-6 text-slate-600">受験日までの期間に応じてこのサイクルを繰り返します。全員に同じ期間・学習量を当てはめるのではなく、理解度に応じて配分を変えることが重要です。</p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black">AIは「時間を増やす」のではなく「迷う時間を減らす」ために使う</h2>
          <p className="mt-4 leading-8 text-slate-700">社会人にとって大きなロスは、分からない用語を何十分も検索することです。AIには「この選択肢が違う理由を初心者向けに説明して」「AとBの違いを表にして」「数字だけ変えた類題を1問作って」のように依頼します。答えを丸写しせず、自分で解いた後の説明役として使います。</p>
        </section>

        <section className="mt-14 border-l-4 border-slate-900 pl-6">
          <h2 className="text-2xl font-black">2026年受験なら、受験日を先に決める</h2>
          <p className="mt-4 leading-8 text-slate-700">IPAはシステムリプレースのため、2026年12月28日以降にITパスポート試験を一時休止する予定と案内しています。試験会場によってはそれより前に実施が止まる場合があります。年内受験を考えている場合は、空席も踏まえて受験日を先に確保し、残り日数から逆算してください。</p>
          <p className="mt-3 text-sm"><a className="underline" href="https://www.ipa.go.jp/shiken/2026/cbt-202605-jisshi.html">IPA「2026年5月以降の試験実施について」</a></p>
        </section>

        <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-white">
          <h2 className="text-2xl font-black">仕事に合わせて、最初から続けられる計画にする</h2>
          <p className="mt-4 leading-7 text-slate-200">it-learning-appでは、試験日や学習可能時間を起点に、今日やることを整理できます。計画を作ること自体に時間を使わず、問題を解く時間を増やしましょう。</p>
          <div className="mt-6"><Link href={`/onboarding?source=${source}&position=mid`} className="inline-flex rounded-xl bg-white px-6 py-3 font-bold text-slate-900">無料で自分専用の学習計画を作る</Link></div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-black">よくある質問</h2>
          <div className="mt-6 space-y-6">{faq.map((x) => <div key={x.q}><h3 className="font-bold">{x.q}</h3><p className="mt-2 leading-7 text-slate-600">{x.a}</p></div>)}</div>
        </section>

        <div className="mt-16 text-center"><p className="mb-5 text-lg font-bold">試験日から、あなたの「今日やること」を決める</p><Cta position="bottom" /></div>
      </article>
    </main>
  );
}
