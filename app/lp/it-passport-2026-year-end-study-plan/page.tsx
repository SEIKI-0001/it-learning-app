import type { Metadata } from "next";
import Link from "next/link";

const pageUrl =
  "https://it-learning-app.vercel.app/lp/it-passport-2026-year-end-study-plan";
const ctaBase = "/onboarding?source=year-end-study-plan-2026";

export const metadata: Metadata = {
  title:
    "ITパスポートを2026年内に受験するには？試験休止前の逆算学習計画【無料】",
  description:
    "ITパスポート試験は2026年12月28日以降に休止予定です。年内受験を目指す人向けに、残り期間別の勉強法、申込み時の注意点、AIで作る逆算学習計画を解説します。",
  keywords: [
    "ITパスポート 2026年 受験",
    "ITパスポート 試験 休止",
    "ITパスポート 年内 合格",
    "ITパスポート 学習計画",
    "ITパスポート 勉強 スケジュール",
    "ITパスポート AI 学習",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートを2026年内に受験するための逆算計画",
    description:
      "試験休止予定日から逆算し、今日から何を学ぶかを整理。無料で自分専用の学習計画を作成できます。",
    type: "website",
    url: pageUrl,
    locale: "ja_JP",
    siteName: "it-learning-app",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポートを2026年内に受験するには？",
    description:
      "残り期間別の勉強法と、試験日から逆算する無料AI学習計画。",
  },
};

const plans = [
  {
    period: "3か月以上ある",
    title: "理解を優先する標準プラン",
    steps: [
      "参考書・解説で全範囲を一周",
      "確認問題で理解できていない分野を特定",
      "公式公開問題と過去問レベル演習",
      "誤答分野を再学習して仕上げる",
    ],
  },
  {
    period: "1〜2か月ある",
    title: "演習を早める短期プラン",
    steps: [
      "要点学習と確認問題を並行",
      "一周を終える前から問題演習を開始",
      "正答率の低い分野へ学習量を集中",
      "本番形式の演習で時間配分を確認",
    ],
  },
  {
    period: "1か月未満",
    title: "得点効率を重視する直前プラン",
    steps: [
      "現在地を問題演習で先に診断",
      "頻出分野と苦手分野を優先",
      "新しい教材を増やさず誤答を反復",
      "受験日を先に確保して毎日の量を固定",
    ],
  },
];

