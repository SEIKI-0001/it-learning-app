import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/compare/it-passport-2026-vs-2027";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "compare-2026-vs-2027";
const cta = (position: string) => `/onboarding?source=${source}&position=${position}`;

export const metadata: Metadata = {
  title: "ITパスポートは2026年中に受ける？2027年新試験を待つ？違いを比較",
  description: "ITパスポートを2026年中に受けるか、2027年度の新試験を待つか迷う人向けに比較。出題分野、追加テーマ、試験時間、向いている人を整理し、受験時期の決め方を解説します。",
  keywords: ["ITパスポート 2026 2027","ITパスポート 2027","ITパスポート 新試験","ITパスポート いつ受ける","ITパスポート 新シラバス","ITパスポート 変更","ITパスポート AI"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポート 2026 vs 2027｜どちらを受ける？", description: "現行試験と2027年度新試験を比較。自分に合う受験時期を判断。", type: "website", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポート 2026 vs 2027", description: "新試験を待つべき？現行試験との違いを比較。" },
};

const rows = [
  ["出題分野", "ストラテジ系／マネジメント系／テクノロジ系", "ビジネス／テクノロジ／セキュリティ・倫理"],
  ["試験時間", "120分", "120分予定"],
  ["出題数", "100問", "100問予定"],
  ["DX", "現行シラバスに沿って出題", "マインド・スタンスを新規追加予定"],
  ["データ", "現行シラバスに沿って出題", "データマネジメント基礎を新規追加予定"],
  ["AI・セキュリティ・倫理", "現行シラバスに沿って出題", "AI時代に対応したセキュリティ・倫理を強化予定"],
  ["制度状況", "2026年度で終了予定", "2027年度春頃から開始予定"],
];

const faq = [
  { q: "2027年度のITパスポートは難しくなりますか？", a: "現時点では難化すると断定できません。IPAが公表しているのは新しい出題構成や範囲を含む案であり、今後変更される可能性があります。" },
  { q: "2026年に勉強を始めたら2027年度まで待つべきですか？", a: "制度変更だけを理由に待つ必要はありません。2026年度中に十分な準備ができ、資格が必要なら現行試験を受ける選択が合理的です。" },
  { q: "2027年度も100問・120分ですか？", a: "IPAが公表した検討状況では、2027年度のITパスポートも100問・120分の予定です。ただし新制度の詳細は今後変更される可能性があります。" },
];

const jsonLd = { "@context":"https://schema.org", "@graph":[
  { "@type":"WebPage", name:"ITパスポートは2026年中に受ける？2027年新試験を待つ？違いを比較", description:metadata.description, url:pageUrl, inLanguage:"ja-JP", datePublished:"2026-09-02", dateModified:"2026-09-02", publisher:{"@type":"Organization",name:"it-learning-app"} },
  { "@type":"FAQPage", mainEntity:faq.map(x=>({"@type":"Question",name:x.q,acceptedAnswer:{"@type":"Answer",text:x.a}})) }
]};

