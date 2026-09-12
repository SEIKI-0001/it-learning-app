import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-pass-rate-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "pass-rate-2026";

export const metadata: Metadata = {
  title: "ITパスポートの合格率は約50％｜初心者が落ちる理由と対策【2026年】",
  description: "2026年度のITパスポート合格率をIPA公式統計から解説。約2人に1人が合格する一方、学生と社会人で差が出る理由、初心者が落ちやすいポイント、合格へ向けた学習法をまとめます。",
  keywords: ["ITパスポート 合格率 2026", "ITパスポート 合格率", "ITパスポート 難易度", "ITパスポート 初心者", "ITパスポート 勉強法", "ITパスポート AI 学習"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポートの合格率は約50％｜初心者が落ちる理由と対策【2026年】", description: "IPA公式統計から2026年度の合格率を確認し、合格するための学習戦略を解説。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポートの合格率は約50％【2026年】", description: "合格率だけで難易度を判断せず、3分野の弱点から対策する方法を解説。" },
};

const faq = [
  { q: "2026年度のITパスポート合格率は？", a: "IPAの令和8年度4〜6月累計では、受験者53,411人、合格者27,020人で合格率50.6％です。社会人52.9％、学生42.5％でした。" },
  { q: "合格率が約50％なら簡単ですか？", a: "合格率だけで簡単とは判断できません。試験範囲が広く、総合評価だけでなく3分野それぞれにも基準があります。自分の弱点を把握して対策することが重要です。" },
  { q: "初心者は何から始めるべきですか？", a: "まず3分野を広く学び、早めに問題演習を始めてください。間違えた分野を特定し、復習後に別問題で確認する流れが効率的です。" },
];

const jsonLd = { "@context": "https://schema.org", "@graph": [
  { "@type": "Article", headline: metadata.title, description: metadata.description, url: pageUrl, inLanguage: "ja-JP", datePublished: "2026-08-21", dateModified: "2026-08-21", author: { "@type": "Organization", name: "it-learning-app" }, publisher: { "@type": "Organization", name: "it-learning-app" } },
  { "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }
] };

const CTA = ({ position }: { position: string }) => (
  <Link href={`/onboarding?source=${source}&position=${position}`} className="inline-flex rounded-xl bg-slate-900 px-6 py-3 font-bold text-white hover:bg-slate-700">
    無料で自分専用の学習計画を作る
  </Link>
);

export default function Page() {
  return <main className="min-h-screen bg-white text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="border-b"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold">it-learning-app</Link><CTA position="header" /></div></header>
    <article className="mx-auto max-w-3xl px-5 py-12">
      <p className="mb-3 text-sm font-semibold text-sky-700">2026年8月21日更新｜IPA公式統計を確認</p>
      <h1 className="text-4xl font-black leading-tight">ITパスポートの合格率は約50％。<br />でも「2人に1人だから簡単」ではない</h1>
      <p className="mt-6 text-lg leading-8 text-slate-600">2026年度4〜6月のITパスポート試験は、受験者53,411人に対して合格者27,020人。合格率は50.6％でした。数字だけを見ると半分が受かる試験ですが、重要なのは「自分がどこで失点するか」です。</p>
      <div className="mt-8"><CTA position="hero" /></div>

      <section className="mt-14"><h2 className="text-2xl font-bold">2026年度の合格率を公式データで見る</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">{[["全体","50.6％"],["社会人","52.9％"],["学生","42.5％"]].map(([k,v])=><div key={k} className="rounded-2xl bg-slate-50 p-6 text-center"><p className="text-sm text-slate-500">{k}</p><p className="mt-2 text-3xl font-black">{v}</p></div>)}</div>
        <p className="mt-5 leading-7 text-slate-600">出典はIPA「ITパスポート試験 試験結果 令和8年6月度」。4〜6月累計の数値です。合格率には社会人と学生で約10ポイントの差があります。</p>
      </section>

      <section className="mt-14"><h2 className="text-2xl font-bold">なぜ半分近くが不合格になるのか</h2>
        <div className="mt-6 space-y-5">
          <div><h3 className="font-bold">1. 範囲が広い</h3><p className="mt-2 leading-7 text-slate-600">ITだけでなく、経営、会計、法務、プロジェクト管理、セキュリティなどを横断して学びます。得意分野だけでは対応しにくい試験です。</p></div>
          <div><h3 className="font-bold">2. 「見たことがある」で止まりやすい</h3><p className="mt-2 leading-7 text-slate-600">用語を読んだだけでは、似た選択肢を見分けられません。問題を解き、なぜ他の選択肢が違うのかまで確認する必要があります。</p></div>
          <div><h3 className="font-bold">3. 苦手分野を放置する</h3><p className="mt-2 leading-7 text-slate-600">全体の点数だけを見ると、特定分野の弱さを見逃します。問題演習の結果を分野別に見て、弱点へ学習時間を再配分することが重要です。</p></div>
        </div>
      </section>

      <section className="mt-14 rounded-3xl bg-sky-50 p-7"><h2 className="text-2xl font-bold">合格率ではなく「自分の合格可能性」を上げる</h2><p className="mt-4 leading-7 text-slate-700">他人の合格率を何度見ても、自分の弱点は変わりません。まず問題を解き、ストラテジ・マネジメント・テクノロジのどこで失点しているかを把握します。その結果から次にやる学習を決める方が実践的です。</p><div className="mt-6"><CTA position="mid" /></div></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">初心者向け：合格へ近づく4ステップ</h2><ol className="mt-6 space-y-5 list-decimal pl-6 leading-7 text-slate-700"><li><strong>3分野の基礎を一通り見る。</strong>最初から完璧を目指さない。</li><li><strong>早めに問題を解く。</strong>正答率ではなく、誤答と迷った問題を記録する。</li><li><strong>弱点だけ戻って復習する。</strong>AIを使うなら、答えではなく「なぜ違うか」「似た用語との違い」を説明させる。</li><li><strong>別問題で再確認する。</strong>一度理解したつもりで終わらせず、再現できるかを見る。</li></ol></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">よくある質問</h2><div className="mt-6 space-y-6">{faq.map((x)=><div key={x.q}><h3 className="font-bold">{x.q}</h3><p className="mt-2 leading-7 text-slate-600">{x.a}</p></div>)}</div></section>

      <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-white"><h2 className="text-2xl font-bold">次に見るべき数字は、全国の合格率ではなく自分の弱点です。</h2><p className="mt-4 leading-7 text-slate-300">it-learning-appで、試験日・学習時間・現在の理解度から、自分向けの学習計画を作ってください。</p><div className="mt-6"><CTA position="bottom" /></div></section>
      <p className="mt-10 text-xs leading-6 text-slate-500">参考：独立行政法人情報処理推進機構（IPA）「ITパスポート試験 試験結果〔令和8年6月度〕」。統計値は2026年4〜6月累計。</p>
    </article>
  </main>;
}
