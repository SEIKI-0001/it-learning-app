import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-generative-ai-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "generative-ai-2026";

export const metadata: Metadata = {
  title: "ITパスポートに生成AIは出る？ChatGPT時代に押さえるAI頻出論点【2026年】",
  description: "ITパスポートでは生成AIも出題範囲です。生成AIの仕組み・活用例・ハルシネーション・著作権など、2026年受験者が押さえたいAI論点と効率的な勉強法を解説します。",
  keywords: ["ITパスポート 生成AI", "ITパスポート AI", "ITパスポート ChatGPT", "ITパスポート AI 出題", "ITパスポート 生成AI 問題", "ITパスポート AI 勉強"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポートに生成AIは出る？【2026年】", description: "生成AIの仕組み・活用・リスク。AI時代のITパスポート対策を整理。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポートに生成AIは出る？", description: "2026年受験者が押さえたいAI論点を整理。" },
};

const faq = [
  { q: "ITパスポートに生成AIは出題されますか？", a: "はい。IPAはITパスポート試験シラバスに生成AIの仕組み、活用例、留意事項などを追加し、2024年4月の試験から適用しています。" },
  { q: "ChatGPTの使い方を覚えれば十分ですか？", a: "十分ではありません。特定サービスの操作方法ではなく、生成AIの基本的な仕組み、活用領域、出力情報の誤りや偏り、著作権などの留意事項を理解することが重要です。" },
  { q: "AI分野だけを重点的に勉強すべきですか？", a: "ITパスポートはAI以外にも経営、法務、マネジメント、セキュリティ、ネットワークなど幅広い分野から出題されます。初見問題で自分の弱点を測り、AIが弱点なら重点化する方法が効率的です。" },
];

function Cta({ position, label = "無料でAI分野の実力を確認する" }: { position: string; label?: string }) {
  return <Link href={`/onboarding?source=${source}&position=${position}`} className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-6 py-3.5 font-bold text-white transition hover:bg-violet-700">{label} →</Link>;
}

export default function Page() {
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "Article", headline: metadata.title, description: metadata.description, mainEntityOfPage: pageUrl, datePublished: "2026-09-22", dateModified: "2026-09-22", publisher: { "@type": "Organization", name: "it-learning-app" } },
    { "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }
  ] };

  return <main className="min-h-screen bg-white text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="border-b border-slate-200"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-black">it-learning-app</Link><Cta position="header" /></div></header>

    <section className="mx-auto max-w-4xl px-5 py-16 text-center md:py-24">
      <p className="text-sm font-bold text-violet-700">2026年版｜AI・生成AI対策</p>
      <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">ITパスポートに<br/>「生成AI」は出る？</h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">出ます。しかも「ChatGPTを使ったことがある」だけでは対策になりません。仕組み・活用・リスクをセットで理解するのがポイントです。</p>
      <div className="mt-8"><Cta position="hero" label="無料で今の実力を測る" /></div>
    </section>

    <article className="mx-auto max-w-3xl px-5 pb-20">
      <section className="rounded-3xl bg-slate-900 p-7 text-white">
        <p className="text-sm font-bold text-violet-300">結論</p>
        <h2 className="mt-2 text-2xl font-black">生成AIは、すでにITパスポートの出題範囲。</h2>
        <p className="mt-4 leading-8 text-slate-300">IPAは2023年にシラバスへ生成AI関連の項目・用語例を追加し、2024年4月の試験から出題対象としました。現在のITパスポート試験シラバスはVer.6.5です。</p>
      </section>

      <section className="mt-14"><h2 className="text-3xl font-black">まず押さえたい生成AIの4論点</h2><div className="mt-7 grid gap-4 sm:grid-cols-2">{[
        ["01", "生成AIの仕組み", "AIが学習データをもとに文章・画像などを生成する技術であること。生成物を常に正解として扱わないことも重要です。"],
        ["02", "活用領域", "文章の要約・添削、アイデア提案、プログラミング、画像生成など。何に使えるかを具体例と結び付けます。"],
        ["03", "出力のリスク", "誤った情報、偏った情報、古い情報、出典不明の情報などが含まれる可能性を理解します。"],
        ["04", "著作権・安全利用", "学習に使うデータと生成されたデータの双方について、著作権などの観点から注意が必要です。"],
      ].map(([n,h,p]) => <div key={n} className="rounded-2xl border border-slate-200 p-6"><p className="text-sm font-black text-violet-600">{n}</p><h3 className="mt-2 text-xl font-black">{h}</h3><p className="mt-3 leading-7 text-slate-600">{p}</p></div>)}</div></section>

      <section className="mt-14"><h2 className="text-3xl font-black">「AI用語を全部暗記」はおすすめしない</h2><p className="mt-5 leading-8 text-slate-700">ITパスポートはAI専門試験ではありません。AI、経営戦略、法務、マネジメント、セキュリティ、ネットワークなどを横断して問う試験です。AIだけを深掘りしすぎると、ほかの弱点を放置することになります。</p><p className="mt-4 leading-8 text-slate-700">効率を上げるなら、まず初見問題でAI関連を含む現在地を測定します。間違えた論点だけ理解し直し、別の初見問題で本当に解けるようになったか確認します。</p></section>

      <section className="mt-14 rounded-3xl bg-violet-50 p-7"><p className="text-sm font-bold text-violet-700">おすすめの学習ループ</p><h2 className="mt-2 text-2xl font-black">測る → AIが弱点なら学ぶ → 別問題で再測定</h2><p className="mt-4 leading-8 text-slate-700">参考書を最初から全部読む前に、知っている範囲と知らない範囲を分ける。it-learning-appは問題履歴から弱点を見つけ、次に学ぶ場所を決めるための学習支援アプリです。</p><div className="mt-6"><Cta position="mid" label="無料で弱点から学習を始める" /></div></section>

      <section className="mt-14"><h2 className="text-3xl font-black">2027年度からITパスポートは変わる予定</h2><p className="mt-5 leading-8 text-slate-700">IPAは2027年度から新試験制度へ移行し、ITパスポートについても「ビジネスパーソンに求められるデジタルリテラシーとしての基礎知識及びマインド・スタンス」を評価する内容へ変更する予定です。2026年に受験する人は、現行シラバスを基準に学習してください。</p></section>

      <section className="mt-14"><h2 className="text-3xl font-black">よくある質問</h2><div className="mt-6 space-y-4">{faq.map((x) => <details key={x.q} className="rounded-2xl border border-slate-200 p-5"><summary className="cursor-pointer font-bold">{x.q}</summary><p className="mt-3 leading-7 text-slate-600">{x.a}</p></details>)}</div></section>

      <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-center text-white"><h2 className="text-3xl font-black">AIだけでなく、あなたの「本当の弱点」から始める。</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-slate-300">初見問題で現在地を測って、必要な範囲だけ学習。合格までの遠回りを減らしましょう。</p><div className="mt-7"><Link href={`/onboarding?source=${source}&position=bottom`} className="inline-flex rounded-xl bg-white px-7 py-4 font-bold text-slate-900">無料で自分専用の学習計画を作る →</Link></div></section>

      <p className="mt-10 text-sm leading-6 text-slate-500">出題範囲・制度は変更される場合があります。受験前にIPA公式の試験要綱・シラバスを確認してください。</p>
    </article>
  </main>;
}
