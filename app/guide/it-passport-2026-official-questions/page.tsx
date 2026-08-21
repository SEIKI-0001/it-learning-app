import type { Metadata } from "next";
import Link from "next/link";

const pageUrl =
  "https://it-learning-app.vercel.app/guide/it-passport-2026-official-questions";
const officialQuestionsUrl =
  "https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/questions.html";

export const metadata: Metadata = {
  title:
    "ITパスポート令和8年度公開問題の使い方｜100問を合格につなげる勉強法【2026年版】",
  description:
    "ITパスポート令和8年度公開問題を、解いて終わりにせず合格へつなげる方法を解説。初回演習、誤答分析、分野別復習、再挑戦までの進め方と、AI学習計画の活用法を紹介します。",
  keywords: [
    "ITパスポート 令和8年度 公開問題",
    "ITパスポート 2026 過去問",
    "ITパスポート 過去問 勉強法",
    "ITパスポート 公開問題 解説",
    "ITパスポート AI 学習",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title:
      "ITパスポート令和8年度公開問題の使い方｜100問を合格につなげる勉強法",
    description:
      "令和8年度公開問題を使って、弱点発見から復習、再挑戦までを進める実践ガイドです。",
    type: "article",
    url: pageUrl,
    locale: "ja_JP",
    siteName: "it-learning-app",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート令和8年度公開問題の使い方【2026年版】",
    description:
      "100問を解いて終わりにしない。誤答分析と復習計画で合格につなげる方法を解説します。",
  },
};

const faqItems = [
  {
    question: "令和8年度公開問題は何問ありますか？",
    answer:
      "IPAが公開している令和8年度分は100問です。まずは時間を測らずに解き、分からない問題と迷った問題も記録すると復習に活かせます。",
  },
  {
    question: "公開問題だけを繰り返せば合格できますか？",
    answer:
      "公開問題は重要な演習材料ですが、同じ問題の答えを覚えるだけでは未知の問題に対応しにくくなります。誤答の原因を用語不足・理解不足・読み違いに分け、関連テーマまで復習することが必要です。",
  },
  {
    question: "最初から120分で解くべきですか？",
    answer:
      "初回は時間よりも現在地の把握を優先して構いません。基礎学習後は、本番を想定して120分で通し演習を行い、時間配分も確認します。",
  },
  {
    question: "AIは公開問題の学習にどう使えますか？",
    answer:
      "間違えた理由の整理、関連用語の説明、復習順の提案に活用できます。ただし、公式の問題文・正答はIPAの公開情報を基準に確認してください。",
  },
];

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "ITパスポート令和8年度公開問題の使い方｜100問を合格につなげる勉強法【2026年版】",
  description:
    "ITパスポート令和8年度公開問題を使った、初回演習・誤答分析・分野別復習・再挑戦の進め方を解説します。",
  datePublished: "2026-08-01",
  dateModified: "2026-08-01",
  inLanguage: "ja-JP",
  author: { "@type": "Organization", name: "it-learning-app編集部" },
  publisher: { "@type": "Organization", name: "it-learning-app" },
  mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

const steps = [
  {
    number: "01",
    title: "最初の100問で現在地を測る",
    body: "初回は点数を競うより、分からない問題・迷った問題・根拠を説明できない正解を見つけます。正解でも偶然選べた問題は復習対象です。",
  },
  {
    number: "02",
    title: "誤答を3種類に分ける",
    body: "用語を知らなかった、仕組みを理解していなかった、設問を読み違えた、の3種類に分類します。原因が違えば、必要な復習も変わります。",
  },
  {
    number: "03",
    title: "関連テーマまで戻って復習する",
    body: "1問の答えだけを覚えず、同じテーマの確認問題や用語まで戻ります。ストラテジ・マネジメント・テクノロジのどこに弱点が偏っているかも確認します。",
  },
  {
    number: "04",
    title: "間隔を空けて再挑戦する",
    body: "復習直後ではなく数日空けて解き直し、理由まで説明できるか確認します。最後は120分で通し演習を行い、本番の時間配分を整えます。",
  },
];

