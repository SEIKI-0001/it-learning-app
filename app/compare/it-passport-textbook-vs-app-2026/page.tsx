import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ITパスポートは参考書とアプリどっち？独学の最適な使い分け【2026年】",
  description:
    "ITパスポート対策は参考書とアプリのどちらがいい？初学者・短期受験・スキマ時間中心などタイプ別に比較し、過去問・AIを含めた効率的な使い分けを解説します。",
  keywords: [
    "ITパスポート 参考書 アプリ どっち",
    "ITパスポート アプリ おすすめ",
    "ITパスポート 独学",
    "ITパスポート 勉強法",
    "ITパスポート AI 学習",
  ],
  alternates: { canonical: "/compare/it-passport-textbook-vs-app-2026" },
  openGraph: {
    title: "ITパスポートは参考書とアプリどっち？【2026年】",
    description: "参考書・問題アプリ・AI学習の役割を比較。自分に合う独学ルートを整理します。",
    type: "article",
    url: "/compare/it-passport-textbook-vs-app-2026",
  },
  twitter: { card: "summary_large_image", title: "ITパスポートは参考書とアプリどっち？【2026年】" },
};

const cta = (place: string, label = "無料で自分専用の学習計画を作る") =>
  `/onboarding?source=textbook-vs-app-2026&placement=${place}`;

