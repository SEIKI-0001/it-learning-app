import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const PAGE_PATH = "/blog/it-passport-one-month-study-plan-2026";
const PAGE_URL = `${SITE_URL.replace(/\/$/, "")}${PAGE_PATH}`;

const title = "ITパスポートは1か月で合格できる？初心者向け30日勉強計画【2026年版】";
const description =
  "ITパスポートを1か月で目指す初心者向けに、30日間の勉強計画を週ごとに解説。参考書、確認問題、用語復習、過去問の進め方と、間に合わないときの優先順位を紹介します。";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "ITパスポート 1ヶ月",
    "ITパスポート 1か月 勉強法",
    "ITパスポート 30日",
    "ITパスポート 学習計画",
    "ITパスポート 初心者",
    "ITパスポート 独学",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title,
    description,
    type: "article",
    url: PAGE_URL,
    siteName: "it-learning-app",
    locale: "ja_JP",
    publishedTime: "2026-07-30",
    modifiedTime: "2026-07-30",
  },
  twitter: { card: "summary_large_image", title, description },
};

const weeks = [
  {
    label: "1〜7日目",
    title: "試験範囲の全体像をつかむ",
    tasks: [
      "参考書を最初から精読せず、ストラテジ・マネジメント・テクノロジの全体像を確認する",
      "各章を読んだ直後に短い確認問題を解く",
      "分からない用語は一度で暗記せず、意味と使われる場面をセットで整理する",
    ],
  },
  {
    label: "8〜14日目",
    title: "主要テーマを一周し、弱点を見つける",
    tasks: [
      "参考書の一周目を完了する",
      "確認問題の誤答を、知識不足・読み違い・計算ミスに分類する",
      "毎日10〜15分、前日までの用語を復習する",
    ],
  },
  {
    label: "15〜21日目",
    title: "過去問レベルの演習へ移る",
    tasks: [
      "分野を混ぜた問題を解き、知識を使えるか確認する",
      "点数だけでなく、選択肢ごとに正誤理由を説明できるか確認する",
      "苦手分野へ学習時間を寄せ、得意分野のやり直しを減らす",
    ],
  },
  {
    label: "22〜30日目",
    title: "本番形式と弱点復習に絞る",
    tasks: [
      "時間を意識した総合演習を行う",
      "誤答が続くテーマを優先して復習する",
      "試験前日は新しい教材を増やさず、用語と誤答記録を見直す",
    ],
  },
];

const faq = [
  {
    question: "IT未経験でも1か月で合格できますか？",
    answer:
      "1日に確保できる時間、現在の知識、試験日までの日数によって異なります。未経験者は学習時間の長さだけで判断せず、確認問題と総合演習の結果から計画を調整することが重要です。",
  },
  {
    question: "1日何時間勉強すればよいですか？",
    answer:
      "一律の正解はありません。平日は短時間でも継続し、休日に演習と復習をまとめる方法が現実的です。時間より、決めた範囲の理解確認まで終えたかを基準にしてください。",
  },
  {
    question: "過去問だけで1か月対策してもよいですか？",
    answer:
      "基礎用語がある程度分かる人には有効ですが、初心者が過去問だけで進めると解説の暗記になりやすいため、参考書・確認問題・用語復習を組み合わせる方が安全です。",
  },
];

