import type { Metadata } from "next";
import Link from "next/link";

const pageUrl = "https://it-learning-app.vercel.app/lp/it-passport-study-plan";
const ctaBase = "/onboarding?source=study-plan-lp-2026";

export const metadata: Metadata = {
  title: "ITパスポート学習計画を無料作成｜試験日から逆算するAI勉強プラン【2026年版】",
  description:
    "ITパスポート試験日と学習可能時間から、毎日の勉強内容を整理。独学で迷いやすい学習順・復習・問題演習を、理解度に合わせて進める無料学習計画を作成できます。",
  keywords: [
    "ITパスポート 学習計画",
    "ITパスポート 勉強計画",
    "ITパスポート AI 学習",
    "ITパスポート 独学",
    "ITパスポート 勉強スケジュール",
    "ITパスポート 無料 アプリ",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポート学習計画を無料作成｜AIが試験日から逆算",
    description:
      "今日やることが分かる。試験日、学習可能時間、理解度をもとにITパスポートの学習計画を作成します。",
    type: "website",
    url: pageUrl,
    locale: "ja_JP",
    siteName: "it-learning-app",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート学習計画を無料作成【2026年版】",
    description:
      "試験日から逆算し、毎日の学習内容と復習の優先順位を整理します。",
  },
};