export default function Page() {
  const faq = [
    ["参考書なしでアプリだけでも合格できますか？", "既にITやビジネスの基礎知識がある人は問題演習中心でも進められます。一方、初学者は分からない用語を都度調べる負担が大きくなりやすいため、薄めの参考書や解説教材を併用する方が進めやすい場合があります。"],
    ["参考書は何周すればいいですか？", "周回数を目標にするより、早めに問題を解いて理解できていない論点を特定し、その部分だけ参考書へ戻る方が効率的です。"],
    ["AIは何に使うと効果的ですか？", "似た用語の比較、誤答理由の言語化、自分の理解度に合わせた説明、条件を変えた類題作成などに向いています。AIの回答は誤る可能性があるため、試験仕様や制度情報はIPAなどの一次情報でも確認してください。"],
  ];
  const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q,a]) => ({ "@type":"Question", name:q, acceptedAnswer:{"@type":"Answer", text:a} })) };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><span className="font-bold text-blue-700">it-learning-app</span><Link className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white" href={cta("header")}>無料で学習計画を作る</Link></div></header>

      <section className="mx-auto max-w-5xl px-5 py-16 md:py-24">
        <p className="mb-4 font-bold text-blue-700">ITパスポート独学ガイド 2026</p>
        <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">参考書とアプリ、<br/>どっちから始める？</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">結論は「どちらか一つ」ではありません。参考書は理解、問題アプリは測定、AIはつまずきの解消。それぞれの役割を分けると、勉強のムダを減らせます。</p>
        <div className="mt-8"><Link className="inline-block rounded-xl bg-blue-600 px-7 py-4 font-bold text-white shadow" href={cta("hero")}>無料で自分専用の学習計画を作る →</Link></div>
      </section>

      <section className="border-y bg-white"><div className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-3xl font-black">先に結論：役割が違う</h2>
        <div className="mt-8 overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left"><thead><tr className="bg-slate-100"><th className="p-4">手段</th><th className="p-4">強いこと</th><th className="p-4">弱いこと</th><th className="p-4">向く場面</th></tr></thead><tbody>{[
          ["参考書","体系的に理解する","読むだけでは実力を測りにくい","完全初学者・苦手論点の理解"],
          ["問題アプリ","反復・スキマ時間・正誤記録","解くだけだと暗記になりやすい","現在地測定・定着確認"],
          ["生成AI","質問・比較・説明の個別化","学習全体の管理は自分次第","つまずきの解消・誤答分析"],
          ["学習管理型アプリ","弱点と次の行動をつなぐ","教材量だけを求める人には過剰な場合も","試験日まで迷わず進めたいとき"],
        ].map(r=><tr key={r[0]} className="border-t">{r.map(c=><td key={c} className="p-4 align-top">{c}</td>)}</tr>)}</tbody></table></div>
      </div></section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-3xl font-black">タイプ別：おすすめの始め方</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border bg-white p-6"><p className="font-bold text-blue-700">完全初学者</p><h3 className="mt-2 text-xl font-black">薄く読む → すぐ解く</h3><p className="mt-3 leading-7 text-slate-600">最初から参考書を完璧に覚えようとせず、章ごとに問題を解いて「何が分からないか」を可視化します。</p></article>
          <article className="rounded-2xl border bg-white p-6"><p className="font-bold text-blue-700">仕事でITに触れる人</p><h3 className="mt-2 text-xl font-black">まず問題で現在地測定</h3><p className="mt-3 leading-7 text-slate-600">既知の範囲まで読み直す必要はありません。先に問題を解き、弱いテーマだけ教材へ戻ります。</p></article>
          <article className="rounded-2xl border bg-white p-6"><p className="font-bold text-blue-700">短期受験</p><h3 className="mt-2 text-xl font-black">試験日から逆算する</h3><p className="mt-3 leading-7 text-slate-600">教材の完走ではなく、残り日数に対して「測定→弱点→復習→再測定」を何回回せるかを優先します。</p></article>
        </div>
      </section>

      <section className="bg-slate-900 text-white"><div className="mx-auto max-w-5xl px-5 py-16">
        <p className="font-bold text-blue-300">よくある失敗</p><h2 className="mt-2 text-3xl font-black">「参考書を1周してから過去問」が遠回りになることも</h2>
        <p className="mt-5 max-w-3xl leading-8 text-slate-300">読むこと自体が目的になると、得意な範囲にも同じ時間を使います。早い段階で問題演習を挟めば、理解済みの範囲と復習すべき範囲を分けられます。重要なのは教材を終えることではなく、本番までに弱点を減らすことです。</p>
      </div></section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-3xl font-black">効率化する5ステップ</h2>
        <ol className="mt-8 space-y-4">{[
          "受験日と1週間に使える時間を決める",
          "問題を解いて現在地を測る",
          "間違えた原因を『知らない・混同・計算・迷い』などに分ける",
          "必要な箇所だけ参考書やAIで理解し直す",
          "別の問題で再測定し、まだ弱ければ学習計画へ戻す",
        ].map((x,i)=><li key={x} className="flex gap-4 rounded-xl border bg-white p-5"><span className="font-black text-blue-600">{i+1}</span><span className="font-semibold">{x}</span></li>)}</ol>
        <div className="mt-10 rounded-2xl bg-blue-50 p-7"><h3 className="text-2xl font-black">it-learning-appは「次に何をするか」を決めるための学習支援</h3><p className="mt-3 leading-7 text-slate-700">問題を増やすだけではなく、現在地・弱点・復習・再測定をつなげ、試験日までの学習判断を減らすことを目指しています。</p><Link className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-4 font-bold text-white" href={cta("mid")}>無料で弱点から学習計画を作る →</Link></div>
      </section>

      <section className="border-t bg-white"><div className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-black">よくある質問</h2><div className="mt-8 space-y-6">{faq.map(([q,a])=><div key={q}><h3 className="font-black">{q}</h3><p className="mt-2 leading-7 text-slate-600">{a}</p></div>)}</div></div></section>

      <section className="mx-auto max-w-5xl px-5 py-20 text-center"><h2 className="text-3xl font-black">教材選びより先に、あなたの現在地を決める。</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">参考書を何ページ読むかではなく、合格までに何を優先するか。it-learning-appで学習計画を整理できます。</p><Link className="mt-8 inline-block rounded-xl bg-blue-600 px-8 py-4 font-bold text-white" href={cta("bottom")}>無料で自分専用の学習計画を作る →</Link></section>
    </main>
  );
}