export default function OneMonthStudyPlanPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: title,
      description,
      datePublished: "2026-07-30",
      dateModified: "2026-07-30",
      inLanguage: "ja-JP",
      mainEntityOfPage: { "@type": "WebPage", "@id": PAGE_URL },
      author: { "@type": "Organization", name: "it-learning-app編集部" },
      publisher: { "@type": "Organization", name: "it-learning-app" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-slate-800">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-[#d7e8f2] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/blog" className="font-black text-[#12384d]">ITパスポート学習ガイド</Link>
          <Link href="/onboarding?source=one-month-study-plan-2026&position=header" className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white">無料で学習計画を作る</Link>
        </div>
      </header>

      <article>
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <p className="inline-flex rounded-full bg-[#e8f5fb] px-4 py-2 text-sm font-black text-[#1b75a6]">初心者向け・30日学習計画</p>
              <h1 className="mt-6 text-4xl font-black leading-tight text-[#12384d] sm:text-6xl">ITパスポートを1か月で目指すなら、30日を4段階に分ける。</h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">短期間で重要なのは、毎日長時間勉強することではありません。理解、確認、演習、弱点復習の順番を崩さず、結果に応じて次の学習を変えることです。</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#plan" className="inline-flex justify-center rounded-full bg-[#1b75a6] px-7 py-4 font-black text-white">30日計画を見る</a>
                <Link href="/onboarding?source=one-month-study-plan-2026&position=hero" className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 font-black text-white">自分専用の計画を無料作成</Link>
              </div>
            </div>
            <aside className="rounded-[26px] bg-[#12384d] p-7 text-white shadow-[0_18px_44px_rgba(18,56,77,0.22)]">
              <p className="text-sm font-black text-[#9edaf3]">SEOキーワード</p>
              <p className="mt-2 font-black">ITパスポート 1ヶ月 / 30日 / 学習計画</p>
              <p className="mt-6 text-sm font-black text-[#9edaf3]">想定読者</p>
              <p className="mt-2 leading-7">試験まで約1か月で、何をどの順番で進めるべきか迷っている初心者</p>
              <p className="mt-6 text-sm font-black text-[#9edaf3]">訴求軸</p>
              <p className="mt-2 leading-7">時間管理だけでなく、確認問題の結果から学習内容を調整する</p>
            </aside>
          </div>
        </section>

        <section id="plan" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-black text-[#1b75a6]">30-DAY ROADMAP</p>
          <h2 className="mt-3 text-3xl font-black text-[#12384d] sm:text-5xl">初心者向け30日勉強計画</h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {weeks.map((week) => (
              <section key={week.label} className="rounded-[22px] border border-[#cfe5f2] bg-white p-6 shadow-[0_12px_28px_rgba(22,94,131,0.07)]">
                <p className="text-sm font-black text-[#1b75a6]">{week.label}</p>
                <h3 className="mt-2 text-2xl font-black text-[#12384d]">{week.title}</h3>
                <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
                  {week.tasks.map((task) => <li key={task} className="flex gap-3"><span className="font-black text-[#f7a600]">✓</span><span>{task}</span></li>)}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto w-full max-w-4xl">
            <h2 className="text-3xl font-black text-[#12384d] sm:text-5xl">1か月計画で失敗しやすい3つの進め方</h2>
            <div className="mt-8 space-y-5 text-base leading-8 text-slate-700">
              <p><strong className="text-[#12384d]">参考書を完璧にしてから問題へ進む：</strong>短期間では、読んだ直後に確認問題を入れ、理解不足を早く見つける方が効率的です。</p>
              <p><strong className="text-[#12384d]">遅れを翌日に上乗せする：</strong>予定が崩れた日は、残り日数と弱点に合わせて再配分します。未完了分をそのまま積み上げると継続できません。</p>
              <p><strong className="text-[#12384d]">全分野を同じ量だけ復習する：</strong>確認問題と演習結果から、苦手分野へ時間を寄せる必要があります。</p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="rounded-[28px] bg-[#12384d] p-7 text-white sm:p-12">
            <p className="text-sm font-black text-[#9edaf3]">IT-LEARNING-APP</p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">30日計画を、あなたの試験日と理解度に合わせる。</h2>
            <p className="mt-5 max-w-3xl leading-8 text-[#e6f6fc]">it-learning-appは、試験日から逆算した学習計画、今日やること、確認問題、単語復習、過去問レベル演習を一つにつなげます。予定どおりに進んだかではなく、問題結果から次に進むか復習するかを判断できます。</p>
            <Link href="/onboarding?source=one-month-study-plan-2026&position=bottom" className="mt-8 inline-flex rounded-full bg-[#f7a600] px-7 py-4 font-black text-white">無料で自分専用の学習計画を作る</Link>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto w-full max-w-4xl">
            <h2 className="text-3xl font-black text-[#12384d]">よくある質問</h2>
            <div className="mt-8 space-y-4">
              {faq.map((item) => (
                <details key={item.question} className="rounded-[18px] border border-[#cfe5f2] p-5">
                  <summary className="cursor-pointer font-black text-[#12384d]">{item.question}</summary>
                  <p className="mt-4 leading-8 text-slate-700">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
