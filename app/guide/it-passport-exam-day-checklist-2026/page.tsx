import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-exam-day-checklist-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "exam-day-checklist-2026";

export const metadata: Metadata = {
  title: "ITパスポート試験当日の持ち物・注意点7選｜直前チェックリスト【2026年】",
  description: "ITパスポート試験当日の持ち物と注意点を2026年のIPA公式情報に沿って整理。確認票、顔写真付き本人確認書類、時計の持込禁止、当日の流れと直前学習までチェックできます。",
  keywords: ["ITパスポート 持ち物", "ITパスポート 試験当日", "ITパスポート 本人確認書類", "ITパスポート 確認票", "ITパスポート 時計", "ITパスポート 直前対策", "ITパスポート 2026"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポート試験当日の持ち物・注意点7選【2026年】", description: "忘れ物と当日の迷いを防ぐための直前チェックリスト。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポート試験当日チェックリスト【2026年】", description: "確認票・本人確認書類・時計の注意点から直前学習まで整理。" },
};

const checks = [
  ["1", "確認票の3情報を確認", "利用者ID・受験番号・確認コードを確認します。IPAは確認票を試験日前までに余裕をもってダウンロード・印刷するよう案内しています。"],
  ["2", "顔写真付き本人確認書類を準備", "有効期限内の顔写真付き本人確認書類が必要です。原本を用意し、利用できる書類の詳細はIPA公式案内で確認してください。"],
  ["3", "時計は試験室へ持ち込まない", "腕時計を含む時計は試験室内へ持ち込めません。残り時間は受験画面上に表示されます。"],
  ["4", "会場と到着経路を前日に確認", "会場名だけでなく入口・最寄駅・移動時間まで確認し、当日に調べ物を増やさないようにします。"],
  ["5", "新しい範囲を広げない", "前日は新しい参考書へ手を広げず、これまで間違えた問題・迷った用語を優先して確認します。"],
  ["6", "3分野の弱点だけ最終確認", "ストラテジ・マネジメント・テクノロジのうち、直近の演習で不安が残る分野へ時間を寄せます。"],
  ["7", "試験後の結果確認方法も知っておく", "試験結果レポートのダウンロードにも利用者メニューへのログインが必要です。利用者IDとパスワードを保管しておきましょう。"],
];

const faq = [
  { q: "ITパスポート試験に受験票は届きますか？", a: "IPAは受験票を送付しないと案内しています。利用者メニューから確認票を試験日前までにダウンロード・印刷して準備してください。" },
  { q: "ITパスポート試験に腕時計は持ち込めますか？", a: "持ち込めません。IPAは腕時計を含む時計の試験室内への持込みを禁止しています。残り時間は受験画面に表示されます。" },
  { q: "本人確認書類は必要ですか？", a: "はい。有効期限内の顔写真付き本人確認書類が必要です。対象書類の詳細は受験前にIPA公式サイトで確認してください。" },
  { q: "前日は何を勉強すればいいですか？", a: "新しい範囲を増やすより、直近で間違えた問題や迷った用語を絞って確認する方が、残り時間を使いやすくなります。" },
];

function Cta({ position }: { position: string }) {
  return <Link href={`/onboarding?source=${source}&position=${position}`} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3.5 font-bold text-white transition hover:bg-slate-700">無料で弱点から最終学習プランを作る</Link>;
}

export default function Page() {
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "Article", headline: metadata.title, description: metadata.description, mainEntityOfPage: pageUrl, datePublished: "2026-08-20", dateModified: "2026-08-20", publisher: { "@type": "Organization", name: "it-learning-app" } },
    { "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }
  ] };

  return <main className="min-h-screen bg-white text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="border-b border-slate-200"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold">it-learning-app</Link><Cta position="header" /></div></header>

    <section className="mx-auto max-w-4xl px-5 py-16 text-center">
      <p className="mb-4 text-sm font-bold text-slate-500">2026年版・試験直前チェック</p>
      <h1 className="text-3xl font-black leading-tight sm:text-5xl">ITパスポート試験当日の<br className="hidden sm:block" />持ち物・注意点7選</h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">勉強してきた内容を本番で出し切るために、忘れ物と当日の迷いを先に消しておきましょう。IPA公式情報をもとに、前日までに確認したいポイントをまとめました。</p>
      <div className="mt-8"><Cta position="hero" /></div>
    </section>

    <article className="mx-auto max-w-3xl px-5 pb-20">
      <section className="rounded-2xl bg-amber-50 p-6">
        <h2 className="text-xl font-black">最重要：この2つは前日までに確認</h2>
        <p className="mt-3 leading-7 text-slate-700">IPAは受験時に、確認票に記載された<strong>利用者ID・受験番号・確認コード</strong>と、<strong>有効期限内の顔写真付き本人確認書類</strong>が必要と案内しています。受験票は郵送されません。</p>
      </section>

      <h2 className="mt-14 text-2xl font-black">試験当日のチェックリスト7選</h2>
      <div className="mt-6 space-y-5">{checks.map(([n,t,d]) => <section key={n} className="rounded-2xl border border-slate-200 p-6"><div className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white">{n}</span><div><h3 className="text-lg font-bold">{t}</h3><p className="mt-2 leading-7 text-slate-600">{d}</p></div></div></section>)}</div>

      <section className="mt-14 rounded-3xl bg-slate-50 p-7">
        <h2 className="text-2xl font-black">前日にやる勉強は「広げる」より「絞る」</h2>
        <p className="mt-4 leading-8 text-slate-700">直前期に新しい教材へ手を出すと、確認すべき範囲が増えます。直近の問題演習から「間違えた」「正解したが迷った」「説明できない」の3種類だけを拾い、弱点を短時間で再確認する方が実行しやすい方法です。</p>
        <p className="mt-4 leading-8 text-slate-700">it-learning-appでは、学習状況から次に取り組む内容を整理できます。試験直前なら、残り時間を苦手分野へ寄せるための最終確認に使えます。</p>
        <div className="mt-6"><Cta position="mid" /></div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-black">2026年に受験する人の日程注意点</h2>
        <p className="mt-4 leading-8 text-slate-700">IPAはシステムリプレースに伴い、2027年1月以降に試験実施を一時休止する予定です。2025年12月27日以降に申し込んだ場合は、2026年12月28日以降の試験日を選択できません。年内受験を考えている場合は、空席状況も含めて早めに受験日を確認してください。</p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-black">よくある質問</h2>
        <div className="mt-5 space-y-4">{faq.map((x) => <details key={x.q} className="rounded-xl border border-slate-200 p-5"><summary className="cursor-pointer font-bold">{x.q}</summary><p className="mt-3 leading-7 text-slate-600">{x.a}</p></details>)}</div>
      </section>

      <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-center text-white">
        <h2 className="text-2xl font-black">残り時間は、弱点だけに使う。</h2>
        <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-300">試験日までの残り時間と現在の理解度から、最後に何を優先するか整理しましょう。</p>
        <div className="mt-6"><Link href={`/onboarding?source=${source}&position=bottom`} className="inline-flex rounded-xl bg-white px-6 py-3.5 font-bold text-slate-900">無料で弱点から最終学習プランを作る</Link></div>
      </section>

      <p className="mt-10 text-sm leading-6 text-slate-500">出典：IPA ITパスポート試験公式サイト「ご注意」「2026年5月以降の試験実施について」。本人確認書類などの要件は変更される可能性があるため、受験前に必ずIPA公式サイトで最新情報を確認してください。</p>
    </article>
  </main>;
}