const faqItems = [
  {
    question: "ITパスポート試験は2026年末で終了するのですか？",
    answer:
      "終了ではありません。IPAはシステムリプレースに伴い、2026年12月28日以降の試験休止を予定しています。再開時期など最新情報はIPA公式サイトで確認してください。",
  },
  {
    question: "2026年内に受験するなら、いつ申し込むべきですか？",
    answer:
      "希望する会場や日時が埋まる可能性があるため、学習完了を待たず、受験可能な日程を確認して試験日を先に決める方法が有効です。会場ごとに開催日が異なる点にも注意してください。",
  },
  {
    question: "IT未経験でも年内合格を目指せますか？",
    answer:
      "残り期間と確保できる学習量によります。まず確認問題で現在地を把握し、全員一律の勉強時間ではなく、理解度に応じて学習範囲と復習量を調整することが重要です。",
  },
  {
    question: "it-learning-appは何をしてくれますか？",
    answer:
      "試験日、学習可能時間、現在の理解度をもとに、毎日の学習内容を整理します。確認問題や演習結果を使い、次へ進むか復習するかを判断しやすくします。",
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
  name: "ITパスポート2026年内受験・逆算学習計画",
  description:
    "2026年末の試験休止予定を踏まえ、年内受験を目指す人向けに残り期間別の学習計画を解説するページです。",
  url: pageUrl,
  inLanguage: "ja-JP",
  datePublished: "2026-08-05",
  dateModified: "2026-08-05",
  publisher: { "@type": "Organization", name: "it-learning-app" },
};

export default function YearEndStudyPlanPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f4] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-black tracking-tight text-[#173b4f]">
            it-learning-app
          </Link>
          <Link
            href={`${ctaBase}&position=header`}
            className="rounded-full bg-[#e56b32] px-4 py-2 text-sm font-black text-white transition hover:bg-[#c95320]"
          >
            無料で逆算計画を作る
          </Link>
        </div>
      </header>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_370px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-sm font-black text-[#b94a18]">
              2026年内の受験を検討している方へ
            </p>
            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-[#173b4f] sm:text-6xl">
              試験休止前に、
              <br />
              合格までの道筋を決める。
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-700">
              IPAは、ITパスポート試験を2026年12月28日以降に休止する予定と案内しています。年内受験を目指すなら、勉強を始めるだけでなく、受験日から逆算して「今日やること」を決める必要があります。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={`${ctaBase}&position=hero`}
                className="inline-flex justify-center rounded-full bg-[#e56b32] px-8 py-4 text-lg font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#c95320]"
              >
                無料で自分専用の計画を作る
              </Link>
              <span className="text-center text-sm font-bold text-slate-500">
                試験日・学習時間を入力するだけ
              </span>
            </div>
          </div>

          <aside className="rounded-[30px] bg-[#173b4f] p-7 text-white shadow-2xl">
            <p className="text-sm font-black text-orange-200">2026年8月5日時点</p>
            <p className="mt-4 text-2xl font-black leading-10">
              休止予定日は全国一律の最終受験日とは限りません。
            </p>
            <p className="mt-5 text-sm leading-7 text-slate-200">
              試験会場によって開催日が異なり、12月27日以前に受験できなくなる場合があります。希望会場の空席と日程は、必ず公式申込サイトで確認してください。
            </p>
            <a
              href="https://www.ipa.go.jp/shiken/mousikomi/cbt_ip.html"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex font-black text-orange-200 underline underline-offset-4"
            >
              IPA公式の試験情報を確認する
            </a>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-black text-[#b94a18]">最初にやる3つのこと</p>
        <h2 className="mt-3 text-3xl font-black text-[#173b4f] sm:text-4xl">
          教材を開く前に、受験までの枠を決める
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ["01", "受験可能日を確認", "希望会場の開催日と空席を確認し、現実的な受験候補日を決めます。"],
            ["02", "現在地を診断", "確認問題を解き、既に理解している分野と、学び直す分野を分けます。"],
            ["03", "毎日の量へ分解", "残り日数に合わせて、インプット・演習・復習を日単位のタスクにします。"],
          ].map(([number, title, body]) => (
            <article key={number} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-3xl font-black text-orange-200">{number}</p>
              <h3 className="mt-4 text-xl font-black text-[#173b4f]">{title}</h3>
              <p className="mt-4 leading-7 text-slate-700">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#edf4f5] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black text-[#17658d]">残り期間別</p>
          <h2 className="mt-3 text-3xl font-black text-[#173b4f] sm:text-4xl">
            同じ勉強法を全員に当てはめない
          </h2>
          <p className="mt-5 max-w-3xl leading-8 text-slate-700">
            確保できる期間によって、理解を深める時間と問題演習へ移るタイミングは変わります。以下は計画を作る際の基本形です。
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.period} className="rounded-[26px] bg-white p-7 shadow-sm">
                <p className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-sm font-black text-[#17658d]">
                  {plan.period}
                </p>
                <h3 className="mt-5 text-xl font-black text-[#173b4f]">{plan.title}</h3>
                <ol className="mt-6 space-y-4">
                  {plan.steps.map((step, index) => (
                    <li key={step} className="flex gap-3 leading-7 text-slate-700">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#173b4f] text-xs font-black text-white">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black text-[#b94a18]">時間ではなく理解度で調整</p>
            <h2 className="mt-3 text-3xl font-black text-[#173b4f] sm:text-4xl">
              計画どおり進まなくても、作り直せる
            </h2>
            <p className="mt-6 leading-8 text-slate-700">
              学習前の計画には時間と量を使います。しかし、実際に次へ進めるかは、勉強した時間ではなく、確認問題や演習で理解できているかを基準に判断する方が合理的です。
            </p>
            <p className="mt-4 leading-8 text-slate-700">
              it-learning-appは、試験日から毎日の学習内容を整理し、演習結果をもとに復習が必要な分野を見つけやすくします。
            </p>
          </div>
          <div className="rounded-[30px] bg-[#173b4f] p-7 text-white sm:p-9">
            <p className="text-sm font-black text-orange-200">it-learning-appで整理できること</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "試験日から逆算した計画",
                "今日取り組む学習タスク",
                "確認問題による理解度チェック",
                "苦手分野の可視化",
                "復習する内容の優先順位",
                "公式公開問題を使った演習",
              ].map((item) => (
                <li key={item} className="rounded-2xl bg-white/10 p-4 font-bold">
                  ✓ {item}
                </li>
              ))}
            </ul>
            <Link
              href={`${ctaBase}&position=mid`}
              className="mt-7 inline-flex w-full justify-center rounded-full bg-[#e56b32] px-6 py-4 font-black text-white transition hover:bg-[#c95320]"
            >
              年内受験の学習計画を作る
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-black text-[#17658d]">よくある質問</p>
          <h2 className="mt-3 text-3xl font-black text-[#173b4f] sm:text-4xl">
            2026年内受験について
          </h2>
          <div className="mt-8 space-y-4">
            {faqItems.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-slate-200 bg-[#f7f8f4] p-6">
                <summary className="cursor-pointer list-none font-black text-[#173b4f]">
                  {item.question}
                </summary>
                <p className="mt-4 leading-8 text-slate-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#173b4f] px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black text-orange-200">受験日が決まれば、今日やることが決まる</p>
          <h2 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
            年内合格への逆算計画を、無料で作成
          </h2>
          <p className="mx-auto mt-6 max-w-2xl leading-8 text-slate-200">
            試験日、平日・休日に使える時間、現在の学習状況を入力し、毎日の学習を具体的なタスクへ分解します。
          </p>
          <Link
            href={`${ctaBase}&position=bottom`}
            className="mt-8 inline-flex justify-center rounded-full bg-[#e56b32] px-9 py-4 text-lg font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#c95320]"
          >
            無料で自分専用の計画を作る
          </Link>
          <p className="mt-4 text-xs text-slate-400">
            試験日程・休止情報は変更される可能性があります。申込み前にIPA公式情報をご確認ください。
          </p>
        </div>
      </section>
    </main>
  );
}
