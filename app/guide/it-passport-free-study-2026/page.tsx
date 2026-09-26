import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-free-study-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "free-study-2026";

export const metadata: Metadata = {
  title: "ITパスポートは無料で合格できる？お金をかけない勉強法【2026年】",
  description: "ITパスポートは無料教材だけでも合格を目指せる？無料問題・AI・参考書の役割を整理し、お金をかける前に現在地を測って必要な教材だけ選ぶ勉強法を解説します。",
  keywords: ["ITパスポート 無料", "ITパスポート 無料 勉強", "ITパスポート 独学 無料", "ITパスポート 無料 アプリ", "ITパスポート お金かけない", "ITパスポート 勉強法"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポートは無料で合格できる？お金をかけない勉強法【2026年】", description: "教材を買う前に、まず現在地を測る。無料で始めるITパスポート対策を解説。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポートは無料で合格できる？", description: "無料問題・AI・参考書をどう使い分けるか。" },
};

const faq = [
  { q: "ITパスポートは無料の教材だけで合格できますか？", a: "可能性はあります。ただし、無料か有料かよりも、出題範囲を漏れなく確認し、初見問題で弱点を測定し、誤答を補強できる学習設計になっているかが重要です。" },
  { q: "最初から参考書や通信講座を買うべきですか？", a: "必須とは限りません。まず問題を解いて現在地を確認し、理解できない範囲が多い場合に参考書や講座を追加すると、不要な教材購入を避けやすくなります。" },
  { q: "無料問題を何度も解けば十分ですか？", a: "同じ問題の反復だけでは、答えを覚えたことで正答率が上がる場合があります。学習後は別の初見問題で再測定し、本当に理解できたか確認するのがおすすめです。" },
  { q: "AIだけでITパスポート対策はできますか？", a: "AIは用語の言い換え、比較、誤答理由の説明には便利ですが、学習範囲の網羅性や実力判定は別途管理した方が安全です。問題演習の結果と組み合わせて使うと効果的です。" },
];

function Cta({ position, label }: { position: string; label: string }) {
  return <Link href={`/onboarding?source=${source}&position=${position}`} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-700">{label} →</Link>;
}

export default function Page() {
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "Article", headline: "ITパスポートは無料で合格できる？お金をかけない勉強法【2026年】", description: metadata.description, mainEntityOfPage: pageUrl, datePublished: "2026-09-21", dateModified: "2026-09-21", publisher: { "@type": "Organization", name: "it-learning-app" } },
    { "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }
  ] };

  return <main className="min-h-screen bg-white text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="border-b border-slate-200"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-black">it-learning-app</Link><Cta position="header" label="無料で実力を測る" /></div></header>

    <section className="mx-auto max-w-4xl px-5 py-16 text-center md:py-24">
      <p className="text-sm font-bold text-blue-700">ITパスポート勉強法｜2026年版</p>
      <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">教材を買う前に、<br/>まず「足りない知識」を測る。</h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">ITパスポート対策は、最初から高額な講座を契約しなくても始められます。重要なのは「無料か有料か」より、今の自分に何が足りないかを把握できることです。</p>
      <div className="mt-8"><Cta position="hero" label="無料で現在地を確認する" /></div>
    </section>

    <article className="mx-auto max-w-3xl px-5 pb-20">
      <section className="rounded-3xl bg-slate-900 p-7 text-white"><p className="text-sm font-bold text-blue-300">結論</p><h2 className="mt-2 text-2xl font-black">無料で始める。必要になったところだけ、お金を使う。</h2><p className="mt-4 leading-8 text-slate-300">参考書、通信講座、動画、問題サイト。選択肢は多いですが、最初から全部そろえる必要はありません。まず初見問題で現在地を測り、理解できないテーマが見つかったら、その部分を補う教材を選ぶ方が合理的です。</p></section>

      <section className="mt-14"><h2 className="text-3xl font-black">無料学習で起きやすい3つの失敗</h2><div className="mt-7 space-y-4">{[
        ["問題を解くこと自体が目的になる", "正答数は増えても、どの分野が弱いのか分からないまま進みがちです。"],
        ["同じ問題の正答率を実力だと思う", "答えを覚えた問題では、本番で別の聞かれ方をしたときの実力を判断しにくくなります。"],
        ["無料教材を集めすぎる", "動画、サイト、PDFを増やすほど、次に何をやるか決める時間も増えます。教材数より学習順序が重要です。"],
      ].map(([h,p],i) => <div key={h} className="rounded-2xl border border-slate-200 p-6"><p className="text-sm font-bold text-blue-700">0{i+1}</p><h3 className="mt-1 text-xl font-black">{h}</h3><p className="mt-2 leading-7 text-slate-600">{p}</p></div>)}</div></section>

      <section className="mt-14"><h2 className="text-3xl font-black">お金をかける前の4ステップ</h2><ol className="mt-7 space-y-6">{[
        ["1", "初見問題で現在地を測る", "まず未回答の問題を解き、ストラテジ・マネジメント・テクノロジのどこで失点しているか確認します。"],
        ["2", "誤答の原因を分ける", "知らなかった、似た用語と混同した、計算方法が分からない、判断を誤った、など原因まで分けます。"],
        ["3", "不足部分だけ学ぶ", "無料解説やAIで十分ならそこで補強。理解が進まないテーマだけ参考書や講座を検討します。"],
        ["4", "別の初見問題で再測定する", "学習後に別問題で確認します。ここで正答できて初めて「できるようになった」と判断します。"],
      ].map(([n,h,p]) => <li key={n} className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-black text-white">{n}</span><div><h3 className="text-xl font-black">{h}</h3><p className="mt-2 leading-7 text-slate-600">{p}</p></div></li>)}</ol></section>

      <section className="mt-14 rounded-3xl bg-blue-50 p-7"><p className="text-sm font-bold text-blue-700">it-learning-appなら</p><h2 className="mt-2 text-2xl font-black">「次に何を勉強するか」を、問題履歴から決める。</h2><p className="mt-4 leading-8 text-slate-700">無料教材探しで一番難しいのは、教材そのものではなく学習の優先順位です。it-learning-appは、問題演習から現在地を測り、弱点を確認し、復習して再測定する流れを一つにつなげます。参考書を使う場合も、最初から全部読むのではなく必要なテーマの理解を深めるために使えます。</p><div className="mt-6"><Cta position="mid" label="無料で弱点から始める" /></div></section>

      <section className="mt-14"><h2 className="text-3xl font-black">無料・参考書・通信講座は「優劣」ではなく役割で選ぶ</h2><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[620px] border-collapse text-left"><thead><tr className="border-b-2 border-slate-900"><th className="p-3">手段</th><th className="p-3">向いている用途</th><th className="p-3">注意点</th></tr></thead><tbody>{[
        ["無料問題・学習アプリ", "現在地測定・演習・復習", "問題を解きっぱなしにしない"],
        ["AI", "用語説明・比較・誤答理由の理解", "出題範囲と実力は別に管理する"],
        ["参考書", "体系的理解・苦手論点の確認", "既知範囲まで読み直さない"],
        ["通信講座", "講義による理解・学習ペース管理", "必要性を確認してから選ぶ"],
      ].map((r) => <tr key={r[0]} className="border-b border-slate-200">{r.map((c) => <td key={c} className="p-3 leading-7">{c}</td>)}</tr>)}</tbody></table></div></section>

      <section className="mt-14"><h2 className="text-3xl font-black">2026年9月に始める人へ</h2><p className="mt-5 leading-8 text-slate-700">ITパスポート試験専用サイトは、IPAの案内により2026年9月20日21:00から9月28日10:00までシステムメンテナンスで停止中です。期間中は受験申込や試験日変更などができません。ただし、学習を始めることはできます。申込再開を待つ間に現在地を測っておけば、再開後に残り学習量から受験日を決めやすくなります。</p><p className="mt-4 text-sm leading-6 text-slate-500">出典：IPA「ITパスポート試験専用サイトのシステムメンテナンス等のお知らせ」（2026年9月7日公開）</p></section>

      <section className="mt-14"><h2 className="text-3xl font-black">よくある質問</h2><div className="mt-6 space-y-4">{faq.map((x) => <details key={x.q} className="rounded-2xl border border-slate-200 p-5"><summary className="cursor-pointer font-bold">{x.q}</summary><p className="mt-3 leading-7 text-slate-600">{x.a}</p></details>)}</div></section>

      <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-center text-white"><p className="text-sm font-bold text-blue-300">教材を選ぶ前に</p><h2 className="mt-2 text-3xl font-black">まず、あなたに必要な勉強を絞る。</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-slate-300">知っているところに時間もお金も使わない。現在地から合格までの学習を始めましょう。</p><div className="mt-7"><Link href={`/onboarding?source=${source}&position=bottom`} className="inline-flex rounded-xl bg-white px-7 py-4 font-bold text-slate-900">無料で自分専用の学習計画を作る →</Link></div></section>

      <p className="mt-10 text-sm leading-6 text-slate-500">本記事は2026年9月21日時点の情報をもとに作成しています。試験日程・申込情報は変更される場合があるため、受験時はIPA公式情報をご確認ください。</p>
    </article>
  </main>;
}