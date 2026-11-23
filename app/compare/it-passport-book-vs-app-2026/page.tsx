import type { Metadata } from "next";
import Link from "next/link";

const title="ITパスポートは参考書とアプリどっち？勉強法を比較【2026年】";
const description="ITパスポート対策は参考書と学習アプリのどちらが向いている？理解・演習・弱点管理・復習・費用の違いを比較し、タイプ別の選び方を解説します。";
const path="/compare/it-passport-book-vs-app-2026";
export const metadata:Metadata={title,description,keywords:["ITパスポート 参考書 アプリ どっち","ITパスポート アプリ","ITパスポート 参考書","ITパスポート 勉強法","ITパスポート 独学","ITパスポート AI 学習"],alternates:{canonical:path},openGraph:{title,description,type:"article",url:path},twitter:{card:"summary_large_image",title,description}};
const cta=(p:string)=>`/onboarding?source=book-vs-app-2026&placement=${p}`;
const rows=[
 ["体系的に理解する","◎","○"],
 ["問題演習","○","◎"],
 ["弱点を記録する","△","◎"],
 ["復習タイミングを決める","△","◎"],
 ["分からない箇所を戻って読む","◎","○"],
 ["次に何をやるか決める","△","◎"]
];
const faq=[
 {q:"ITパスポートは参考書だけでも合格できますか？",a:"可能です。ただし、読むだけではなく問題演習で理解度を確認し、誤答した論点へ戻る学習が必要です。"},
 {q:"アプリだけで勉強しても大丈夫ですか？",a:"アプリの収録範囲と解説品質によります。重要なのは教材の形式より、出題範囲をカバーしながら問題演習と弱点復習を繰り返せることです。"},
 {q:"参考書とアプリは併用した方がいいですか？",a:"役割を分けると効率的です。参考書を辞書・理解用、アプリを測定・演習・復習管理用として使う方法があります。"}
];
const faqSchema={"@context":"https://schema.org","@type":"FAQPage",mainEntity:faq.map(x=>({"@type":"Question",name:x.q,acceptedAnswer:{"@type":"Answer",text:x.a}}))};

export default function Page(){return <main className="min-h-screen bg-slate-50 text-slate-900">
<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqSchema)}}/>
<header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><b className="text-blue-700">it-learning-app</b><Link href={cta("header")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">無料で現在地を確認</Link></div></header>
<section className="bg-white"><div className="mx-auto max-w-5xl px-5 py-20"><p className="font-bold text-blue-700">ITパスポート勉強法比較</p><h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">参考書か、アプリか。<br/>答えは「役割を分ける」。</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">参考書は体系的な理解に強く、学習アプリは問題演習・弱点管理・復習に強い。それぞれを最初から最後まで使うのではなく、自分に不足している役割だけ使うと学習時間を圧縮しやすくなります。</p><Link href={cta("hero")} className="mt-8 inline-block rounded-xl bg-blue-600 px-7 py-4 font-bold text-white">無料で自分の弱点を確認する →</Link></div></section>
<section className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-black">参考書と学習アプリを6項目で比較</h2><div className="mt-7 overflow-x-auto"><table className="w-full min-w-[620px] border-collapse bg-white"><thead><tr className="bg-slate-100"><th className="p-4 text-left">比較項目</th><th className="p-4">参考書</th><th className="p-4">学習アプリ</th></tr></thead><tbody>{rows.map(r=><tr key={r[0]} className="border-t"><td className="p-4 font-bold">{r[0]}</td><td className="p-4 text-center">{r[1]}</td><td className="p-4 text-center">{r[2]}</td></tr>)}</tbody></table></div><p className="mt-4 text-sm leading-6 text-slate-500">※一般的な教材特性の比較です。個別の参考書・アプリによって機能や品質は異なります。</p></section>
<section className="border-y bg-white"><div className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-black">タイプ別：どちらから始める？</h2><div className="mt-7 grid gap-5 md:grid-cols-3"><div className="rounded-2xl border p-6"><b className="text-blue-700">IT用語がほぼ初めて</b><h3 className="mt-2 text-xl font-black">参考書＋アプリ</h3><p className="mt-3 leading-7 text-slate-600">最初から通読する必要はありません。問題で分からなかった論点を参考書で補い、別問題で理解を確認します。</p></div><div className="rounded-2xl border p-6"><b className="text-blue-700">仕事でITに触れている</b><h3 className="mt-2 text-xl font-black">まずアプリで測定</h3><p className="mt-3 leading-7 text-slate-600">既に知っている範囲まで読み直さず、初見問題で不足分を特定してから必要箇所だけ学びます。</p></div><div className="rounded-2xl border p-6"><b className="text-blue-700">試験日が近い</b><h3 className="mt-2 text-xl font-black">演習＋弱点復習</h3><p className="mt-3 leading-7 text-slate-600">教材を増やすより、誤答・未定着論点を絞り込み、再測定を優先します。</p></div></div></div></section>
<section className="bg-slate-900 text-white"><div className="mx-auto max-w-5xl px-5 py-16"><p className="font-bold text-blue-300">it-learning-appの考え方</p><h2 className="mt-2 text-3xl font-black">教材を選ぶ前に、「何が足りないか」を測る。</h2><p className="mt-4 max-w-3xl leading-8 text-slate-300">ITパスポートは幅広い知識を問う試験です。だからこそ、全員が同じ順番で全範囲を学ぶ必要はありません。it-learning-appは問題結果から現在地と弱点を捉え、次に取り組む学習を決めることを重視します。</p><Link href={cta("mid")} className="mt-6 inline-block rounded-xl bg-white px-7 py-4 font-bold text-blue-700">無料で現在地から始める →</Link></div></section>
<section className="mx-auto max-w-4xl px-5 py-16"><h2 className="text-3xl font-black">おすすめの使い分け</h2><ol className="mt-7 space-y-4">{[["1","初見問題を解く"],["2","間違えた理由を確認する"],["3","必要な論点だけ参考書・解説で理解する"],["4","別問題で再測定する"],["5","残った弱点から次の学習を決める"]].map(([n,x])=><li key={n} className="flex gap-4 rounded-xl border bg-white p-5"><b className="text-2xl text-blue-700">{n}</b><span className="pt-1 font-bold">{x}</span></li>)}</ol><h2 className="mt-16 text-3xl font-black">よくある質問</h2><div className="mt-7 space-y-4">{faq.map(x=><details key={x.q} className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-bold">{x.q}</summary><p className="mt-3 leading-7 text-slate-600">{x.a}</p></details>)}</div><div className="mt-12 rounded-3xl bg-blue-50 p-8 text-center"><h2 className="text-3xl font-black">参考書を1ページ目から読む前に、現在地を測る。</h2><p className="mt-3 text-slate-600">理解済みの範囲を飛ばして、合格まで不足しているところから始めます。</p><Link href={cta("bottom")} className="mt-6 inline-block rounded-xl bg-blue-600 px-7 py-4 font-bold text-white">無料で自分専用の学習計画を作る →</Link></div></section>
</main>}
