import type { Metadata } from "next";
import Link from "next/link";

const title = "ITパスポートは試験日から逆算｜自分専用の学習計画を作る【2026年】";
const description = "ITパスポートの試験日から逆算して学習計画を作る方法を解説。残り日数、平日・休日の学習時間、弱点から今日やることを決めます。";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["ITパスポート 学習計画", "ITパスポート 勉強 スケジュール", "ITパスポート 2026", "ITパスポート AI 学習"],
  alternates: { canonical: "/it-passport-study-plan-from-exam-date-2026" },
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

const cta = "/onboarding?source=exam-date-study-plan-2026";

export default function Page() {
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "ITパスポートの学習計画はどう作ればいいですか？",
        acceptedAnswer: { "@type": "Answer", text: "試験日を決め、残り日数と平日・休日に使える時間を出し、3分野の弱点に応じて学習量を配分します。" },
      },
      {
        "@type": "Question",
        name: "AIはITパスポートの学習計画に使えますか？",
        acceptedAnswer: { "@type": "Answer", text: "残り日数、学習可能時間、弱点に応じて計画や復習優先度を調整する用途に向いています。" },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-bold">it-learning-app</Link>
          <Link href={`${cta}&position=header`} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">無料で学習計画を作る</Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-16 md:py-24">
        <p className="text-sm font-bold text-blue-700">2026年受験者向け｜試験日から逆算</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight md:text-6xl">ITパスポートは、試験日を決めてから勉強しよう。</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">勉強が終わったら受けるのではなく、受験日・残り日数・使える時間・弱点から逆算すると、今日やることが明確になります。</p>
        <Link href={`${cta}&position=hero`} className="mt-8 inline-block rounded-xl bg-blue-700 px-6 py-3 font-bold text-white">無料で自分専用の学習計画を作る</Link>
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-3xl font-bold">計画に必要なのは4つだけ</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[
              ["1. 試験日", "いつ受験するかを先に決める"],
              ["2. 残り日数", "あと何週間あるかを出す"],
              ["3. 学習可能時間", "平日と休日を分けて設定する"],
              ["4. 弱点", "問題演習から優先分野を決める"],
            ].map(([heading, body]) => (
              <div key={heading} className="rounded-2xl bg-slate-50 p-6">
                <h3 className="text-xl font-bold">{heading}</h3>
                <p className="mt-3 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-5 py-14 leading-8">
        <h2 className="text-3xl font-bold">なぜ試験日を先に決めるのか</h2>
        <p className="mt-5">試験日が未定だと、参考書を何周するか、いつ過去問へ移るか、弱点復習にどれだけ時間を残すかを決めにくくなります。先に締切を置けば、学習を週単位に分解できます。</p>

        <h2 className="mt-12 text-3xl font-bold">学習計画は毎週更新する</h2>
        <p className="mt-5">最初の計画を守り切ることより、問題演習で見つかった弱点を次の計画へ反映することが重要です。テクノロジ系で誤答が多ければ復習時間を増やし、理解できた分野は確認問題へ進めます。</p>

        <div className="my-12 rounded-2xl bg-blue-50 p-7">
          <h2 className="text-2xl font-bold">it-learning-appで「今日やること」を決める</h2>
          <p className="mt-3">試験日と学習状況をもとに、合格までの学習を整理します。教材を増やす前に、自分専用の学習計画を作ってみてください。</p>
          <Link href={`${cta}&position=mid`} className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-bold text-white">無料で学習計画を作る</Link>
        </div>

        <h2 className="text-3xl font-bold">おすすめの進め方</h2>
        <ol className="mt-5 list-decimal space-y-3 pl-6">
          <li>受験日を決める</li>
          <li>平日・休日の学習可能時間を入力する</li>
          <li>3分野を一度学習する</li>
          <li>問題演習で弱点を見つける</li>
          <li>弱点に合わせて翌週の計画を更新する</li>
          <li>直前期は誤答復習を優先する</li>
        </ol>

        <div className="mt-14 rounded-2xl bg-slate-900 p-8 text-white">
          <h2 className="text-3xl font-bold">試験日から、合格までを逆算する。</h2>
          <p className="mt-4 text-slate-300">まず受験日と使える時間を決めれば、今日の一歩が具体的になります。</p>
          <Link href={`${cta}&position=bottom`} className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-bold text-slate-900">無料で自分専用の学習計画を作る</Link>
        </div>
      </article>
    </main>
  );
}
