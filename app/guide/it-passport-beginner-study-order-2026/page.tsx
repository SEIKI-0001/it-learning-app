import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-beginner-study-order-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const cta = "/onboarding?source=beginner-study-order-2026";
const title = "ITパスポート初心者は何から勉強する？最初にやること7選【2026年版】";
const description = "ITパスポート初心者向けに、試験日決定、全体像の把握、3分野の基礎、問題演習、弱点復習まで、迷わず始めるための勉強順序を7ステップで解説します。";

export const metadata: Metadata = { title, description, keywords: ["ITパスポート 何から勉強", "ITパスポート 初心者", "ITパスポート 勉強順番", "ITパスポート 独学", "ITパスポート 勉強法 2026", "ITパスポート AI 学習"], alternates: { canonical: pageUrl }, openGraph: { title, description, type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" }, twitter: { card: "summary_large_image", title, description } };

const steps = [
  ["1", "先に試験日を決める", "勉強が終わってから申し込むのではなく、先に期限を作ります。残り日数が決まると、1日に必要な学習量も決めやすくなります。"],
  ["2", "シラバスで全体像だけを見る", "ストラテジ・マネジメント・テクノロジの3分野と、含まれるテーマを確認します。2026年8月時点の現行シラバスはVer.6.5です。"],
  ["3", "基礎教材を1つに絞る", "参考書、動画、アプリを同時に増やしすぎず、まず主教材を1つ決めます。分からない箇所だけ別の説明を使います。"],
  ["4", "完璧に覚える前に問題を解く", "1章を読んだら少数の問題を解きます。『何が問われるか』を早く知ることで、復習対象を絞れます。"],
  ["5", "間違いを3種類に分ける", "誤答を『知らなかった』『似た用語と混同した』『設問を読み違えた』に分け、次に直すべき点を明確にします。"],
  ["6", "弱点だけ戻って復習する", "最初から全部読み直さず、誤答が集中したテーマへ戻ります。AIも用語の言い換え説明や確認問題など、弱点が明確な状態で使います。"],
  ["7", "公開問題で本番形式を確認する", "IPAは令和8年度（2026年度）の公開問題と解答例を掲載しています。学習後半では時間を意識して解き、問題形式への慣れも確認します。"],
];

export default function Page() {
  const faq = { "@context":"https://schema.org", "@type":"FAQPage", mainEntity:[
    {"@type":"Question",name:"ITパスポート初心者は何から勉強すればいいですか？",acceptedAnswer:{"@type":"Answer",text:"まず試験日を決め、試験範囲の全体像を確認してから基礎学習と少量の問題演習を並行するのがおすすめです。"}},
    {"@type":"Question",name:"参考書を全部覚えてから過去問を解くべきですか？",acceptedAnswer:{"@type":"Answer",text:"全部覚えるまで待つ必要はありません。基礎学習の途中から問題を解き、誤答を使って復習対象を絞る方法が効率的です。"}},
    {"@type":"Question",name:"2026年のITパスポートはどのシラバスですか？",acceptedAnswer:{"@type":"Answer",text:"2026年8月時点の現行ITパスポート試験シラバスはVer.6.5です。"}}
  ]};
  return <main className="min-h-screen bg-stone-50 text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faq)}} />
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold">it-learning-app</Link><Link href={`${cta}&position=header`} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">無料で学習計画を作る</Link></div></header>
    <section className="mx-auto max-w-4xl px-5 py-16 text-center"><p className="text-sm font-bold text-emerald-700">ITパスポート初心者向け・2026年版</p><h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">何から始めればいい？<br/>最初にやること7選</h1><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">参考書を買う前に、過去問を解く前に、まず「勉強する順番」を決める。IT未経験でも迷いにくいスタート手順を7つに整理しました。</p><Link href={`${cta}&position=hero`} className="mt-8 inline-block rounded-xl bg-emerald-700 px-8 py-4 font-bold text-white">無料で自分専用の学習計画を作る</Link></section>
    <section className="border-y bg-white"><div className="mx-auto max-w-4xl px-5 py-14"><h2 className="text-2xl font-black">初心者が最初に避けたい3つのこと</h2><div className="mt-7 grid gap-4 md:grid-cols-3">{[["教材を増やしすぎる","選ぶ時間が増え、進捗が見えにくくなります。"],["暗記してから問題を解く","試験でどう問われるか分からないまま暗記が増えます。"],["得意分野だけ進める","3分野を横断して学ぶ必要があります。"]].map(x=><div key={x[0]} className="rounded-2xl border p-5"><h3 className="font-bold">{x[0]}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{x[1]}</p></div>)}</div></div></section>
    <section className="mx-auto max-w-4xl px-5 py-16"><h2 className="text-3xl font-black">初心者がやること7選</h2><p className="mt-4 leading-8 text-slate-600">上から順番に進めればOKです。最初から完璧を目指す必要はありません。</p><div className="mt-9 space-y-5">{steps.map(s=><article key={s[0]} className="rounded-2xl border bg-white p-6"><div className="flex gap-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-800">{s[0]}</span><div><h3 className="text-xl font-bold">{s[1]}</h3><p className="mt-3 leading-7 text-slate-600">{s[2]}</p></div></div></article>)}</div></section>
    <section className="bg-slate-900 text-white"><div className="mx-auto max-w-4xl px-5 py-14 text-center"><p className="text-sm font-bold text-emerald-300">順番を考える時間を、勉強する時間へ。</p><h2 className="mt-3 text-3xl font-black">今日やることから決める</h2><p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-300">it-learning-appなら、試験日と学習状況をもとに学習を進められます。教材選びで止まる前に、まず1日目を始めましょう。</p><Link href={`${cta}&position=mid`} className="mt-7 inline-block rounded-xl bg-white px-7 py-4 font-bold text-slate-900">無料で自分専用の学習計画を作る</Link></div></section>
    <section className="mx-auto max-w-4xl px-5 py-16"><h2 className="text-2xl font-black">2026年受験なら、現行範囲で進める</h2><p className="mt-5 leading-8 text-slate-700">IPAの現行ITパスポート試験シラバスはVer.6.5で、令和8年度の公開問題・解答例も公開されています。2027年度から新試験制度への移行が予定されていますが、2026年8月時点では新ITパスポートのシラバス案・サンプル問題は準備中です。2026年中の受験を考えているなら、現行範囲に沿って学習を進めるのが合理的です。</p><div className="mt-8 rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">最短ルートは「理解 → 問題 → 弱点 → 再演習」</h2><p className="mt-3 leading-7 text-slate-600">一度全体を進み、問題で弱点を見つけ、必要なところだけ戻る。このループを回せる学習設計が重要です。</p></div><div className="mt-12 text-center"><Link href={`${cta}&position=bottom`} className="inline-block rounded-xl bg-emerald-700 px-8 py-4 font-bold text-white">無料で学習を始める</Link></div></section>
  </main>;
}
