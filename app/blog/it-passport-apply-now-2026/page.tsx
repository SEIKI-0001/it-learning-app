import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/blog/it-passport-apply-now-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "apply-now-2026";

export const metadata: Metadata = {
  title: "ITパスポートはいつ申し込む？2026年秋受験なら先に試験日を決めるべき理由",
  description: "2026年秋〜年内にITパスポートを受験する人向けに、申込時期、試験日の決め方、変更期限、12月の試験休止前に間に合わせる学習計画を解説します。",
  keywords: ["ITパスポート 申し込み いつ", "ITパスポート 申込 2026", "ITパスポート 試験日", "ITパスポート 12月", "ITパスポート 勉強計画", "ITパスポート AI 学習"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポートはいつ申し込む？【2026年】", description: "年内受験なら、勉強が終わる前に試験日を決める。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポートはいつ申し込む？【2026年】", description: "8月から年内受験へ。申込と勉強を逆算する方法。" },
};

const faq = [
  { q: "2026年8月に申し込むと、どこまで先の試験日を選べますか？", a: "IPAの2026年8月3日更新案内では、ITパスポートは2026年9月27日までに新規申込みする場合、申込日から3か月先の同日までの開催日から選択できます。実際の空席は会場ごとに異なります。" },
  { q: "2026年9月28日以降に申し込む場合は？", a: "IPAの案内では、2026年9月28日以降の新規申込みは、申込日から2026年12月27日までの開催日の中から選択する予定です。" },
  { q: "申し込んだ後に試験日を変更できますか？", a: "ITパスポート試験専用サイトでは、受験申込内容の変更は試験日の3日前まで可能と案内されています。試験日2日前から当日までは変更できません。" },
  { q: "2026年12月28日以降も受験できますか？", a: "IPAはシステムリプレースに伴い2026年12月28日以降の試験休止を予定しています。会場によっては12月27日より前に休止する場合もあります。" },
];

const jsonLd = { "@context": "https://schema.org", "@graph": [
  { "@type": "BlogPosting", headline: metadata.title, description: metadata.description, url: pageUrl, inLanguage: "ja-JP", datePublished: "2026-08-22", dateModified: "2026-08-22", publisher: { "@type": "Organization", name: "it-learning-app" } },
  { "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) }
] };

const CTA = ({ position, label = "無料で受験日から学習計画を作る" }: { position: string; label?: string }) => (
  <Link href={`/onboarding?source=${source}&position=${position}`} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 font-bold text-white transition hover:bg-slate-700">{label}</Link>
);

export default function Page() {
  return <main className="min-h-screen bg-white text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="border-b border-slate-200"><div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4"><Link href="/" className="font-black">it-learning-app</Link><CTA position="header" label="無料で計画を作る" /></div></header>

    <article>
      <section className="bg-gradient-to-b from-amber-50 to-white"><div className="mx-auto max-w-4xl px-5 py-16 sm:py-20">
        <p className="text-sm font-bold text-amber-700">2026年8月22日更新｜IPA最新案内を確認</p>
        <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">ITパスポートはいつ申し込む？<span className="mt-2 block text-2xl text-slate-600 sm:text-3xl">2026年秋受験なら、勉強が終わる前に試験日を決める</span></h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">「もう少し勉強してから申し込もう」と考えていませんか。2026年後半は試験日程に上限があります。年内受験を考えているなら、先に試験日を決め、残り日数から勉強を逆算する方が動きやすくなります。</p>
        <div className="mt-8"><CTA position="hero" /></div>
      </div></section>

      <section className="mx-auto max-w-4xl px-5 py-12">
        <h2 className="text-3xl font-black">結論：2026年秋に受けるなら、受験日を先に確保する</h2>
        <p className="mt-4 leading-8 text-slate-700">IPAは、システムリプレースに伴い2026年12月28日以降のITパスポート試験を休止予定としています。さらに、会場によっては12月27日より前に試験実施が止まる場合があります。つまり「年末まで勉強して、準備ができたら予約する」という進め方では、希望する地域・時間帯の空席を選びにくくなる可能性があります。</p>
        <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-6"><p className="font-black">2026年8月時点で押さえる日付</p><ul className="mt-3 space-y-2 leading-7 text-slate-700"><li>・9月27日までの新規申込み：申込日から3か月先の同日までの開催日から選択予定</li><li>・9月28日以降の新規申込み：申込日から12月27日までの開催日から選択予定</li><li>・12月28日以降：試験休止予定</li></ul></div>
      </section>

      <section className="bg-slate-50"><div className="mx-auto max-w-4xl px-5 py-12">
        <h2 className="text-3xl font-black">「合格できそうになったら予約」が失敗しやすい3つの理由</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">{[
          ["1", "締切がない", "受験日が決まっていないと、参考書を読む期間が延びやすくなります。"],
          ["2", "必要量を逆算できない", "残り30日と90日では、1日に必要な学習量も演習開始時期も変わります。"],
          ["3", "空席は自分で選べない", "CBTは日時・会場を選べますが、希望枠に必ず空席があるとは限りません。"]
        ].map(([n,t,b]) => <div key={n} className="rounded-2xl bg-white p-6 ring-1 ring-slate-200"><p className="text-sm font-black text-amber-700">POINT {n}</p><h3 className="mt-2 text-xl font-black">{t}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{b}</p></div>)}</div>
      </div></section>

      <section className="mx-auto max-w-4xl px-5 py-12">
        <h2 className="text-3xl font-black">受験日を決めたら、勉強は4段階で逆算する</h2>
        <ol className="mt-7 space-y-4">{[
          ["STEP 1", "残り日数と使える時間を出す", "平日と休日で確保できる時間を分けます。理想ではなく、実際に続けられる時間で計算します。"],
          ["STEP 2", "3分野を一度解いて現在地を見る", "ストラテジ・マネジメント・テクノロジを広く確認し、誤答だけでなく迷った正解も残します。"],
          ["STEP 3", "弱点へ学習時間を再配分する", "全範囲を同じ時間だけ勉強せず、説明できない論点や繰り返し間違える分野へ戻ります。"],
          ["STEP 4", "試験前は本番形式で再確認する", "新しい教材を増やすより、時間を意識した演習と弱点の再確認を優先します。"]
        ].map(([s,t,b]) => <li key={s} className="rounded-2xl border border-slate-200 p-6"><p className="text-sm font-black text-amber-700">{s}</p><h3 className="mt-1 text-xl font-black">{t}</h3><p className="mt-2 leading-7 text-slate-600">{b}</p></li>)}</ol>
        <div className="mt-9 rounded-3xl bg-slate-900 p-8 text-white"><h2 className="text-2xl font-black">試験日を入力したら、今日やることまで落とす</h2><p className="mt-3 max-w-2xl leading-7 text-slate-300">it-learning-appは、試験までの期間と学習状況から、弱点を見ながら次の学習につなげるITパスポート学習支援アプリです。計画だけ作って終わらず、問題演習の結果から見直していきます。</p><div className="mt-6"><CTA position="mid" /></div></div>
      </section>

      <section className="bg-amber-50"><div className="mx-auto max-w-4xl px-5 py-12"><h2 className="text-3xl font-black">申し込んだ後も変更できる。ただし直前は不可</h2><p className="mt-4 leading-8 text-slate-700">ITパスポート試験専用サイトでは、受験申込内容の変更は試験日の3日前まで可能と案内されています。試験日2日前から当日までは変更できません。最初から完璧な日を選ぼうとせず、現実的な受験日を置いて学習を開始する方法もあります。</p><p className="mt-4 text-sm leading-6 text-slate-600">申込・変更条件は更新される可能性があります。手続き前には必ずIPA公式のITパスポート試験サイトで最新情報と会場の空席を確認してください。</p></div></section>

      <section className="mx-auto max-w-4xl px-5 py-12"><h2 className="text-3xl font-black">よくある質問</h2><div className="mt-6 space-y-4">{faq.map((item) => <details key={item.q} className="rounded-2xl border border-slate-200 p-5"><summary className="cursor-pointer font-bold">{item.q}</summary><p className="mt-3 leading-7 text-slate-600">{item.a}</p></details>)}</div></section>

      <section className="border-t border-slate-200"><div className="mx-auto max-w-4xl px-5 py-14 text-center"><h2 className="text-3xl font-black">受験日を決めたら、今日の勉強を決める。</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">残り日数と弱点から、自分向けの学習計画を作って始めましょう。</p><div className="mt-7"><CTA position="bottom" /></div></div></section>
    </article>
  </main>;
}
