import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/blog/it-passport-2027-new-syllabus-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "2027-new-syllabus-2026";

export const metadata: Metadata = {
  title: "2027年ITパスポート新シラバス案が公開｜何が変わる？2026年受験者も解説",
  description: "IPAが2026年8月31日に2027年度ITパスポート新試験のシラバス案Ver.0.1とサンプル問題を公開。3分野の変更点、AI・データ・セキュリティ強化、2026年中に受けるべき人を解説します。",
  keywords: ["ITパスポート 2027","ITパスポート 新シラバス","ITパスポート 新試験","ITパスポート 2027 変更","ITパスポート サンプル問題","ITパスポート AI","ITパスポート 2026"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "2027年ITパスポート新シラバス案が公開｜何が変わる？", description: "2026年8月31日、IPAが新ITパスポートのシラバス案Ver.0.1とサンプル問題を公開。受験者が今知るべき変更点を整理。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "2027年ITパスポート新シラバス案が公開", description: "ビジネス・テクノロジ・セキュリティ/倫理へ再編。2026年受験者はどうする？" },
};

const changes = [
  ["出題分野を再整理", "現行の「ストラテジ系・マネジメント系・テクノロジ系」から、「ビジネス・テクノロジ・セキュリティ／倫理」へ再整理される予定です。"],
  ["DXのマインド・スタンスを追加", "知識を覚えるだけでなく、DXで求められるマインド・スタンスに関する内容が新たに加わる予定です。"],
  ["データマネジメント基礎を追加", "AI活用の土台となるデータの整備・管理など、データマネジメントの基礎が追加される予定です。"],
  ["AI時代のセキュリティ・倫理を強化", "AIを安全かつ適切に活用するためのセキュリティ・倫理に関する出題が強化される予定です。"],
];

const faq = [
  { q: "2027年度からITパスポートは難しくなりますか？", a: "現時点で単純に難化すると断定はできません。IPAは出題構成や範囲の見直しを公表していますが、シラバス案Ver.0.1は今後変更される可能性があります。" },
  { q: "2026年中に受験する人も新シラバスを勉強すべきですか？", a: "2026年度は現行試験制度で実施される予定です。2026年中の受験を予定している場合は、まず現行シラバスを基準に学習してください。" },
  { q: "2027年度の試験時間と問題数は変わりますか？", a: "IPAが2026年3月31日に公表した検討状況では、ITパスポートは試験時間120分・100問の予定です。今後変更される可能性があるため最新情報も確認してください。" },
  { q: "今から勉強を始めるなら2026年と2027年のどちらを受けるべきですか？", a: "資格が必要な時期と現在の学習状況で判断します。2026年中に十分準備できるなら、制度変更を待つ必要はありません。2027年度受験なら新シラバス案を確認しながら準備しましょう。" },
];

const jsonLd = { "@context":"https://schema.org", "@graph":[
  { "@type":"BlogPosting", headline:"2027年ITパスポート新シラバス案が公開｜何が変わる？2026年受験者も解説", description:metadata.description, url:pageUrl, inLanguage:"ja-JP", datePublished:"2026-09-01", dateModified:"2026-09-01", publisher:{"@type":"Organization",name:"it-learning-app"} },
  { "@type":"FAQPage", mainEntity:faq.map(x=>({"@type":"Question",name:x.q,acceptedAnswer:{"@type":"Answer",text:x.a}})) }
]};

const cta = (position: string) => `/onboarding?source=${source}&position=${position}`;

export default function Page() {
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}} />
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold text-blue-700">it-learning-app</Link><Link href={cta("header")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">無料で学習計画を作る</Link></div></header>

    <article className="mx-auto max-w-4xl px-5 py-12">
      <div className="mb-4 text-sm font-semibold text-blue-700">速報・ITパスポート試験｜2026年9月1日</div>
      <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">2027年ITパスポート<br/><span className="text-blue-700">新シラバス案が公開。何が変わる？</span></h1>
      <p className="mt-6 text-lg leading-8 text-slate-600">IPAは2026年8月31日、2027年度から開始予定の新ITパスポート試験について、<strong>シラバス案Ver.0.1とサンプル問題</strong>を公開しました。これから受験する人が押さえたい変更点と、「2026年中に受けるか、2027年度まで待つか」の考え方を整理します。</p>
      <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6"><p className="font-bold">結論</p><p className="mt-2 leading-7">2027年度は「ビジネス・テクノロジ・セキュリティ／倫理」へ再整理され、DX、データマネジメント、AI時代のセキュリティ・倫理がより明確に扱われます。一方、2026年度は現行制度で終了予定です。年内受験できる人が、制度変更だけを理由に待つ必要はありません。</p></div>
      <Link href={cta("hero")} className="mt-8 block rounded-xl bg-blue-600 px-6 py-4 text-center text-lg font-bold text-white">受験時期から自分専用の学習計画を作る →</Link>

      <section className="mt-14"><h2 className="text-2xl font-bold">2026年8月31日、何が公開された？</h2><p className="mt-4 leading-8 text-slate-700">IPAは新試験制度向けの「ITパスポート試験 シラバス案 Ver.0.1」を公開しました。同日、新たな出題分野・出題形式を確認するためのサンプル問題も公開しています。新制度は2027年度から開始予定です。</p><p className="mt-4 leading-8 text-slate-700">ただし、今回のシラバスは<strong>「案」</strong>です。IPAも、公表時点の検討状況に基づくもので今後変更する可能性があるとしています。2027年度受験者は、一度読んで終わりではなく、正式版まで更新を追う必要があります。</p></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">新ITパスポートの主な変更点4つ</h2><div className="mt-6 grid gap-4">{changes.map(([title,text],i)=><div key={title} className="rounded-2xl border bg-white p-6"><div className="text-sm font-bold text-blue-600">CHANGE {i+1}</div><h3 className="mt-1 text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-slate-600">{text}</p></div>)}</div></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">現行試験と新試験を比較</h2><div className="mt-6 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[650px] text-left"><thead className="bg-slate-100"><tr><th className="p-4">項目</th><th className="p-4">2026年度・現行</th><th className="p-4">2027年度・新制度予定</th></tr></thead><tbody className="divide-y"><tr><td className="p-4 font-bold">分野</td><td className="p-4">ストラテジ／マネジメント／テクノロジ</td><td className="p-4">ビジネス／テクノロジ／セキュリティ・倫理</td></tr><tr><td className="p-4 font-bold">試験時間</td><td className="p-4">120分</td><td className="p-4">120分予定</td></tr><tr><td className="p-4 font-bold">出題数</td><td className="p-4">100問</td><td className="p-4">100問予定</td></tr><tr><td className="p-4 font-bold">注目点</td><td className="p-4">現行シラバスを基準</td><td className="p-4">DX・データ・AI時代のセキュリティ/倫理をより明確化</td></tr></tbody></table></div><p className="mt-3 text-sm text-slate-500">※ 新制度の内容は検討中で、今後変更される可能性があります。</p></section>

      <section className="mt-14 rounded-2xl bg-slate-900 p-7 text-white"><h2 className="text-2xl font-bold">2026年中に受ける？2027年度まで待つ？</h2><div className="mt-6 grid gap-5 md:grid-cols-2"><div className="rounded-xl bg-white/10 p-5"><h3 className="font-bold">2026年受験が向く人</h3><p className="mt-3 leading-7 text-slate-200">就活・転職・社内目標などで早めに資格が必要／すでに現行範囲を勉強している／年内に十分な学習時間を確保できる人。</p></div><div className="rounded-xl bg-white/10 p-5"><h3 className="font-bold">2027年度受験を検討する人</h3><p className="mt-3 leading-7 text-slate-200">受験時期が2027年度以降になる／これから長期で学習する／新しいDX・データ・AI時代の内容を新シラバス基準で学びたい人。</p></div></div><p className="mt-5 leading-7 text-slate-200">IPAは2026年度の現行試験についても積極的な受験を期待すると明記しています。「新制度の方が簡単そう」という推測だけで先送りするのはおすすめしません。</p></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">9月から勉強するなら、まず受験年度を決める</h2><p className="mt-4 leading-8 text-slate-700">教材を買う前に、「2026年中に現行試験を受けるのか」「2027年度の新制度を受けるのか」を決めましょう。学ぶべき範囲と優先順位が変わるためです。</p><ol className="mt-6 space-y-4">{[["1. 受験したい時期を決める","資格が必要な期限から逆算します。"],["2. 使える学習時間を出す","平日・休日それぞれの現実的な時間を設定します。"],["3. 現在地を問題で測る","すでに知っている範囲と弱点を分けます。"],["4. 受験制度に合わせて計画する","2026年なら現行範囲、2027年度なら新シラバスの更新を追いながら優先順位を調整します。"]].map(([h,p])=><li key={h} className="rounded-xl border bg-white p-5"><h3 className="font-bold">{h}</h3><p className="mt-2 text-slate-600">{p}</p></li>)}</ol><Link href={cta("mid")} className="mt-7 block rounded-xl bg-blue-600 px-6 py-4 text-center text-lg font-bold text-white">無料で自分専用の学習計画を作る →</Link></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">よくある質問</h2><div className="mt-6 space-y-4">{faq.map(x=><details key={x.q} className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-bold">{x.q}</summary><p className="mt-3 leading-7 text-slate-600">{x.a}</p></details>)}</div></section>

      <section className="mt-14 rounded-3xl bg-blue-700 p-8 text-center text-white"><h2 className="text-2xl font-bold">制度が変わっても、最初に決めるのは「いつ受けるか」。</h2><p className="mx-auto mt-3 max-w-2xl text-blue-100">受験時期と今の実力から、今日やることまで落とした学習計画を作ってみてください。</p><Link href={cta("bottom")} className="mt-6 inline-block rounded-xl bg-white px-7 py-4 font-bold text-blue-700">無料で学習計画を作る</Link></section>

      <p className="mt-10 text-xs leading-6 text-slate-500">※ 2027年度新試験制度の内容は2026年9月1日時点のIPA公表情報に基づきます。シラバス案Ver.0.1を含め、今後変更される可能性があります。受験前にIPA公式情報で最新内容をご確認ください。</p>
    </article>
  </main>;
}
