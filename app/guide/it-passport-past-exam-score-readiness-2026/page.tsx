import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-past-exam-score-readiness-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "past-exam-score-readiness-2026";

export const metadata: Metadata = {
  title: "ITパスポート過去問で6割・7割なら受けていい？受験前チェック5項目【2026年】",
  description: "ITパスポートの過去問で6割・7割取れたら本番を受けていい？IRT方式と分野別基準を踏まえ、正答率だけに頼らず受験準備を判断する5項目を解説します。",
  keywords: ["ITパスポート 過去問 6割", "ITパスポート 過去問 7割", "ITパスポート 過去問 何割", "ITパスポート 合格点", "ITパスポート 受験 目安", "ITパスポート 2026"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポート過去問で6割・7割なら受けていい？", description: "正答率だけでは決めない。受験前に確認したい5項目を整理。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポート過去問で6割・7割なら受けていい？", description: "IRT方式と3分野の基準を踏まえ、受験タイミングを判断する方法。" },
};

const checks = [
  ["01", "直近の問題を初見で解いたか", "同じ問題を何周もした後の正答率は、答えを覚えた影響を受けます。受験判断には、まだ解いていない年度や問題セットでの結果も使いましょう。"],
  ["02", "3分野すべてに穴がないか", "合格には総合評価点だけでなく、ストラテジ・マネジメント・テクノロジの各分野にも基準があります。総合正答率だけで判断せず、分野別の弱点を確認します。"],
  ["03", "『迷って当たった問題』を数えたか", "正解でも根拠を説明できなかった問題は弱点候補です。不正解だけでなく、二択で迷った問題も復習対象にすると本番のブレを減らせます。"],
  ["04", "100問・120分を意識した演習をしたか", "短いセットで高得点でも、長時間では集中力や時間配分が変わります。本番前にはまとまった問題数を時間を測って解きましょう。"],
  ["05", "弱点を復習した後、別問題で再確認したか", "解説を読んだ直後に同じ問題を解くだけでは定着を判断できません。別問題で同じ論点を解けるかを確認してから受験判断につなげます。"],
];

const faq = [
  { q: "過去問で6割なら合格できますか？", a: "6割という正答率だけで合否を断定することはできません。ITパスポートはIRT方式で評価され、総合評価点600点以上に加えて3分野それぞれ300点以上が必要です。初見問題・分野別の状態・迷った問題も含めて判断しましょう。" },
  { q: "7割取れていれば安全ですか？", a: "7割でも『必ず安全』とは言えません。繰り返し解いた問題での7割なのか、初見問題での7割なのかでも意味が異なります。安定性と分野別の穴を確認することが重要です。" },
  { q: "過去問は何回解けばいいですか？", a: "回数そのものより、誤答原因を理解し、別問題で同じ知識を使える状態になったかを重視してください。" },
];

export default function Page() {
  const cta = (position: string) => `/onboarding?source=${source}&position=${position}`;
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: metadata.title, description: metadata.description, mainEntityOfPage: pageUrl, datePublished: "2026-08-25", dateModified: "2026-08-25", publisher: { "@type": "Organization", name: "it-learning-app" } };
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) };

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold">it-learning-app</Link><Link href={cta("header")} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">無料で学習計画を作る</Link></div></header>

    <section className="mx-auto max-w-4xl px-5 py-16 sm:py-20">
      <p className="mb-4 text-sm font-semibold text-indigo-700">2026年版｜受験タイミング判断ガイド</p>
      <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">過去問で6割・7割。<br />もう本番を受けていい？</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">正答率だけで受験日を決めるのは危険です。ITパスポートはIRT方式で評価され、3分野それぞれにも基準があります。受験前に確認したい5項目で、今の状態を整理します。</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link href={cta("hero")} className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white">無料で弱点から学習計画を作る</Link><a href="#check" className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold">5項目を見る</a></div>
    </section>

    <section className="border-y bg-white"><div className="mx-auto max-w-4xl px-5 py-12"><h2 className="text-2xl font-bold">まず知っておきたい：『6割正解＝600点』ではない</h2><p className="mt-4 leading-8 text-slate-700">ITパスポートの合格基準は、総合評価点600/1,000点以上、かつストラテジ・マネジメント・テクノロジの各分野で300/1,000点以上です。評価にはIRT（項目応答理論）が使われるため、単純な正答数と評価点は同じではありません。</p><p className="mt-4 leading-8 text-slate-700">だからこそ、過去問の正答率は有用な目安として使いつつ、数字1つで合否を予測しないことが重要です。</p></div></section>

    <section id="check" className="mx-auto max-w-4xl px-5 py-16"><h2 className="text-3xl font-bold">受験前チェック5項目</h2><p className="mt-3 text-slate-600">6割・7割という数字より、次の5点を確認してください。</p><div className="mt-8 space-y-4">{checks.map(([n,t,d]) => <article key={n} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="text-sm font-bold text-indigo-600">CHECK {n}</div><h3 className="mt-1 text-xl font-bold">{t}</h3><p className="mt-3 leading-7 text-slate-600">{d}</p></article>)}</div></section>

    <section className="bg-indigo-950 text-white"><div className="mx-auto max-w-4xl px-5 py-14"><h2 className="text-3xl font-bold">点数を見るだけでなく、「次に何を直すか」を決める</h2><p className="mt-4 max-w-2xl leading-8 text-indigo-100">たとえば65%だったなら、残り35%を全部勉強し直す必要はありません。知識不足、用語の混同、計算ミス、問題文の読み違いに分け、再発しやすい弱点から優先します。it-learning-appでは、学習状況から次に取り組む内容を整理できます。</p><Link href={cta("mid")} className="mt-7 inline-block rounded-xl bg-white px-6 py-3 font-bold text-indigo-950">無料で自分専用の学習計画を作る</Link></div></section>

    <section className="mx-auto max-w-4xl px-5 py-16"><h2 className="text-3xl font-bold">おすすめの判断フロー</h2><ol className="mt-7 grid gap-4 sm:grid-cols-2"><li className="rounded-xl bg-white p-5"><b>1. 初見問題を解く</b><p className="mt-2 text-slate-600">現在地をできるだけ素直に測る。</p></li><li className="rounded-xl bg-white p-5"><b>2. 分野別に見る</b><p className="mt-2 text-slate-600">総合点に隠れた弱点を探す。</p></li><li className="rounded-xl bg-white p-5"><b>3. 誤答＋迷った正解を復習</b><p className="mt-2 text-slate-600">偶然の正解も弱点候補にする。</p></li><li className="rounded-xl bg-white p-5"><b>4. 別問題で再判定</b><p className="mt-2 text-slate-600">答えの暗記ではなく理解を確認する。</p></li></ol></section>

    <section className="border-t bg-white"><div className="mx-auto max-w-4xl px-5 py-14"><h2 className="text-3xl font-bold">よくある質問</h2><div className="mt-7 space-y-6">{faq.map((x) => <div key={x.q}><h3 className="font-bold">{x.q}</h3><p className="mt-2 leading-7 text-slate-600">{x.a}</p></div>)}</div><p className="mt-8 text-sm text-slate-500">参考：IPA「ITパスポート試験 試験内容・出題範囲」「ITパスポート試験 FAQ」。最新の試験情報は必ずIPA公式案内をご確認ください。</p></div></section>

    <section className="mx-auto max-w-4xl px-5 py-16 text-center"><h2 className="text-3xl font-bold">「何割取れたか」から、「次に何をするか」へ。</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">受験日と今の学習状況から、残り期間の学習を組み立てます。</p><Link href={cta("bottom")} className="mt-7 inline-block rounded-xl bg-indigo-600 px-7 py-3 font-bold text-white">無料で自分専用の学習計画を作る</Link></section>
  </main>;
}
