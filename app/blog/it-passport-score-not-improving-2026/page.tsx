import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/blog/it-passport-score-not-improving-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "score-not-improving-2026";

export const metadata: Metadata = {
  title: "ITパスポートの点数が上がらない人へ｜過去問6割前後から抜け出す勉強法【2026年】",
  description: "ITパスポートの過去問を繰り返しても点数が伸びない人向けに、停滞の原因を4タイプに分け、弱点の見つけ方・復習・再テストまで具体的に解説します。",
  keywords: ["ITパスポート 点数 上がらない","ITパスポート 6割","ITパスポート 過去問 伸びない","ITパスポート 弱点","ITパスポート 復習","ITパスポート AI 学習"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポートの点数が上がらない人へ【2026年】", description: "問題数を増やす前に、伸びない原因を特定。6割前後の停滞から抜け出す復習法を解説。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポートの点数が上がらない人へ", description: "過去問を解いても伸びないときに見直したい4つの原因と復習法。" },
};

const causes = [
  ["知識不足型", "用語そのものを知らず、選択肢を絞れない", "該当テーマだけ教材へ戻り、1文で説明できる状態にする"],
  ["混同型", "RTO/RPOなど似た用語で毎回迷う", "単語を単独暗記せず、似た概念を横並びで比較する"],
  ["既視感型", "同じ過去問なら解けるが初見問題で落とす", "正答を覚えた問題から離れ、別年度・類題で再判定する"],
  ["偏り型", "総合正答率は悪くないが特定分野だけ弱い", "総合点ではなく3分野別に結果を見て学習時間を再配分する"],
];

const faq = [
  { q: "過去問で6割前後から点数が上がりません。問題数を増やすべきですか？", a: "先に誤答原因を分類するのがおすすめです。知らない、混同した、迷って当たった、時間不足など原因によって次に必要な学習が異なります。" },
  { q: "同じ過去問を何周もすれば伸びますか？", a: "復習には有効ですが、答えを覚えて正答率だけ上がることがあります。別年度や類題でも同じ論点を解けるか確認してください。" },
  { q: "総合で6割なら合格できますか？", a: "単純な正答率だけでは合否を判定できません。ITパスポートはIRT方式で評価され、総合評価点600点以上に加え、3分野それぞれ300点以上が必要です。" },
  { q: "AIはどこで使うと効果的ですか？", a: "正答を聞くだけでなく、誤答した理由の言語化、似た用語の比較、数字や条件を変えた類題作成に使うと復習へつなげやすくなります。" },
];

const jsonLd = { "@context":"https://schema.org", "@graph":[
  { "@type":"BlogPosting", headline:"ITパスポートの点数が上がらない人へ｜過去問6割前後から抜け出す勉強法【2026年】", description:metadata.description, url:pageUrl, inLanguage:"ja-JP", datePublished:"2026-08-31", dateModified:"2026-08-31", publisher:{"@type":"Organization",name:"it-learning-app"} },
  { "@type":"FAQPage", mainEntity:faq.map(x=>({"@type":"Question",name:x.q,acceptedAnswer:{"@type":"Answer",text:x.a}})) }
]};

const cta = (position: string) => `/onboarding?source=${source}&position=${position}`;

export default function Page() {
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}} />
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold text-blue-700">it-learning-app</Link><Link href={cta("header")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">無料で学習計画を作る</Link></div></header>

    <article className="mx-auto max-w-4xl px-5 py-12">
      <div className="mb-4 text-sm font-semibold text-blue-700">ITパスポート勉強法｜2026年8月31日</div>
      <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">ITパスポートの点数が上がらない人へ<br/><span className="text-blue-700">過去問6割前後から抜け出す勉強法</span></h1>
      <p className="mt-6 text-lg leading-8 text-slate-600">過去問を何周しても正答率が変わらない。覚えたはずなのに初見問題では迷う。そんなとき、必要なのは問題数をさらに増やすことではなく、<strong>「なぜ落としたか」を分けて次の学習を変えること</strong>です。</p>
      <div className="mt-8 rounded-2xl bg-blue-50 p-6"><p className="font-bold">この記事の結論</p><p className="mt-2 leading-7">「不正解」だけを記録するのではなく、知識不足・混同・既視感・分野の偏りに分類し、弱点だけ復習して別問題で再判定します。</p></div>
      <Link href={cta("hero")} className="mt-8 block rounded-xl bg-blue-600 px-6 py-4 text-center text-lg font-bold text-white">無料で弱点から学習計画を作る →</Link>

      <section className="mt-14"><h2 className="text-2xl font-bold">なぜ「過去問をもっと解く」だけでは伸びないのか</h2><p className="mt-4 leading-8 text-slate-700">正答率には、理解して正解した問題だけでなく、答えを覚えていた問題や二択で偶然当たった問題も含まれます。その状態で同じ問題を繰り返すと数字だけ改善し、初見問題への対応力が伸びないことがあります。</p><p className="mt-4 leading-8 text-slate-700">またITパスポートは総合評価点600/1,000点以上だけでなく、ストラテジ・マネジメント・テクノロジの各分野で300/1,000点以上が必要です。IRT方式で評価されるため、「過去問で60%正解＝本番600点」と単純換算もできません。</p></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">まず、伸びない原因を4タイプに分ける</h2><div className="mt-6 grid gap-4">{causes.map(([title,sign,action])=><div key={title} className="rounded-2xl border bg-white p-6"><h3 className="text-xl font-bold text-blue-700">{title}</h3><p className="mt-2"><strong>サイン：</strong>{sign}</p><p className="mt-2 text-slate-600"><strong>次にやること：</strong>{action}</p></div>)}</div></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">点数を伸ばす4ステップ</h2><ol className="mt-6 space-y-5">{[
        ["1. 誤答＋迷った正解を拾う","不正解だけでなく、根拠なく選んで当たった問題も復習対象にします。"],
        ["2. 原因を1つ付ける","知識不足・混同・既視感・分野偏りのどれかを付けます。分類に時間をかけすぎる必要はありません。"],
        ["3. 必要なところだけ戻る","教材を最初から読み直さず、該当論点だけ確認します。似た用語は比較表にすると差が見えやすくなります。"],
        ["4. 別問題で再テストする","同じ問題の正解ではなく、同じ知識を別の聞き方で問われても解けるか確認します。ここで解けて初めて弱点が改善したと判断します。"]
      ].map(([h,p])=><li key={h} className="rounded-xl bg-white p-5 shadow-sm"><h3 className="font-bold">{h}</h3><p className="mt-2 leading-7 text-slate-600">{p}</p></li>)}</ol></section>

      <section className="mt-14 rounded-2xl bg-slate-900 p-7 text-white"><h2 className="text-2xl font-bold">AIは「答え」より「間違えた理由」に使う</h2><p className="mt-4 leading-8 text-slate-200">「RTOとRPOを初心者向けに比較して」「この選択肢を選んだ考え方のどこが違う？」「同じ論点で条件を変えた問題を1問作って」のように使うと、AIを弱点修正に使えます。</p><p className="mt-4 leading-8 text-slate-200">ただし、説明を読んだだけで終わらず、最後は自力で別問題を解いて確認します。</p></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">「次に何をやるか」を毎回決めるのが面倒なら</h2><p className="mt-4 leading-8 text-slate-700">点数が停滞すると、「過去問を続ける」「参考書へ戻る」「苦手分野だけやる」の判断が必要になります。it-learning-appは、試験日と学習状況をもとに、弱点の確認から次の学習へつなげるためのITパスポート学習支援アプリです。</p><Link href={cta("mid")} className="mt-6 block rounded-xl bg-blue-600 px-6 py-4 text-center text-lg font-bold text-white">無料で弱点から学習計画を作る →</Link></section>

      <section className="mt-14"><h2 className="text-2xl font-bold">よくある質問</h2><div className="mt-6 space-y-4">{faq.map(x=><details key={x.q} className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-bold">{x.q}</summary><p className="mt-3 leading-7 text-slate-600">{x.a}</p></details>)}</div></section>

      <section className="mt-14 rounded-3xl bg-blue-700 p-8 text-center text-white"><h2 className="text-2xl font-bold">問題数ではなく、弱点から次の一手を決める。</h2><p className="mx-auto mt-3 max-w-2xl text-blue-100">試験日と今の学習状況から、自分向けの学習計画を作ってみてください。</p><Link href={cta("bottom")} className="mt-6 inline-block rounded-xl bg-white px-7 py-4 font-bold text-blue-700">無料で学習計画を作る</Link></section>

      <p className="mt-10 text-xs leading-6 text-slate-500">※ 合格基準・試験方式などは受験前にIPA公式情報で最新内容をご確認ください。本記事は特定の正答率で合格を保証するものではありません。</p>
    </article>
  </main>;
}