export default function OfficialQuestionsGuidePage() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="border-b border-sky-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="font-black text-[#12384d]">
            it-learning-app
          </Link>
          <Link
            href="/onboarding?source=official-questions-2026&position=header"
            className="rounded-full bg-[#f59e0b] px-4 py-2 text-sm font-black text-white transition hover:bg-[#d97706]"
          >
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-sm font-black text-[#17658d]">
              令和8年度・公式公開問題100問対応ガイド
            </p>
            <h1 className="mt-6 text-4xl font-black leading-tight text-[#12384d] sm:text-6xl">
              公開問題は、
              <br />
              解いた後が本番です。
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-700">
              ITパスポートの令和8年度公開問題は、現在の実力と弱点を知るための重要な教材です。ただし、100問の答えを覚えるだけでは、初めて見る問題への対応力は伸びません。初回演習、誤答分析、分野別復習、再挑戦の順で合格につなげます。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/onboarding?source=official-questions-2026&position=hero"
                className="inline-flex justify-center rounded-full bg-[#f59e0b] px-7 py-4 font-black text-white transition hover:bg-[#d97706]"
              >
                無料で自分専用の復習計画を作る
              </Link>
              <a
                href={officialQuestionsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex justify-center rounded-full border-2 border-[#17658d] px-7 py-4 font-black text-[#17658d] transition hover:bg-sky-50"
              >
                IPA公式の公開問題を見る
              </a>
            </div>
          </div>

          <aside className="rounded-[28px] bg-[#12384d] p-7 text-white shadow-xl">
            <p className="text-sm font-black text-sky-200">このページで分かること</p>
            <ul className="mt-5 space-y-4 text-sm leading-7">
              <li>✓ 100問を解く最適なタイミング</li>
              <li>✓ 正解でも復習すべき問題の見分け方</li>
              <li>✓ 間違いを次の学習へつなげる分類法</li>
              <li>✓ AIを使って復習計画を作る方法</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-black text-[#17658d]">結論</p>
        <h2 className="mt-3 text-3xl font-black text-[#12384d] sm:text-4xl">
          点数ではなく「次に何を直すか」を持ち帰る
        </h2>
        <p className="mt-6 text-base leading-8 text-slate-700">
          公開問題を解く目的は、合格点を一度超えることではありません。知らない用語、曖昧な理解、読み違いの癖を見つけ、次の学習内容を決めることです。正答率だけで判断せず、根拠を説明できたかまで確認すると、未知の問題にも対応しやすくなります。
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {steps.map((step) => (
            <article
              key={step.number}
              className="rounded-[24px] border border-sky-100 bg-white p-6 shadow-[0_14px_35px_rgba(18,56,77,0.07)]"
            >
              <p className="text-sm font-black text-[#f59e0b]">STEP {step.number}</p>
              <h3 className="mt-3 text-xl font-black text-[#12384d]">{step.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-700">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#eaf5fb] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black text-[#17658d]">よくある失敗</p>
          <h2 className="mt-3 text-3xl font-black text-[#12384d] sm:text-4xl">
            公開問題を「答え合わせ」で終わらせない
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              [
                "同じ問題を連続で解く",
                "短期記憶で正解できても、理解が定着したとは限りません。数日空けて再確認します。",
              ],
              [
                "正解した問題を全部除外する",
                "勘で選んだ問題、二択までしか絞れなかった問題も復習対象に含めます。",
              ],
              [
                "点数だけで計画を決める",
                "総合点が同じでも弱点分野は人によって異なります。分野と誤答原因を見て優先順位を決めます。",
              ],
            ].map(([title, body]) => (
              <article key={title} className="rounded-[22px] bg-white p-6">
                <h3 className="text-lg font-black text-[#12384d]">{title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-700">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="rounded-[28px] bg-white p-7 shadow-[0_18px_45px_rgba(18,56,77,0.09)] sm:p-10">
          <p className="text-sm font-black text-[#17658d]">it-learning-appでできること</p>
          <h2 className="mt-3 text-3xl font-black text-[#12384d] sm:text-4xl">
            誤答を、明日の学習メニューへ変える
          </h2>
          <p className="mt-6 text-base leading-8 text-slate-700">
            it-learning-appは、試験日、使える学習時間、確認問題や演習の結果をもとに、学習順と復習内容を整理するITパスポート学習支援アプリです。公開問題で見つけた弱点を放置せず、確認問題、用語復習、過去問レベル演習へつなげます。
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "試験日から逆算した学習計画",
              "毎日の具体的な学習タスク",
              "確認問題による理解度チェック",
              "苦手分野と復習優先度の可視化",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-[#f4f8fb] p-4 font-bold text-[#12384d]">
                ✓ {item}
              </div>
            ))}
          </div>
          <Link
            href="/onboarding?source=official-questions-2026&position=mid"
            className="mt-8 inline-flex w-full justify-center rounded-full bg-[#f59e0b] px-7 py-4 font-black text-white transition hover:bg-[#d97706] sm:w-auto"
          >
            無料で今日の復習メニューを作る
          </Link>
        </div>
      </section>

      <section className="border-t border-sky-100 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black text-[#12384d]">よくある質問</h2>
          <div className="mt-8 space-y-4">
            {faqItems.map((item) => (
              <details key={item.question} className="rounded-2xl border border-sky-100 p-5">
                <summary className="cursor-pointer font-black text-[#12384d]">
                  {item.question}
                </summary>
                <p className="mt-4 text-sm leading-7 text-slate-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#12384d] px-4 py-14 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black text-sky-200">公開問題を解いた次の日から変える</p>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">
            あなたの弱点に合わせた学習計画を、無料で。
          </h2>
          <p className="mx-auto mt-6 max-w-2xl leading-8 text-sky-50">
            試験日と現在の学習状況を入力すると、今日取り組む内容を整理できます。公開問題の結果を、合格までの具体的な行動へつなげましょう。
          </p>
          <Link
            href="/onboarding?source=official-questions-2026&position=bottom"
            className="mt-8 inline-flex rounded-full bg-[#f59e0b] px-8 py-4 font-black text-white transition hover:bg-[#d97706]"
          >
            無料でit-learning-appを始める
          </Link>
        </div>
      </section>
    </main>
  );
}