const faqItems = [
  {
    question: "ITパスポートの学習計画は無料で作れますか？",
    answer:
      "はい。試験日や学習可能時間などを入力し、学習開始時の計画を無料で作成できます。",
  },
  {
    question: "IT未経験でも利用できますか？",
    answer:
      "利用できます。初学者でも進めやすいように、基礎理解、確認問題、用語復習、過去問レベル演習の順で学習を整理します。",
  },
  {
    question: "計画どおりに勉強できなかった場合はどうなりますか？",
    answer:
      "予定時間だけで進捗を判断せず、確認問題や演習結果を使って理解度を確認します。遅れを翌日にそのまま上乗せするのではなく、優先順位を見直して進めます。",
  },
  {
    question: "参考書や過去問サイトと併用できますか？",
    answer:
      "併用できます。参考書を知識のインプット、公式公開問題や過去問を実践演習、it-learning-appを計画・理解度確認・復習管理に使う方法がおすすめです。",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "ITパスポート学習計画を無料作成",
  description:
    "試験日と学習可能時間から、ITパスポートの毎日の学習内容を整理する学習計画作成ページです。",
  url: pageUrl,
  inLanguage: "ja-JP",
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  publisher: { "@type": "Organization", name: "it-learning-app" },
};

const benefits = [
  {
    title: "試験日から逆算",
    body: "残り日数をもとに、基礎学習・確認問題・復習・実践演習の配分を整理します。",
  },
  {
    title: "今日やることを明確化",
    body: "教材を開いてから迷わないように、その日に取り組む内容を具体的な単位で提示します。",
  },
  {
    title: "結果を見て計画を調整",
    body: "勉強時間だけでなく、確認問題や演習結果から理解度を判断し、復習の優先順位を決めます。",
  },
];

const steps = [
  ["01", "試験日を入力", "受験予定日までの残り期間を確認します。"],
  ["02", "学習できる時間を設定", "平日・休日に確保できる現実的な時間を入力します。"],
  ["03", "学習状況を確認", "未学習か、すでに参考書や問題演習を始めているかを選びます。"],
  ["04", "毎日の計画を作成", "入力内容に合わせて、今日から進める学習順を整理します。"],
];

export default function ItPassportStudyPlanLandingPage() {
  return (
    <main className="min-h-screen bg-[#f7fafc] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="font-black tracking-tight text-[#14384a]">
            it-learning-app
          </Link>
          <Link
            href={`${ctaBase}&position=header`}
            className="rounded-full bg-[#f59e0b] px-4 py-2 text-sm font-black text-white transition hover:bg-[#d97706]"
          >
            無料で計画を作る
          </Link>
        </div>
      </header>

      <section className="overflow-hidden bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-sm font-black text-[#17658d]">
              ITパスポート独学者向け・無料学習計画
            </p>
            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-[#14384a] sm:text-6xl">
              試験日まで、
              <br />
              何を勉強するか迷わない。
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-700">
              ITパスポートは範囲が広く、参考書を買っただけでは学習順や復習のタイミングまで決まりません。試験日と学習可能時間から、毎日の勉強内容を整理し、確認問題の結果に合わせて合格までの進め方を調整します。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={`${ctaBase}&position=hero`}
                className="inline-flex justify-center rounded-full bg-[#f59e0b] px-8 py-4 text-lg font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#d97706]"
              >
                無料で自分専用の計画を作る
              </Link>
              <p className="text-center text-sm font-bold text-slate-500 sm:text-left">
                約1分で入力完了
              </p>
            </div>
          </div>

          <aside className="rounded-[30px] bg-[#14384a] p-7 text-white shadow-2xl">
            <p className="text-sm font-black text-sky-200">作成される計画のイメージ</p>
            <div className="mt-6 space-y-3">
              {[
                ["今日", "セキュリティ基礎＋確認問題4問"],
                ["明日", "ネットワーク基礎＋用語復習15枚"],
                ["週末", "今週の誤答復習＋実践問題10問"],
              ].map(([label, task]) => (
                <div key={label} className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs font-black text-sky-200">{label}</p>
                  <p className="mt-1 text-sm font-bold leading-6">{task}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-6 text-slate-300">
              学習状況や理解度に応じて内容は変わります。
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-center text-sm font-black text-[#17658d]">独学で止まりやすい原因</p>
        <h2 className="mt-3 text-center text-3xl font-black text-[#14384a] sm:text-4xl">
          教材不足ではなく、学習設計不足かもしれません
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ["今日やる範囲が曖昧", "参考書をどこまで読むか決まらず、学習開始までに時間がかかります。"],
            ["復習の優先順位が不明", "間違えた問題が増えても、どこから戻るべきか判断しにくくなります。"],
            ["時間だけで進捗を判断", "予定時間を消化しても理解できているとは限らず、不安が残ります。"],
          ].map(([title, body]) => (
            <article key={title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-black text-[#14384a]">{title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-700">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#eaf5fb] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black text-[#17658d]">it-learning-appの学習設計</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black text-[#14384a] sm:text-4xl">
            計画は細かく、進捗判定は理解度ベース
          </h2>
          <p className="mt-5 max-w-3xl leading-8 text-slate-700">
            毎日の計画には学習時間と学習量を使い、取り組む内容を具体化します。一方で、実際に次へ進めるかは時間ではなく、確認問題・用語復習・過去問レベル問題の結果から判断します。
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {benefits.map((item) => (
              <article key={item.title} className="rounded-[24px] bg-white p-6">
                <h3 className="text-xl font-black text-[#14384a]">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-700">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-black text-[#17658d]">利用の流れ</p>
        <h2 className="mt-3 text-3xl font-black text-[#14384a] sm:text-4xl">
          入力は4ステップ
        </h2>
        <div className="mt-10 space-y-4">
          {steps.map(([number, title, body]) => (
            <article key={number} className="grid gap-3 rounded-[22px] border border-slate-200 bg-white p-6 sm:grid-cols-[70px_1fr] sm:items-start">
              <p className="text-2xl font-black text-[#f59e0b]">{number}</p>
              <div>
                <h3 className="text-xl font-black text-[#14384a]">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-700">{body}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href={`${ctaBase}&position=steps`}
            className="inline-flex justify-center rounded-full bg-[#f59e0b] px-8 py-4 text-lg font-black text-white transition hover:bg-[#d97706]"
          >
            学習計画を無料作成する
          </Link>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black text-[#17658d]">よくある質問</p>
          <h2 className="mt-3 text-3xl font-black text-[#14384a] sm:text-4xl">FAQ</h2>
          <div className="mt-8 space-y-4">
            {faqItems.map((item) => (
              <details key={item.question} className="group rounded-[20px] border border-slate-200 bg-[#f7fafc] p-5">
                <summary className="cursor-pointer list-none pr-6 font-black text-[#14384a]">
                  {item.question}
                </summary>
                <p className="mt-4 text-sm leading-7 text-slate-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl rounded-[32px] bg-[#14384a] px-6 py-12 text-center text-white sm:px-10">
          <p className="text-sm font-black text-sky-200">ITパスポート独学を、迷わず続ける</p>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">
            今日やることから、合格まで整理します。
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-200">
            試験日と学習時間を入力して、あなたの状況に合った学習計画を作成してください。
          </p>
          <Link
            href={`${ctaBase}&position=bottom`}
            className="mt-8 inline-flex justify-center rounded-full bg-[#f59e0b] px-8 py-4 text-lg font-black text-white transition hover:bg-[#d97706]"
          >
            無料で学習計画を作る
          </Link>
        </div>
      </section>
    </main>
  );
}
