import type { Metadata } from "next";
import Link from "next/link";

const pageUrl =
  "https://it-learning-app.vercel.app/compare/it-passport-study-tools-2026";
const ctaBase = "/onboarding?source=study-tools-comparison-2026";

export const metadata: Metadata = {
  title:
    "ITパスポート勉強法を比較｜参考書・過去問アプリ・ChatGPT・AI学習アプリ【2026年版】",
  description:
    "ITパスポート対策に使える参考書、過去問アプリ、ChatGPT、AI学習アプリを比較。初心者・短期合格・スキマ時間学習など目的別に、最適な組み合わせを解説します。",
  keywords: [
    "ITパスポート 勉強法 比較",
    "ITパスポート 学習アプリ",
    "ITパスポート ChatGPT",
    "ITパスポート 過去問 アプリ",
    "ITパスポート AI 学習",
    "ITパスポート 独学",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポート勉強法を4タイプで比較【2026年版】",
    description:
      "参考書・過去問アプリ・ChatGPT・AI学習アプリの違いを、理解・演習・計画・復習の観点で比較します。",
    type: "website",
    url: pageUrl,
    locale: "ja_JP",
    siteName: "it-learning-app",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート勉強法を比較【2026年版】",
    description:
      "自分に合う学習手段が3分で分かる。参考書、過去問、ChatGPT、AI学習アプリを比較。",
  },
};

const comparisonRows = [
  {
    item: "参考書",
    understanding: "◎",
    practice: "△",
    planning: "△",
    review: "△",
    bestFor: "初学者・体系的に学びたい人",
  },
  {
    item: "過去問アプリ",
    understanding: "○",
    practice: "◎",
    planning: "△",
    review: "○",
    bestFor: "問題演習を増やしたい人",
  },
  {
    item: "ChatGPTなどのAIチャット",
    understanding: "◎",
    practice: "○",
    planning: "△",
    review: "△",
    bestFor: "分からない用語をすぐ質問したい人",
  },
  {
    item: "AI学習管理アプリ",
    understanding: "○",
    practice: "○",
    planning: "◎",
    review: "◎",
    bestFor: "独学全体を迷わず進めたい人",
  },
];