export default function Page() {
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}} />
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold text-blue-700">it-learning-app</Link><Link href={cta("header")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">無料で学習計画を作る</Link></div></header>
    <article className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-sm font-bold text-blue-700">2026年9月2日更新｜受験時期比較</p>
      <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-5xl">ITパスポートは<span className="text-blue-700">2026年中に受ける？</span><br/>2027年新試験を待つ？</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">2027年度からITパスポートの出題構成が変わる予定です。「今の試験を受けるべきか、新試験まで待つべきか」を、IPAが公表した最新情報をもとに比較します。</p>
      <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6"><p className="font-bold">先に結論</p><p className="mt-2 leading-7">2026年度中に十分な準備ができるなら、制度変更だけを理由に受験を先送りする必要はありません。2027年度以降に受験するなら、新しい「ビジネス・テクノロジ・セキュリティ・倫理」を基準に準備するのが合理的です。</p></div>
      <Link href={cta("hero")} className="mt-8 block rounded-xl bg-blue-600 px-6 py-4 text-center text-lg font-bold text-white">受験時期から自分専用の学習計画を作る →</Link>

      <section className="mt-14"><h2 className="text-2xl font-bold">2026年度と2027年度を比較</h2><div className="mt-6 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[720px] text-left"><thead className="bg-slate-100"><tr><th className="p-4">比較項目</th><th className="p-4">2026年度・現行試験</th><th className="p-4">2027年度・新試験予定</th></tr></thead><tbody className="divide-y">{rows.map(([a,b,c])=><tr key={a}><td className="p-4 font-bold">{a}</td><td className="p-4 text-slate-600">{b}</td><td className="p-4 text-slate-600">{c}</td></tr>)}</tbody></table></div><p className="mt-3 text-sm text-slate-500">※2027年度の内容はIPAが公表した検討状況・シラバス案に基づきます。今後変更される可能性があります。</p></section>

      <section className="mt-14 grid gap-5 md:grid-cols-2"><div className="rounded-2xl border bg-white p-7"><div className="text-sm font-bold text-blue-600">2026年度が向く人</div><h2 className="mt-2 text-2xl font-bold">今の制度で受ける</h2><ul className="mt-5 space-y-3 text-slate-600"><li>・年内に資格を取得したい</li><li>・すでに現行範囲の学習を進めている</li><li>・就活、転職、社内目標など期限がある</li><li>・受験までの学習時間を確保できる</li></ul></div><div className="rounded-2xl border bg-white p-7"><div className="text-sm font-bold text-indigo-600">2027年度が向く人</div><h2 className="mt-2 text-2xl font-bold">新制度で受ける</h2><ul className="mt-5 space-y-3 text-slate-600"><li>・受験予定がもともと2027年度以降</li><li>・新シラバス基準で一から学びたい</li><li>・DX、データ、AI倫理も体系的に学びたい</li><li>・正式情報の更新を追いながら準備できる</li></ul></div></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">2027年度は何が変わる？</h2><div className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-2xl border bg-white p-6"><h3 className="font-bold">1. 分野を再整理</h3><p className="mt-3 leading-7 text-slate-600">従来の3系統から「ビジネス」「テクノロジ」「セキュリティ・倫理」へ再整理される予定です。</p></div><div className="rounded-2xl border bg-white p-6"><h3 className="font-bold">2. DX・データを追加</h3><p className="mt-3 leading-7 text-slate-600">DXで求められるマインド・スタンスとデータマネジメントの基礎が新たに追加される予定です。</p></div><div className="rounded-2xl border bg-white p-6"><h3 className="font-bold">3. AI時代へ対応</h3><p className="mt-3 leading-7 text-slate-600">セキュリティ・倫理を強化し、生成AIを含むデジタル技術を適切に扱う判断力も重視されます。</p></div></div></section>

      <section className="mt-14 rounded-2xl bg-slate-900 p-8 text-white"><h2 className="text-2xl font-bold">迷っているなら「受験年度」より先に現在地を測る</h2><p className="mt-4 leading-8 text-slate-200">判断材料は制度だけではありません。すでに合格圏に近い人と、基礎から始める人では最適な受験時期が違います。まず問題を解いて現在地を測り、試験日までに必要な学習量を見積もる方が、受験年度を合理的に決められます。</p><Link href={cta("mid")} className="mt-6 block rounded-xl bg-white px-6 py-4 text-center font-bold text-slate-900">無料で現在地から学習計画を作る →</Link></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">受験時期を決める4ステップ</h2><ol className="mt-6 space-y-4">{[["1. 資格が必要な期限を確認","就活・転職・会社の目標など、取得期限があるなら最優先します。"],["2. 現在地を問題で測る","知っている分野と弱い分野を分け、必要な学習量を把握します。"],["3. 週に使える時間を出す","理想ではなく、平日・休日に継続できる時間で計算します。"],["4. 受験制度に合わせて範囲を決める","2026年度なら現行範囲、2027年度なら新シラバスの更新を追って学習対象を調整します。"]].map(([h,p])=><li key={h} className="rounded-xl border bg-white p-5"><h3 className="font-bold">{h}</h3><p className="mt-2 text-slate-600">{p}</p></li>)}</ol></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">よくある質問</h2><div className="mt-6 space-y-4">{faq.map(x=><div key={x.q} className="rounded-xl border bg-white p-6"><h3 className="font-bold">Q. {x.q}</h3><p className="mt-3 leading-7 text-slate-600">{x.a}</p></div>)}</div></section>

      <section className="mt-14 rounded-3xl bg-blue-600 p-8 text-center text-white"><h2 className="text-2xl font-bold md:text-3xl">「いつ受ける？」を、学習データから決める。</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-blue-100">it-learning-appは、試験日・使える時間・現在の理解度から、次に何を学ぶかを整理します。制度情報を読むだけで終わらせず、自分の学習計画に変えましょう。</p><Link href={cta("bottom")} className="mt-6 inline-block rounded-xl bg-white px-7 py-4 font-bold text-blue-700">無料で自分専用の学習計画を作る →</Link></section>

      <footer className="mt-12 border-t pt-6 text-sm leading-6 text-slate-500"><p>参考：IPA「試験制度の見直しについて」「情報処理技術者試験及び情報処理安全確保支援士試験の見直しの検討状況について」「新試験制度のシラバス案について」。新制度は検討中のため、受験前にIPA公式情報をご確認ください。</p></footer>
    </article>
  </main>;
}
