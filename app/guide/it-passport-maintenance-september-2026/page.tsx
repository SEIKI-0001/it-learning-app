import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-maintenance-september-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "maintenance-september-2026";

export const metadata: Metadata = {
  title: "ITパスポート試験サイトが9/20から停止｜申込・日程変更はいつ再開？【2026年】",
  description: "ITパスポート試験専用サイトは2026年9月20日21時〜9月28日10時にメンテナンスで停止。受験申込・試験日変更・確認票ダウンロードへの影響と、停止期間中に進めたい勉強を解説します。",
  keywords: ["ITパスポート メンテナンス", "ITパスポート 申し込み できない", "ITパスポート サイト 繋がらない", "ITパスポート 試験日 変更", "ITパスポート 9月28日", "ITパスポート 2026"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポート試験サイトが9/20から停止｜2026年9月メンテナンス", description: "申込・日程変更・確認票DLへの影響と、停止期間中にできること。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "ITパスポート試験サイトが9/20から停止", description: "9/28 10時まで。申込・日程変更への影響を整理。" },
};

const faq = [
  { q: "ITパスポート試験専用サイトはいつまで使えませんか？", a: "IPAの2026年9月7日付案内では、2026年9月20日（日）21:00から9月28日（月）10:00まで停止予定です。作業状況により時間が前後する場合があります。" },
  { q: "メンテナンス中にITパスポートの受験申込はできますか？", a: "できません。受験申込、試験日・試験会場などの申込内容変更、確認票ダウンロード、バウチャー使用状況確認を含む全サービスが停止します。" },
  { q: "9月28日以降に新規申込すると何が変わりますか？", a: "IPAの案内では、2026年9月28日以降の新規申込で選択できるITパスポートの試験開催日は2026年12月27日までです。受験を予定している人は最新の空席状況を公式サイトで確認してください。" },
  { q: "サイト停止中でも勉強はできますか？", a: "できます。試験サイトの停止と学習は別です。むしろこの期間に初見問題で現在地を測り、弱点を絞っておくと、申込再開後に受験日から逆算した計画を立てやすくなります。" },
];

function Cta({ position, label }: { position: string; label: string }) {
  return <Link href={`/onboarding?source=${source}&position=${position}`} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-700">{label} →</Link>;
}