const faqItems = [
  {
    question: "ITパスポートはアプリだけで合格できますか？",
    answer:
      "問題演習中心のアプリだけでは、初めて学ぶ概念の理解や学習順の設計が不足する場合があります。参考書や解説教材で理解し、過去問で確認し、学習管理アプリで計画と復習を管理する組み合わせが現実的です。",
  },
  {
    question: "ChatGPTだけでITパスポートを勉強できますか？",
    answer:
      "用語の言い換えや追加説明には有効ですが、出題範囲の網羅、回答の正確性確認、進捗管理は別途必要です。公式シラバスや信頼できる教材と併用してください。",
  },
  {
    question: "無料の学習ツールは何を組み合わせればよいですか？",
    answer:
      "公式公開問題、無料のAIチャット、学習計画を管理できるサービスを役割分担して使う方法があります。重要なのは、理解・演習・復習・計画の4つを欠かさないことです。",
  },
  {
    question: "it-learning-appは参考書の代わりになりますか？",
    answer:
      "参考書の完全な代替ではなく、教材学習を進める順番、確認問題、苦手分野、復習タイミングをまとめて管理するための学習支援アプリです。参考書や公式公開問題との併用を想定しています。",
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
  name: "ITパスポート勉強法・学習ツール比較",
  description:
    "参考書、過去問アプリ、AIチャット、AI学習管理アプリを比較し、目的別の選び方を解説するページです。",
  url: pageUrl,
  inLanguage: "ja-JP",
  datePublished: "2026-08-04",
  dateModified: "2026-08-04",
  publisher: { "@type": "Organization", name: "it-learning-app" },
};

export default function ItPassportStudyToolsComparisonPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-800">
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
            className="rounded-full bg-[#f59e0b] px-4 py-2 text-sm font-black text-white transition hover:bg-[#d97706]"
          >
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-sm font-black text-[#17658d]">
            2026年版・ITパスポート独学者向け
          </p>
          <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <h1 className="text-4xl font-black leading-tight tracking-tight text-[#173b4f] sm:text-6xl">
                参考書、過去問、AI。
                <br />
                結局どれを使えばいい？
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-700">
                ITパスポート学習には、参考書、過去問アプリ、ChatGPTなどのAIチャット、学習管理アプリがあります。重要なのは「一番人気のツール」を選ぶことではなく、理解・演習・復習・計画の役割を埋めることです。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={`${ctaBase}&position=hero`}
                  className="inline-flex justify-center rounded-full bg-[#f59e0b] px-8 py-4 text-lg font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#d97706]"
                >
                  無料で自分専用の学習計画を作る
                </Link>
                <span className="text-center text-sm font-bold text-slate-500">
                  登録前の入力は約1分
                </span>
              </div>
            </div>

            <aside className="rounded-[30px] bg-[#173b4f] p-7 text-white shadow-2xl">
              <p className="text-sm font-black text-sky-200">先に結論</p>
              <p className="mt-4 text-2xl font-black leading-10">
                1つに絞るより、役割を分けて組み合わせる方が効率的です。
              </p>
              <div className="mt-6 space-y-3 text-sm font-bold">
                <p className="rounded-2xl bg-white/10 p-4">理解：参考書・AIチャット</p>
                <p className="rounded-2xl bg-white/10 p-4">演習：過去問アプリ</p>
                <p className="rounded-2xl bg-white/10 p-4">計画・復習：学習管理アプリ</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-black text-[#17658d]">4タイプ比較</p>
        <h2 className="mt-3 text-3xl font-black text-[#173b4f] sm:text-4xl">
          学習手段ごとに得意分野が違う
        </h2>
        <p className="mt-5 max-w-3xl leading-8 text-slate-700">
          以下は、一般的な使い方を前提にした比較です。◎は得意、○は対応可能、△は別の手段で補いたい項目を示します。
        </p>

        <div className="mt-8 overflow-x-auto rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[820px] w-full border-collapse text-left text-sm">
            <thead className="bg-[#173b4f] text-white">
              <tr>
                {[
                  "学習手段",
                  "理解",
                  "演習",
                  "計画",
                  "復習管理",
                  "向いている人",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-4 font-black">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.item} className="border-t border-slate-200">
                  <th className="px-5 py-5 font-black text-[#173b4f]">{row.item}</th>
                  <td className="px-5 py-5 text-lg font-black">{row.understanding}</td>
                  <td className="px-5 py-5 text-lg font-black">{row.practice}</td>
                  <td className="px-5 py-5 text-lg font-black">{row.planning}</td>
                  <td className="px-5 py-5 text-lg font-black">{row.review}</td>
                  <td className="px-5 py-5 leading-6 text-slate-700">{row.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-[#eaf5fb] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black text-[#17658d]">目的別の選び方</p>
          <h2 className="mt-3 text-3xl font-black text-[#173b4f] sm:text-4xl">
            あなたの状況なら、この組み合わせ
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "IT未経験・初学者",
                tools: "参考書＋AIチャット＋学習管理",
                body: "まず全体像を参考書でつかみ、理解できない部分だけAIに質問。毎日の範囲と復習日を学習管理アプリで固定します。",
              },
              {
                title: "試験まで1〜2か月",
                tools: "要点教材＋過去問＋学習管理",
                body: "全範囲を短期間で一周し、早めに問題演習へ移行。正答率の低い分野へ学習時間を再配分します。",
              },
              {
                title: "一度挫折した人",
                tools: "少量タスク＋確認問題＋復習管理",
                body: "長時間学習を前提にせず、今日やる量を小さく固定。取り組んだ時間ではなく、問題結果で次へ進むか判断します。",
              },
            ].map((item) => (
              <article key={item.title} className="rounded-[24px] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-black text-[#173b4f]">{item.title}</h3>
                <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-800">
                  {item.tools}
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-700">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-black text-[#17658d]">AIチャットを使う際の注意点</p>
        <h2 className="mt-3 text-3xl font-black text-[#173b4f] sm:text-4xl">
          AIは「先生」ではなく、理解を助ける補助役にする
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {[
            [
              "回答をそのまま暗記しない",
              "AIの説明は分かりやすくても、誤りや試験範囲外の内容を含む可能性があります。公式シラバスや信頼できる教材で確認しましょう。",
            ],
            [
              "質問の目的を明確にする",
              "『教えて』だけでなく、『IT未経験者向けに例を使って』『この選択肢が誤りの理由を説明して』と指定すると学習に使いやすくなります。",
            ],
            [
              "進捗管理は別に持つ",
              "会話履歴が増えても、試験日までの残り範囲や復習優先度が自動で整理されるとは限りません。",
            ],
            [
              "必ず問題演習につなげる",
              "説明を読んで分かった感覚だけで終えず、確認問題を解いて自力で判断できるか確かめます。",
            ],
          ].map(([title, body]) => (
            <article key={title} className="rounded-[22px] border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-black text-[#173b4f]">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#173b4f] px-4 py-14 text-white sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="text-sm font-black text-sky-200">it-learning-appの役割</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              教材を増やすより、学習全体をつなげる
            </h2>
            <p className="mt-5 max-w-3xl leading-8 text-slate-200">
              it-learning-appは、試験日から逆算した計画、毎日のタスク、確認問題、単語復習、苦手分野の把握を一つにつなげます。計画には時間と学習量を使い、次へ進む判断には問題結果と理解度を使います。
            </p>
          </div>
          <div className="rounded-[28px] bg-white p-7 text-slate-800">
            <p className="font-black text-[#173b4f]">無料で作成できるもの</p>
            <ul className="mt-5 space-y-3 text-sm font-bold text-slate-700">
              <li>・試験日までの学習ロードマップ</li>
              <li>・今日取り組む具体的な学習タスク</li>
              <li>・確認問題に基づく復習優先度</li>
              <li>・参考書と過去問を使うタイミング</li>
            </ul>
            <Link
              href={`${ctaBase}&position=mid`}
              className="mt-7 inline-flex w-full justify-center rounded-full bg-[#f59e0b] px-6 py-4 font-black text-white transition hover:bg-[#d97706]"
            >
              自分専用の計画を作る
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-black text-[#17658d]">よくある質問</p>
        <h2 className="mt-3 text-3xl font-black text-[#173b4f] sm:text-4xl">
          学習ツール選びのFAQ
        </h2>
        <div className="mt-8 space-y-4">
          {faqItems.map((item) => (
            <article key={item.question} className="rounded-[22px] border border-slate-200 bg-white p-6">
              <h3 className="font-black text-[#173b4f]">Q. {item.question}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">A. {item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-[32px] bg-[#f59e0b] p-8 text-center text-white shadow-xl sm:p-12">
          <p className="text-sm font-black text-amber-100">参考書・過去問・AIを無駄なく使う</p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            今日からの学習順を、無料で整理しませんか？
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-8 text-amber-50">
            試験日、学習可能時間、現在の理解度を入力すると、あなた向けの学習ロードマップを作成できます。
          </p>
          <Link
            href={`${ctaBase}&position=bottom`}
            className="mt-8 inline-flex rounded-full bg-white px-8 py-4 text-lg font-black text-[#b45309] transition hover:-translate-y-0.5"
          >
            無料で学習計画を作成する
          </Link>
        </div>
      </section>
    </main>
  );
}
