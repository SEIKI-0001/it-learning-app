import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/lp/it-passport-retry-study-plan-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "retry-study-plan-2026";

export const metadata: Metadata = {
  title: "ITパスポートに落ちたら何をする？再受験の勉強法【2026年】",
  description: "ITパスポートに落ちた後、同じ勉強を繰り返す前にやるべきことを解説。総合点・3分野の結果から弱点を特定し、再受験までの学習計画を立て直します。",
  keywords: ["ITパスポート 落ちた","ITパスポート 再受験","ITパスポート 不合格","ITパスポート 再受験 勉強法","ITパスポート 弱点","ITパスポート AI 学習"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポートに落ちたら何をする？再受験の勉強法【2026年】", description: "同じ勉強を繰り返さず、結果から弱点を特定して再受験プランを作る。", type: "website", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポート再受験の勉強法", description: "不合格後の結果を、次の合格に使うための立て直し方。" },
};

const faq = [
  { q: "ITパスポートに落ちたら、参考書を最初からやり直すべきですか？", a: "一律に最初から戻るより、総合結果と3分野の結果、迷った論点を見て不足部分を優先する方が効率的です。基礎知識そのものが不足している分野だけ教材へ戻ります。" },
  { q: "前回の点数は次回に持ち越せますか？", a: "ITパスポートは1回の試験で合格基準を満たす必要があります。前回の結果は学習診断として使い、次回は改めて試験全体に備えます。" },
  { q: "再受験では過去問を何周すればよいですか？", a: "周回数より、初見または別問題でも同じ論点を解けるかを確認してください。同じ問題の答えを覚えただけの状態を避けることが重要です。" },
  { q: "AIは再受験対策にどう使えますか？", a: "間違えた選択肢を選んだ理由の分析、似た用語の比較、弱点論点の類題作成などに使えます。最後は必ず自力で別問題を解いて定着を確認します。" },
];

const jsonLd = { "@context":"https://schema.org", "@graph":[
  { "@type":"WebPage", name:"ITパスポートに落ちたら何をする？再受験の勉強法【2026年】", description:metadata.description, url:pageUrl, inLanguage:"ja-JP", datePublished:"2026-08-31", dateModified:"2026-08-31" },
  { "@type":"SoftwareApplication", name:"it-learning-app", applicationCategory:"EducationalApplication", operatingSystem:"Web", url:siteUrl },
  { "@type":"FAQPage", mainEntity:faq.map(x=>({"@type":"Question",name:x.q,acceptedAnswer:{"@type":"Answer",text:x.a}})) }
]};

const cta = (position: string) => `/onboarding?source=${source}&position=${position}`;

