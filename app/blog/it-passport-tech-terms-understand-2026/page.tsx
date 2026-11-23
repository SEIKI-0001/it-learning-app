import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/blog/it-passport-tech-terms-understand-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const cta = "/onboarding?source=tech-terms-understand-2026";
const title = "ITパスポートのテクノロジ系がわからない人へ｜用語を丸暗記しない勉強法【2026年】";
const description = "ITパスポートのテクノロジ系が難しい初心者向けに、ネットワーク・データベース・セキュリティなどを丸暗記せず理解する勉強法を解説。問題演習とAIを使った弱点復習の進め方も紹介します。";

export const metadata: Metadata = {
  title, description,
  keywords: ["ITパスポート テクノロジ 勉強法", "ITパスポート テクノロジ 難しい", "ITパスポート 用語 覚え方", "ITパスポート 初心者", "ITパスポート AI 学習", "ITパスポート 苦手分野"],
  alternates: { canonical: pageUrl },
  openGraph: { title, description, type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title, description },
};

const methods = [
  ["1", "用語を『役割』で説明する", "単語だけを覚えず、『何のために使うものか』を自分の言葉で1文にします。DNSなら名前とIPアドレスを対応させる仕組み、というように役割から入ります。"],
  ["2", "似た用語をセットで比べる", "混同しやすい用語は単独暗記を避けます。公開鍵と共通鍵、RAMとROM、LANとWANなど、違いを説明できる状態を目指します。"],
  ["3", "図にして関係をつなぐ", "ネットワークやデータベースは、文章だけでなく『どこからどこへ何が動くか』を簡単な図にすると理解しやすくなります。"],
  ["4", "少数の問題をすぐ解く", "理解したつもりで終わらず、その日のうちに問題で確認します。間違えたら教材の最初へ戻るのではなく、原因になった概念だけを復習します。"],
  ["5", "AIには答えではなく説明を求める", "『中学生にも分かる例で』『AとBの違いを表で』『この誤答を選んだ理由を推測して』など、理解を補助する使い方にすると弱点復習に向きます。"],
];

export default function Page() {
  const faq = { "@context":"https://schema.org", "@type":"FAQPage", mainEntity:[
    {"@type":"Question",name:"ITパスポートのテクノロジ系は丸暗記で大丈夫ですか？",acceptedAnswer:{"@type":"Answer",text:"用語暗記だけでは似た選択肢で迷いやすいため、役割・違い・具体例を説明できる状態にしてから問題演習で確認する方法がおすすめです。"}},
    {"@type":"Question",name:"IT未経験でもテクノロジ系を学べますか？",acceptedAnswer:{"@type":"Answer",text:"学べます。最初から専門的な詳細を覚えるのではなく、用語の役割と用語同士の関係から理解し、問題演習で必要な深さを確認すると進めやすくなります。"}},
    {"@type":"Question",name:"2026年のITパスポートはどのシラバスですか？",acceptedAnswer:{"@type":"Answer",text:"2026年8月時点でIPAが掲載しているITパスポート試験シラバスはVer.6.5です。"}}
  ]};
  return <main className="min-h-screen bg-stone-50 text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faq)}} />
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold">it-learning-app</Link><Link href={`${cta}&position=header`} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">無料で学習計画を作る</Link></div></header>

    <article>
      <section className="mx-auto max-w-4xl px-5 py-16 text-center"><p className="text-sm font-bold text-indigo-700">IT未経験者向け・テクノロジ攻略</p><h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">テクノロジ用語、<br/>全部丸暗記しなくていい。</h1><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">ネットワーク、データベース、セキュリティ……。知らない言葉が続くと暗記科目に見えますが、先に「役割」と「違い」を理解すると問題の選択肢を判断しやすくなります。</p><Link href={`${cta}&position=hero`} className="mt-8 inline-block rounded-xl bg-indigo-700 px-8 py-4 font-bold text-white">無料で自分専用の学習計画を作る</Link></section>

      <section className="border-y bg-white"><div className="mx-auto max-w-4xl px-5 py-14"><h2 className="text-2xl font-black">なぜテクノロジ系でつまずくのか</h2><p className="mt-5 leading-8 text-slate-700">IT未経験者にとって難しいのは、用語の数だけではありません。初めて見る言葉を、その言葉だけで覚えようとすると「意味は見たことがあるのに、似た選択肢を区別できない」状態になりやすくなります。</p><p className="mt-4 leading-8 text-slate-700">そこで、学習単位を「単語」から「役割・比較・問題」に変えます。例えば暗号化なら方式名を並べて覚える前に、何を守るのか、鍵をどう使うのか、どの方式と何が違うのかをつなげます。</p></div></section>

      <section className="mx-auto max-w-4xl px-5 py-16"><h2 className="text-3xl font-black">テクノロジ系を理解する5ステップ</h2><div className="mt-9 space-y-5">{methods.map(x=><div key={x[0]} className="rounded-2xl border bg-white p-6"><div className="flex gap-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-black text-indigo-800">{x[0]}</span><div><h3 className="text-xl font-bold">{x[1]}</h3><p className="mt-3 leading-7 text-slate-600">{x[2]}</p></div></div></div>)}</div>
        <div className="mt-10 rounded-2xl bg-indigo-950 p-8 text-white"><h2 className="text-2xl font-black">苦手なところだけ、今日の学習にする</h2><p className="mt-4 leading-7 text-indigo-100">it-learning-appでは、学習と問題演習をつなげて進められます。全部を最初からやり直すのではなく、今の理解度から次に取り組む内容を整理します。</p><Link href={`${cta}&position=mid`} className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-bold text-indigo-950">無料で学習計画を作る</Link></div>
      </section>

      <section className="bg-white"><div className="mx-auto max-w-4xl px-5 py-14"><h2 className="text-2xl font-black">2026年に勉強するなら</h2><p className="mt-5 leading-8 text-slate-700">IPAが現在掲載しているITパスポート試験シラバスはVer.6.5です。試験範囲の確認には、検索記事だけでなく公式シラバスを基準にしてください。IPAは令和8年度（2026年度）の公開問題・解答例も公開しているため、基礎学習後の実戦確認に使えます。</p><p className="mt-4 leading-8 text-slate-700">また、現行ITパスポート試験はCBT方式で実施されています。IPAは2026年12月28日以降の試験休止を予定しているため、2026年中の受験を考えている場合は試験日も先に確認しておきましょう。</p></div></section>

      <section className="mx-auto max-w-4xl px-5 py-16"><h2 className="text-3xl font-black">「分からない」を残さず、問題で確認する</h2><p className="mt-5 max-w-2xl leading-8 text-slate-600">用語集を何周したかではなく、問題を見て違いを説明できるかで理解度を確認します。苦手テーマが見えたら、そこだけ説明→問題→再確認のループへ戻します。</p><Link href={`${cta}&position=bottom`} className="mt-8 inline-block rounded-xl bg-indigo-700 px-8 py-4 font-bold text-white">無料で自分専用の学習計画を作る</Link></section>
    </article>
  </main>;
}
