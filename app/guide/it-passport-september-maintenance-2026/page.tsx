import type { Metadata } from "next";
import Link from "next/link";

const title = "ITパスポート申込サイトが9月20日から停止｜今やること【2026年】";
const description = "ITパスポート試験専用サイトは2026年9月20日21時から9月28日10時までメンテナンス予定。年内受験を考える人向けに、停止前に確認することと学習計画を解説します。";
const canonical = "/guide/it-passport-september-maintenance-2026";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["ITパスポート メンテナンス", "ITパスポート 9月20日", "ITパスポート 申込 2026", "ITパスポート 試験日変更", "ITパスポート 年内受験", "ITパスポート 勉強計画"],
  alternates: { canonical },
  openGraph: { title, description, type: "article", url: canonical },
  twitter: { card: "summary_large_image", title, description },
};

const cta = (placement: string) => `/onboarding?source=september-maintenance-2026&placement=${placement}`;
const faq = [
  ["いつITパスポート試験専用サイトが止まりますか？", "IPAは2026年9月20日21:00から9月28日10:00までシステムメンテナンスを予定しています。作業状況により時間が前後する場合があります。"],
  ["停止中に試験日の変更はできますか？", "できません。IPAによると、受験申込、試験日・試験会場など申込内容の変更、確認票ダウンロード等を含む全サービスが停止します。"],
  ["年内受験を考えている場合はどうすればいい？", "まず候補日と会場を確認し、現在地を問題で測って残り期間の学習量を逆算します。2026年12月28日以降は試験休止予定のため、年末ぎりぎりを前提にしない方が安全です。"],
];
const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q,a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };

export default function Page() {
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><span className="font-black text-blue-700">it-learning-app</span><Link href={cta("header")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">学習計画を作る</Link></div></header>
    <section className="bg-white"><div className="mx-auto max-w-5xl px-5 py-16 md:py-24">
      <p className="font-bold text-red-700">2026年9月8日版｜受験予定者向け重要情報</p>
      <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">9月20日21時から、<br/>ITパスポート申込サイトが約1週間停止。</h1>
      <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600">IPAは9月20日21:00〜9月28日10:00にITパスポート試験専用サイトを停止すると発表しました。受験申込だけでなく、試験日・会場の変更や確認票ダウンロードもできません。年内受験を考えているなら、停止前に「受験日」と「残り学習量」を整理しておきましょう。</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href={cta("hero")} className="rounded-xl bg-blue-600 px-7 py-4 text-center font-bold text-white">無料で受験日から学習計画を作る →</Link><a href="https://www.ipa.go.jp/news/2026/shiken_20260907.html" target="_blank" rel="noreferrer" className="rounded-xl border px-7 py-4 text-center font-bold">IPA公式のお知らせ</a></div>
    </div></section>
    <section className="border-y bg-red-50"><div className="mx-auto max-w-5xl px-5 py-10"><h2 className="text-2xl font-black text-red-950">停止期間：9月20日（日）21:00 → 9月28日（月）10:00</h2><p className="mt-3 leading-7 text-red-950">停止中は専用サイト自体にアクセスできず、受験申込、申込内容変更、確認票ダウンロード、バウチャー使用状況確認など全サービスが利用できません。コールセンターも9月21日〜27日は休業予定です。</p></div></section>
    <section className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-black">停止前にやることは3つ</h2><div className="mt-8 grid gap-4 md:grid-cols-3">{[["1","受験候補日を決める","会場と空席を確認。年末ぎりぎりではなく余裕を持った候補日を置きます。"],["2","現在地を測る","参考書を最初から読み直す前に、初見問題で得意・弱点を分けます。"],["3","残り日数を弱点へ配る","理解済み範囲を薄くし、誤答が集中するテーマへ学習時間を使います。"]].map(([n,h,p])=><div key={n} className="rounded-2xl border bg-white p-6"><span className="text-3xl font-black text-blue-600">{n}</span><h3 className="mt-3 text-xl font-black">{h}</h3><p className="mt-2 leading-7 text-slate-600">{p}</p></div>)}</div></section>
    <section className="border-y bg-white"><div className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-black">「申し込めない1週間」を学習の空白にしない</h2><p className="mt-4 max-w-3xl leading-8 text-slate-600">サイト停止と勉強は別です。受験日を仮置きしたら、問題→誤答分析→必要箇所だけ学習→別問題で再測定、というループを回せます。申込再開を待ってから学習計画を立てる必要はありません。</p><div className="mt-8 rounded-3xl bg-blue-600 p-8 text-white"><p className="font-bold text-blue-100">it-learning-app</p><h2 className="mt-2 text-3xl font-black">次に何を勉強するかを、毎回考えない。</h2><p className="mt-4 max-w-3xl leading-8 text-blue-50">受験日、問題結果、弱点、復習をつなぎ、次の学習へ絞ります。生成AIは用語説明や誤答理由の整理に使い、学習履歴は継続的に次の行動へ反映します。</p><Link href={cta("mid")} className="mt-6 inline-block rounded-xl bg-white px-7 py-4 font-bold text-blue-700">無料で年内受験プランを作る →</Link></div></div></section>
    <section className="mx-auto max-w-4xl px-5 py-16"><h2 className="text-3xl font-black">よくある質問</h2><div className="mt-7 space-y-4">{faq.map(([q,a])=><details key={q} className="rounded-2xl border bg-white p-5"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-3 leading-7 text-slate-600">{a}</p></details>)}</div><div className="mt-12 text-center"><Link href={cta("bottom")} className="inline-block rounded-xl bg-blue-600 px-7 py-4 font-bold text-white">無料で自分専用の学習計画を作る →</Link></div></section>
  </main>;
}