export default function Page() {
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}} />
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold text-blue-700">it-learning-app</Link><Link href={cta("header")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">再受験プランを無料で作る</Link></div></header>

    <article className="mx-auto max-w-4xl px-5 py-12">
      <div className="mb-4 text-sm font-semibold text-blue-700">ITパスポート再受験対策｜2026年8月31日</div>
      <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">ITパスポートに落ちたら、<br/><span className="text-blue-700">同じ勉強をもう一度しない。</span></h1>
      <p className="mt-6 text-lg leading-8 text-slate-600">不合格だった結果には、次に合格するための情報があります。参考書を最初から読み直す前に、<strong>どの分野・どの間違い方で点を失ったか</strong>を整理し、再受験までの時間をそこへ配分します。</p>
      <div className="mt-8 rounded-2xl bg-blue-50 p-6"><p className="font-bold">再受験で変えるのは「勉強量」より「配分」</p><p className="mt-2 leading-7">結果を分解 → 弱点を特定 → 必要な部分だけ復習 → 別問題で再測定。この4ステップで次の学習を決めます。</p></div>
      <Link href={cta("hero")} className="mt-8 block rounded-xl bg-blue-600 px-6 py-4 text-center text-lg font-bold text-white">無料で再受験の学習計画を作る →</Link>

      <section className="mt-14"><h2 className="text-2xl font-bold">まず見るのは「あと何点」だけではない</h2><p className="mt-4 leading-8 text-slate-700">ITパスポートは総合評価だけでなく、ストラテジ・マネジメント・テクノロジの各分野にも評価基準があります。総合結果だけを見て「あと少しだった」と判断せず、3分野のどこに穴があったかを確認します。</p><p className="mt-4 leading-8 text-slate-700">また評価はIRT方式です。過去問の正答率と本番の評価点を単純に置き換えるのではなく、前回の結果は<strong>次の学習配分を決める診断データ</strong>として使います。</p></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">不合格後にやる4ステップ</h2><div className="mt-6 grid gap-4">{[
        ["1. 3分野の結果を並べる","総合点だけでなく、ストラテジ・マネジメント・テクノロジを横並びで確認します。最も低い分野だけでなく、合格基準付近の分野も要注意です。"],
        ["2. 間違い方を分類する","知らなかった／似た用語を混同した／計算で詰まった／二択で迷った、のように原因を付けます。迷って当たった問題も弱点候補です。"],
        ["3. 弱点だけ教材へ戻る","すべてをゼロからやり直さず、原因が知識不足だった論点を優先します。混同型なら似た概念を比較して違いを説明できる状態にします。"],
        ["4. 別問題で再測定する","同じ過去問の答えを覚えた状態ではなく、別年度・類題でも解けるか確認します。解けなければ再度復習し、解ければ次の弱点へ進みます。"]
      ].map(([h,p])=><div key={h} className="rounded-2xl border bg-white p-6"><h3 className="text-xl font-bold text-blue-700">{h}</h3><p className="mt-3 leading-7 text-slate-600">{p}</p></div>)}</div></section>

      <section className="mt-14 rounded-2xl bg-slate-900 p-7 text-white"><h2 className="text-2xl font-bold">AIは「なぜ間違えたか」の分析に使う</h2><p className="mt-4 leading-8 text-slate-200">たとえば「RTOとRPOを比較して」「この選択肢を選んだ考え方のどこが違う？」「この論点で条件を変えた問題を作って」と質問します。正解を読むだけでなく、自分の誤解を修正するために使うのがポイントです。</p></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">2026年内に再受験するなら、日程も先に確認</h2><p className="mt-4 leading-8 text-slate-700">IPAはシステムリプレースに伴い、2026年12月28日以降のCBT試験を一時休止する予定です。試験会場によっては12月27日より前に休止する場合もあります。年内の再受験を考えるなら、学習が終わってから日程を見るのではなく、受験可能日を確認して残り日数から逆算します。</p><a href="https://www.ipa.go.jp/shiken/mousikomi/cbt_ip.html" target="_blank" rel="noreferrer" className="mt-4 inline-block font-semibold text-blue-700 underline">IPAの最新試験情報を確認する</a></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">再受験までの「次にやること」を自動で整理する</h2><p className="mt-4 leading-8 text-slate-700">不合格後に難しいのは、教材不足より「どこへ戻るか」「いつ再テストするか」「残り日数をどう配分するか」の判断です。it-learning-appは、試験日と学習状況をもとに、弱点確認から次の学習へつなげるITパスポート学習支援アプリです。</p><Link href={cta("mid")} className="mt-6 block rounded-xl bg-blue-600 px-6 py-4 text-center text-lg font-bold text-white">無料で再受験プランを作る →</Link></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">よくある質問</h2><div className="mt-6 space-y-4">{faq.map(x=><details key={x.q} className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-bold">{x.q}</summary><p className="mt-3 leading-7 text-slate-600">{x.a}</p></details>)}</div></section>

      <section className="mt-14 rounded-3xl bg-blue-700 p-8 text-center text-white"><h2 className="text-2xl font-bold">前回の結果を、次の学習計画に変える。</h2><p className="mx-auto mt-3 max-w-2xl text-blue-100">試験日と今の弱点から、再受験までに何をやるか整理してみてください。</p><Link href={cta("bottom")} className="mt-6 inline-block rounded-xl bg-white px-7 py-4 font-bold text-blue-700">無料で再受験の学習計画を作る</Link></section>

      <p className="mt-10 text-xs leading-6 text-slate-500">※ 試験日程・合格基準等は受験前にIPA公式情報で最新内容をご確認ください。本ページは合格を保証するものではありません。</p>
    </article>
  </main>;
}