export default function Page() {
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "NewsArticle", headline: metadata.title, description: metadata.description, mainEntityOfPage: pageUrl, datePublished: "2026-09-20", dateModified: "2026-09-20", publisher: { "@type": "Organization", name: "it-learning-app" } },
    { "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }
  ] };

  return <main className="min-h-screen bg-white text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="border-b border-slate-200"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-black">it-learning-app</Link><Cta position="header" label="無料で学習を始める" /></div></header>

    <section className="mx-auto max-w-4xl px-5 py-16 text-center md:py-24">
      <p className="text-sm font-bold text-blue-700">2026年9月20日更新｜ITパスポート最新情報</p>
      <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">今夜21時から、<br/>試験サイトが停止します。</h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">ITパスポート試験専用サイトは、2026年9月20日21:00〜9月28日10:00にシステムメンテナンス予定。申込や試験日の変更だけでなく、確認票のダウンロードもできません。</p>
      <div className="mt-8"><Cta position="hero" label="停止期間に学習を進める" /></div>
    </section>

    <article className="mx-auto max-w-3xl px-5 pb-20">
      <section className="rounded-3xl bg-slate-900 p-7 text-white"><p className="text-sm font-bold text-blue-300">まず確認</p><h2 className="mt-2 text-2xl font-black">停止予定：9/20（日）21:00 → 9/28（月）10:00</h2><p className="mt-4 leading-8 text-slate-300">IPAはこの期間、ITパスポート試験専用サイトへのアクセスを停止すると案内しています。作業状況により時間が前後する可能性があります。</p></section>

      <section className="mt-14"><h2 className="text-3xl font-black">メンテナンス中にできないこと</h2><div className="mt-7 grid gap-4 md:grid-cols-2">{[
        ["受験申込", "新規の受験申込は停止します。"],
        ["試験日・会場の変更", "申込内容の変更もできません。"],
        ["確認票のダウンロード", "必要な人は停止前の確認が安全です。"],
        ["バウチャー使用状況確認", "試験サイト上のサービス全体が停止します。"],
      ].map(([h,p]) => <div key={h} className="rounded-2xl border border-slate-200 p-6"><h3 className="text-lg font-black">{h}</h3><p className="mt-2 leading-7 text-slate-600">{p}</p></div>)}</div><p className="mt-5 text-sm leading-6 text-slate-500">出典：IPA「ITパスポート試験専用サイトのシステムメンテナンス等のお知らせ」（2026年9月7日公開）</p></section>

      <section className="mt-14"><h2 className="text-3xl font-black">9月28日以降に申し込む人は、年内日程に注意</h2><p className="mt-5 leading-8 text-slate-700">IPAの試験実施案内では、2026年9月28日以降にITパスポートを新規で申し込む場合、選択できる試験開催日は2026年12月27日までとされています。年内受験を考えているなら、「いつか申し込む」ではなく、再開後に候補日を確認して学習期限を固定するのがおすすめです。</p></section>

      <section className="mt-14 rounded-3xl bg-blue-50 p-7"><p className="text-sm font-bold text-blue-700">サイトが止まっている7日間に</p><h2 className="mt-2 text-2xl font-black">申込を待つより、「今の実力」を測っておく。</h2><p className="mt-4 leading-8 text-slate-700">受験日は決められなくても、学習は進められます。最初に初見問題で現在地を測り、苦手テーマを絞る。必要な範囲だけ学び、別問題で再測定する。9月28日に申込が再開したとき、残り学習量を見ながら受験日を決めやすくなります。</p><div className="mt-6"><Cta position="mid" label="無料で今の弱点を確認する" /></div></section>

      <section className="mt-14"><h2 className="text-3xl font-black">停止期間中のおすすめ4ステップ</h2><ol className="mt-7 space-y-5">{[
        ["1", "初見問題で現在地を測る", "知っている範囲と、まだ弱い範囲を分けます。"],
        ["2", "弱点だけを学ぶ", "参考書を最初から読み直さず、誤答したテーマを優先します。"],
        ["3", "別の問題で再測定する", "同じ問題の暗記ではなく、初見でも判断できるか確認します。"],
        ["4", "9/28以降に受験日を決める", "残った弱点と学習ペースを見て、年内の候補日から逆算します。"],
      ].map(([n,h,p]) => <li key={n} className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 font-black text-white">{n}</span><div><h3 className="text-xl font-black">{h}</h3><p className="mt-2 leading-7 text-slate-600">{p}</p></div></li>)}</ol></section>

      <section className="mt-14"><h2 className="text-3xl font-black">よくある質問</h2><div className="mt-6 space-y-4">{faq.map((x) => <details key={x.q} className="rounded-2xl border border-slate-200 p-5"><summary className="cursor-pointer font-bold">{x.q}</summary><p className="mt-3 leading-7 text-slate-600">{x.a}</p></details>)}</div></section>

      <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-center text-white"><p className="text-sm font-bold text-blue-300">9月28日を待たなくていい</p><h2 className="mt-2 text-3xl font-black">今日から、合格までの距離を縮める。</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-slate-300">it-learning-appで現在地を測り、次に学ぶべき弱点から始めましょう。</p><div className="mt-7"><Link href={`/onboarding?source=${source}&position=bottom`} className="inline-flex rounded-xl bg-white px-7 py-4 font-bold text-slate-900">無料で自分専用の学習計画を作る →</Link></div></section>

      <p className="mt-10 text-sm leading-6 text-slate-500">本記事は2026年9月20日時点のIPA公表情報をもとに作成しています。メンテナンス終了時刻や試験開催状況は変更される可能性があるため、申込時はIPA公式情報をご確認ください。</p>
    </article>
  </main>;
}