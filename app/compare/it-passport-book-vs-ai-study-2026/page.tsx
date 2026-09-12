import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/compare/it-passport-book-vs-ai-study-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const cta = "/onboarding?source=book-vs-ai-study-2026";
const title = "ITパスポートは参考書だけで合格できる？参考書・過去問・AI学習を比較【2026年】";
const description = "ITパスポート対策は参考書だけで十分？参考書、過去問、AI学習を理解・演習・計画・弱点対策の観点で比較。2026年受験者向けに、効率よく組み合わせる勉強法を解説します。";

export const metadata: Metadata = {
  title, description,
  keywords: ["ITパスポート 参考書だけ", "ITパスポート AI 勉強", "ITパスポート 過去問", "ITパスポート 勉強法", "ITパスポート 独学", "ITパスポート 2026"],
  alternates: { canonical: pageUrl },
  openGraph: { title, description, type: "website", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title, description },
};

const rows = [
  ["体系的な理解", "◎", "△", "○"],
  ["本番形式の演習", "△", "◎", "○"],
  ["疑問の深掘り", "△", "△", "◎"],
  ["弱点に合わせた復習", "△", "○", "◎"],
  ["学習計画の調整", "△", "△", "◎"],
];

export default function Page() {
  const faq = { "@context":"https://schema.org", "@type":"FAQPage", mainEntity:[
    {"@type":"Question",name:"ITパスポートは参考書だけで合格できますか？",acceptedAnswer:{"@type":"Answer",text:"参考書で体系的に理解することは有効ですが、試験形式への慣れや弱点把握のために問題演習も組み合わせる方が合理的です。"}},
    {"@type":"Question",name:"AIだけでITパスポートを勉強できますか？",acceptedAnswer:{"@type":"Answer",text:"AIは質問、説明、計画調整に有効ですが、試験範囲の基準にはIPAの最新シラバスを使い、公開問題などの一次情報と組み合わせることを推奨します。"}},
    {"@type":"Question",name:"2026年のITパスポート試験は何問ですか？",acceptedAnswer:{"@type":"Answer",text:"現行ITパスポート試験は120分、100問の四肢択一式です。2026年8月時点のシラバスはVer.6.5です。"}}
  ]};
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faq)}} />
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold">it-learning-app</Link><Link href={`${cta}&position=header`} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">無料で学習計画を作る</Link></div></header>
    <section className="mx-auto max-w-4xl px-5 py-16 text-center">
      <p className="text-sm font-bold text-blue-700">ITパスポート勉強法比較 2026</p>
      <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">参考書だけで十分？<br/>過去問・AI学習まで比較</h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">結論は「どれか1つ」ではありません。参考書は理解、過去問は演習、AIは質問・弱点対策・計画調整。それぞれの得意分野を組み合わせる方が、独学の抜けを減らせます。</p>
      <Link href={`${cta}&position=hero`} className="mt-8 inline-block rounded-xl bg-blue-700 px-8 py-4 font-bold text-white">無料で自分専用の学習計画を作る</Link>
    </section>
    <section className="border-y bg-white"><div className="mx-auto max-w-4xl px-5 py-14">
      <h2 className="text-2xl font-black">3つの勉強法を5項目で比較</h2>
      <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[620px] border-collapse text-center"><thead><tr className="bg-slate-100"><th className="p-4 text-left">比較項目</th><th>参考書</th><th>過去問</th><th>AI学習</th></tr></thead><tbody>{rows.map(r=><tr key={r[0]} className="border-t"><td className="p-4 text-left font-bold">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>)}</tbody></table></div>
      <p className="mt-5 text-sm leading-7 text-slate-500">※評価は学習手段の一般的な特性を整理したものです。教材・AIサービスによって機能は異なります。</p>
    </div></section>
    <section className="mx-auto max-w-4xl px-5 py-14"><h2 className="text-2xl font-black">参考書：最初の「地図」を作る</h2><p className="mt-5 leading-8 text-slate-700">ITパスポートはストラテジ、マネジメント、テクノロジを横断して出題されます。初学者が用語をばらばらに暗記するより、参考書で試験範囲の全体像をつかむことには大きな意味があります。ただし、読むだけでは「分かったつもり」を判別しにくいのが弱点です。</p>
      <h2 className="mt-12 text-2xl font-black">過去問：理解した知識を「使えるか」確認する</h2><p className="mt-5 leading-8 text-slate-700">現行試験は120分・100問の四肢択一式です。問題演習では正答率だけでなく、知らなかった、似た用語と混同した、設問を読み違えた、のように誤答理由まで残すと復習対象が明確になります。</p>
      <h2 className="mt-12 text-2xl font-black">AI学習：分からない瞬間と弱点復習を短くする</h2><p className="mt-5 leading-8 text-slate-700">AIの強みは、理解できない用語を別の例で説明させたり、自分の弱点に合わせて確認問題を作ったりできることです。一方、AIの回答だけを試験範囲の根拠にせず、IPAの最新シラバスや公開問題を基準にすることが重要です。2026年8月時点の現行シラバスはVer.6.5です。</p>
    </section>
    <section className="bg-slate-900 text-white"><div className="mx-auto max-w-4xl px-5 py-14"><h2 className="text-3xl font-black">おすすめは「理解 → 演習 → 弱点復習」の循環</h2><ol className="mt-8 space-y-5 leading-8 text-slate-200"><li><strong className="text-white">1. 参考書・解説で全体像を理解</strong> — 完璧に暗記する前に一周します。</li><li><strong className="text-white">2. 問題を解いて現在地を測定</strong> — 正解・不正解だけでなく迷った問題も記録します。</li><li><strong className="text-white">3. AIで疑問と弱点をピンポイント復習</strong> — 分からない部分だけ説明を変えて理解します。</li><li><strong className="text-white">4. 再演習して計画を更新</strong> — 弱点が減ったら次のテーマへ移ります。</li></ol><div className="mt-10 rounded-2xl bg-white p-7 text-slate-900"><h3 className="text-xl font-black">この循環を毎日、自分で管理するのが面倒なら</h3><p className="mt-3 leading-7 text-slate-600">it-learning-appでは、試験日と学習できる時間から計画を作り、問題演習と弱点復習をつなげて学習を進められます。</p><Link href={`${cta}&position=mid`} className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-bold text-white">無料で学習計画を作る</Link></div></div></section>
    <section className="mx-auto max-w-4xl px-5 py-14"><h2 className="text-2xl font-black">2026年受験なら、制度変更を待たず現行範囲で進める</h2><p className="mt-5 leading-8 text-slate-700">IPAは2027年度からITパスポート試験の内容変更を予定しています。一方、現行試験の最新シラバスはVer.6.5で、2026年の受験者は現行範囲を基準に学習できます。CBT試験は2026年12月28日以降の休止が予定されているため、2026年中の受験を考える場合は、受験日を先に決めて逆算する方が計画を立てやすくなります。</p></section>
    <section className="border-t bg-white"><div className="mx-auto max-w-3xl px-5 py-16 text-center"><h2 className="text-3xl font-black">教材選びより先に、今日やることを決める。</h2><p className="mt-5 leading-8 text-slate-600">参考書・過去問・AIをどう組み合わせるか迷う時間を減らし、試験日から逆算した学習を始めましょう。</p><Link href={`${cta}&position=bottom`} className="mt-8 inline-block rounded-xl bg-blue-700 px-8 py-4 font-bold text-white">無料で自分専用の学習計画を作る</Link></div></section>
  </main>;
}
