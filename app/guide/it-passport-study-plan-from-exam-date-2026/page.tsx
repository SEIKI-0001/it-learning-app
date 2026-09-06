import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ITパスポートは試験日を先に決めるべき？逆算学習の作り方【2026年】",
  description: "ITパスポートの勉強を始めたのに試験日が決まっていない人向けに、受験日から逆算して現在地・弱点・復習を組み立てる方法を解説します。",
  keywords: ["ITパスポート 試験日 いつ","ITパスポート 試験日 決め方","ITパスポート 勉強計画","ITパスポート 何ヶ月","ITパスポート 年内受験","ITパスポート AI 学習"],
  alternates: { canonical: "/guide/it-passport-study-plan-from-exam-date-2026" },
};
const cta=(p:string)=>`/onboarding?source=exam-date-study-plan-2026&placement=${p}`;
const steps=[
 ["1","受験候補日を置く","資格が必要な期限と会場の開催日から、まず仮の試験日を決めます。"],
 ["2","初見問題で現在地を測る","最初から全教材を読む前に、分野別の問題で既知・未習得を分けます。"],
 ["3","残り日数を弱点へ配分","理解済み範囲を薄くし、誤答が集中する論点へ時間を使います。"],
 ["4","再測定して計画を更新","別問題で定着を確認し、改善しない分野だけ次の学習へ残します。"],
];
export default function Page(){return <main className="min-h-screen bg-slate-50 text-slate-900">
<header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><span className="font-black text-blue-700">it-learning-app</span><Link href={cta("header")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">学習計画を作る</Link></div></header>
<section className="bg-white"><div className="mx-auto max-w-5xl px-5 py-16 md:py-24"><p className="font-bold text-blue-700">2026年版｜ITパスポート学習計画</p><h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">「勉強が終わったら受ける」より、<br/>試験日を先に置く。</h1><p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600">期限がないまま参考書や過去問を進めると、学習は長引きやすくなります。受験候補日を先に決め、残り日数と現在地から必要な学習だけを逆算します。</p><Link href={cta("hero")} className="mt-8 inline-block rounded-xl bg-blue-600 px-7 py-4 font-bold text-white">無料で受験日から学習計画を作る →</Link></div></section>
<section className="border-y bg-amber-50"><div className="mx-auto max-w-5xl px-5 py-10"><p className="font-black text-amber-900">2026年受験を考えている人は日程を先に確認</p><p className="mt-2 max-w-3xl leading-7 text-amber-950">IPAはCBTシステムのリプレースに伴い、2026年12月28日以降のITパスポート試験を休止予定と案内しています。会場によってはそれより前に休止する場合があります。年内受験を考えているなら、勉強終了後ではなく先に開催日と空席を確認してください。</p></div></section>
<section className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-black">逆算学習は4ステップで作る</h2><div className="mt-8 grid gap-4 md:grid-cols-2">{steps.map(([n,a,b])=><div key={n} className="rounded-2xl border bg-white p-6"><span className="text-3xl font-black text-blue-600">{n}</span><h3 className="mt-3 text-xl font-black">{a}</h3><p className="mt-2 leading-7 text-slate-600">{b}</p></div>)}</div></section>
<section className="bg-slate-900 text-white"><div className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-black">AIに「学習計画を作って」で終わらせない</h2><p className="mt-4 max-w-3xl leading-8 text-slate-300">生成AIは用語の説明、誤答理由の言語化、似た概念の比較に便利です。ただし計画の精度を上げるには、実際に解いた問題、弱点、再測定結果を継続して反映する必要があります。</p></div></section>
<section className="mx-auto max-w-5xl px-5 py-16"><div className="rounded-3xl bg-blue-600 p-8 text-white"><p className="font-bold text-blue-100">it-learning-app</p><h2 className="mt-2 text-3xl font-black">試験日までの「次にやること」を決める。</h2><p className="mt-4 max-w-3xl leading-8 text-blue-50">受験日、問題結果、弱点、復習をつなぎ、次のチェックポイントまで必要な学習へ絞ります。</p><Link href={cta("bottom")} className="mt-6 inline-block rounded-xl bg-white px-7 py-4 font-bold text-blue-700">無料で自分専用の学習計画を作る →</Link></div></section>
</main>}
