import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-self-study-stuck-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "self-study-stuck-2026";

export const metadata: Metadata = {
  title: "ITパスポート独学で受からない？勉強しても点数が伸びない人の見直し方【2026年】",
  description: "ITパスポートを独学しても点数が伸びない人向けに、勉強量を増やす前に見直したい3つのポイントと、弱点を特定して合格へ近づく学習手順を解説します。",
  keywords: ["ITパスポート 独学 受からない", "ITパスポート 勉強しても受からない", "ITパスポート 点数 伸びない", "ITパスポート 独学 無理", "ITパスポート 苦手", "ITパスポート 勉強法"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポート独学で受からない？点数が伸びないときの見直し方", description: "勉強時間を増やす前に、弱点の測り方を変える。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポート独学で受からない？", description: "点数が伸びないときの学習の見直し方。" },
};

const faq = [
  { q: "ITパスポートは独学でも合格できますか？", a: "独学でも合格は可能です。ただし、参考書を読むこと自体が目的になると、理解できている範囲にも時間を使いやすくなります。問題演習で現在地を測り、不足している論点へ学習を絞ることが重要です。" },
  { q: "過去問を繰り返しているのに点数が伸びないのはなぜですか？", a: "同じ問題を繰り返すと、論点を理解したのではなく答えを覚えて正解できる場合があります。未回答の問題で再測定し、初見でも判断できるかを確認してください。" },
  { q: "苦手分野は全部やり直すべきですか？", a: "分野全体ではなく、誤答が集中するテーマまで細かく特定する方が効率的です。例えばテクノロジ全体ではなく、ネットワークやデータベースなど具体的な論点単位で補強します。" },
];

function Cta({ position, label }: { position: string; label: string }) {
  return <Link href={`/onboarding?source=${source}&position=${position}`} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-700">{label} →</Link>;
}

export default function Page() {
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "Article", headline: metadata.title, description: metadata.description, mainEntityOfPage: pageUrl, datePublished: "2026-09-19", dateModified: "2026-09-19", publisher: { "@type": "Organization", name: "it-learning-app" } },
    { "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }
  ] };

  return <main className="min-h-screen bg-white text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="border-b border-slate-200"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-black">it-learning-app</Link><Cta position="header" label="無料で弱点を確認する" /></div></header>

    <section className="mx-auto max-w-4xl px-5 py-16 text-center md:py-24">
      <p className="text-sm font-bold text-blue-700">ITパスポート独学｜伸び悩み対策</p>
      <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">勉強しているのに、<br/>点数が伸びない。</h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">そんなとき、参考書をもう一周する前に確認したいことがあります。必要なのは勉強量の追加ではなく、「どこで失点しているか」の特定かもしれません。</p>
      <div className="mt-8"><Cta position="hero" label="無料で今の弱点を確認する" /></div>
    </section>

    <article className="mx-auto max-w-3xl px-5 pb-20">
      <section className="rounded-3xl bg-slate-900 p-7 text-white"><p className="text-sm font-bold text-blue-300">結論</p><h2 className="mt-2 text-2xl font-black">伸びないときは、「もう一周」より「別問題で測る」。</h2><p className="mt-4 leading-8 text-slate-300">参考書を読み、過去問を何周もしているのに点数が安定しないなら、学習量ではなく測定方法を見直します。初見問題で誤答を取り直し、弱点をテーマ単位まで絞ってから補強する方が、次にやることが明確になります。</p></section>

      <section className="mt-14"><h2 className="text-3xl font-black">独学が止まりやすい3つの状態</h2><div className="mt-7 space-y-4">{[
        ["01", "参考書を読むことが勉強の中心", "理解済みのページまで同じ密度で読み直すと、時間は増えても得点に直結しにくくなります。問題で不足箇所を先に探します。"],
        ["02", "同じ過去問の正答率を実力だと思う", "繰り返した問題では答えの記憶が混ざります。仕上がり確認には、まだ解いていない問題を使います。"],
        ["03", "『テクノロジが苦手』で止まる", "分野単位では広すぎます。ネットワーク、データベース、セキュリティなど、実際に誤答しているテーマまで分解します。"],
      ].map(([n,h,p]) => <div key={n} className="rounded-2xl border border-slate-200 p-6"><p className="text-sm font-black text-blue-700">{n}</p><h3 className="mt-1 text-xl font-black">{h}</h3><p className="mt-2 leading-7 text-slate-600">{p}</p></div>)}</div></section>

      <section className="mt-14"><h2 className="text-3xl font-black">点数が伸びないときの4ステップ</h2><ol className="mt-7 space-y-5">{[
        ["1", "未回答問題で現在地を測る", "まず答えを覚えていない問題を解きます。正答率だけでなく、どのテーマで誤答したかを残します。"],
        ["2", "誤答を『知らない・混同・判断ミス』に分ける", "知識不足なら参考書へ戻る。似た用語の混同なら比較して整理する。原因によって復習方法を変えます。"],
        ["3", "不足テーマだけ補強する", "参考書を最初から読み直さず、誤答に関連する範囲だけ確認します。必要なら図解やAIへの質問で理解を補います。"],
        ["4", "別の初見問題で再測定する", "同じ問題ではなく別問題で確認します。改善していれば次の弱点へ、残っていればもう一段深く原因を見ます。"],
      ].map(([n,h,p]) => <li key={n} className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 font-black text-white">{n}</span><div><h3 className="text-xl font-black">{h}</h3><p className="mt-2 leading-7 text-slate-600">{p}</p></div></li>)}</ol></section>

      <section className="mt-14 rounded-3xl bg-blue-50 p-7"><p className="text-sm font-bold text-blue-700">独学を「一人で管理する」必要はない</p><h2 className="mt-2 text-2xl font-black">次に何をやるかまで、学習データから決める。</h2><p className="mt-4 leading-8 text-slate-700">it-learning-appは、問題履歴から現在地・弱点・復習状況を捉え、次の学習につなげることを重視しています。参考書は理解のために使い、アプリ側で測定と学習順序を管理する。独学でも「今日は何をやればいい？」を減らす設計です。</p><div className="mt-6"><Cta position="mid" label="無料で弱点から学習を始める" /></div></section>

      <section className="mt-14"><h2 className="text-3xl font-black">独学で受かる人と、止まる人の違い</h2><p className="mt-5 leading-8 text-slate-700">ITパスポートは受験者の約半数が合格する一方、裏返せば受験者全員が簡単に通る試験ではありません。IPA公表の令和7年度実績では年間応募者307,266人、合格率48.6%でした。</p><p className="mt-4 leading-8 text-slate-700">差を作るのは「何時間やったか」だけではありません。自分の不足を測り、学ぶ範囲を変え、もう一度測る。このループを回せる状態を作ることが重要です。</p></section>

      <section className="mt-14"><h2 className="text-3xl font-black">よくある質問</h2><div className="mt-6 space-y-4">{faq.map((x) => <details key={x.q} className="rounded-2xl border border-slate-200 p-5"><summary className="cursor-pointer font-bold">{x.q}</summary><p className="mt-3 leading-7 text-slate-600">{x.a}</p></details>)}</div></section>

      <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-center text-white"><p className="text-sm font-bold text-blue-300">勉強量を増やす前に</p><h2 className="mt-2 text-3xl font-black">次に直す1か所を見つける。</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-slate-300">現在地を測って、あなたに必要な学習から始めましょう。</p><div className="mt-7"><Link href={`/onboarding?source=${source}&position=bottom`} className="inline-flex rounded-xl bg-white px-7 py-4 font-bold text-slate-900">無料で自分専用の学習計画を作る →</Link></div></section>

      <p className="mt-10 text-sm leading-6 text-slate-500">参考：IPA「令和7年度 iパスの年間応募者数等について」。2026年12月28日以降はシステムリプレースに伴う試験休止が予定されています。受験日程はIPA公式サイトで最新情報を確認してください。</p>
    </article>
  </main>;
}