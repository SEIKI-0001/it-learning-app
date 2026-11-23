import type { Metadata } from "next";
import Link from "next/link";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/compare/it-passport-chatgpt-vs-ai-study-app-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "chatgpt-vs-ai-study-app-2026";

export const metadata: Metadata = {
  title: "ITパスポート勉強はChatGPTだけで十分？専用AI学習アプリと比較【2026年】",
  description:
    "ITパスポート学習でChatGPTと専用AI学習アプリはどう使い分ける？質問対応、学習計画、弱点管理、問題演習、復習のしやすさを比較し、効率的な組み合わせ方を解説します。",
  keywords: [
    "ITパスポート ChatGPT",
    "ITパスポート AI 勉強",
    "ITパスポート AI アプリ",
    "ITパスポート 学習アプリ",
    "ITパスポート 勉強法 2026",
    "ITパスポート 生成AI",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポート勉強はChatGPTだけで十分？専用AI学習アプリと比較",
    description:
      "自由な質問に強いChatGPTと、計画・弱点管理・反復学習に強い専用アプリ。役割の違いから最適な使い分けを整理します。",
    type: "website",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatGPT vs ITパスポート専用AI学習アプリ",
    description:
      "ITパスポート学習で何をAIに任せ、何を専用アプリで管理するべきかを比較。",
  },
};

const comparisonRows = [
  {
    item: "わからない用語への質問",
    chatgpt: "◎ 自由に質問しやすい",
    app: "○ 学習文脈に沿って使いやすい",
  },
  {
    item: "試験日からの学習計画",
    chatgpt: "△ 毎回条件を伝える必要がある",
    app: "◎ 計画として継続管理しやすい",
  },
  {
    item: "弱点の蓄積・追跡",
    chatgpt: "△ 会話だけでは散らばりやすい",
    app: "◎ 学習履歴と結びつけやすい",
  },
  {
    item: "問題演習との連携",
    chatgpt: "○ 類題作成には向く",
    app: "◎ 演習→判定→復習をつなげやすい",
  },
  {
    item: "復習のタイミング管理",
    chatgpt: "△ 自分で管理が必要",
    app: "○ 学習計画に組み込みやすい",
  },
];

const useCases = [
  {
    title: "ChatGPTが向く場面",
    items: [
      "DNSや公開鍵暗号を初心者向けに言い換えてほしい",
      "RTOとRPOの違いを具体例で比較したい",
      "間違えた理由を伝えて、類題を1問作ってほしい",
    ],
  },
  {
    title: "専用AI学習アプリが向く場面",
    items: [
      "試験日までに何をどの順番で進めるか決めたい",
      "ストラテジ・マネジメント・テクノロジの弱点を残したい",
      "問題を解いた結果から、次の復習対象を決めたい",
    ],
  },
];

const faq = [
  {
    question: "ITパスポートはChatGPTだけで勉強できますか？",
    answer:
      "用語理解や質問対応には便利ですが、試験日までの進捗、弱点、復習対象を継続的に管理するには別の仕組みが必要です。ChatGPTを説明役、学習アプリを計画・記録役として使い分ける方法が実践的です。",
  },
  {
    question: "ChatGPTにITパスポートの問題を作らせてもいいですか？",
    answer:
      "理解確認用の類題作成には使えます。ただしAI生成問題には誤りが含まれる可能性があるため、試験範囲や正確な知識の確認にはIPAの現行シラバスや公開問題など一次情報を併用してください。",
  },
  {
    question: "2026年のITパスポートは生成AIも出題範囲ですか？",
    answer:
      "はい。IPAは生成AIの仕組み、活用例、留意事項などをシラバスに追加し、2024年4月の試験から適用しています。2026年8月時点の現行シラバスはVer.6.5です。",
  },
  {
    question: "it-learning-appは何に使えますか？",
    answer:
      "ITパスポート学習の計画作成、問題演習、進捗・弱点の把握、AIを使った理解確認などを、学習の流れとしてまとめて使うことを目的としたWebアプリです。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: "ITパスポート勉強はChatGPTだけで十分？専用AI学習アプリと比較【2026年】",
      description:
        "ChatGPTとITパスポート専用AI学習アプリの違いを、質問対応・計画・弱点管理・演習・復習の観点から比較。",
      url: pageUrl,
      inLanguage: "ja-JP",
      datePublished: "2026-08-26",
      dateModified: "2026-08-26",
    },
    {
      "@type": "SoftwareApplication",
      name: "it-learning-app",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: `${siteUrl.replace(/\/$/, "")}/`,
      description:
        "ITパスポート受験者向けに、学習計画、問題演習、進捗・弱点の把握、AI学習支援を提供するWebアプリ。",
    },
    {
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ],
};

export default function ChatGptVsAiStudyAppPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="font-black text-[#17384d]">
            it-learning-app
          </Link>
          <Link
            href={`/onboarding?source=${source}&position=header`}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-black text-white transition hover:bg-amber-600"
          >
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <p className="inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
            2026年版｜ITパスポート × AI学習比較
          </p>
          <h1 className="mt-6 max-w-5xl text-[38px] font-black leading-[1.12] text-[#17384d] sm:text-6xl">
            ITパスポート勉強は
            <span className="text-indigo-600">ChatGPTだけで十分？</span>
          </h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-slate-700 sm:text-lg">
            ChatGPTは、わからない用語をその場で聞ける強力な学習ツールです。一方で、試験日までの計画、3分野の弱点、復習対象まで毎日管理するには工夫が必要です。ここでは、汎用AIとITパスポート専用AI学習アプリの役割を比較します。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/onboarding?source=${source}&position=hero`}
              className="inline-flex justify-center rounded-full bg-amber-500 px-7 py-4 text-base font-black text-white transition hover:bg-amber-600"
            >
              無料で自分専用の学習計画を作る
            </Link>
            <a
              href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex justify-center rounded-full border-2 border-slate-300 px-7 py-4 text-base font-black text-slate-700 transition hover:bg-slate-50"
            >
              IPA最新シラバスを確認
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-4xl">
          <p className="text-sm font-black text-indigo-700">結論</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#17384d] sm:text-5xl">
            AIは「どちらか1つ」ではなく、役割で分ける。
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-700">
            ChatGPTの強みは、質問の自由度です。理解できない概念を自分のレベルに合わせて説明してもらう用途に向いています。一方、資格勉強では「今日何をやるか」「どこが弱いか」「復習できたか」を継続して管理する必要があります。その部分は試験学習に特化したアプリの方が扱いやすくなります。
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left">
              <thead className="bg-[#17384d] text-white">
                <tr>
                  <th className="px-5 py-4 text-sm font-black">比較項目</th>
                  <th className="px-5 py-4 text-sm font-black">ChatGPT</th>
                  <th className="px-5 py-4 text-sm font-black">専用AI学習アプリ</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.item} className="border-t border-slate-200 align-top">
                    <th className="px-5 py-4 text-sm font-black text-[#17384d]">{row.item}</th>
                    <td className="px-5 py-4 text-sm leading-6 text-slate-700">{row.chatgpt}</td>
                    <td className="px-5 py-4 text-sm leading-6 text-slate-700">{row.app}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-indigo-50 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-2">
            {useCases.map((group) => (
              <article key={group.title} className="rounded-[26px] bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
                <h2 className="text-2xl font-black text-[#17384d]">{group.title}</h2>
                <ul className="mt-5 space-y-4">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-7 text-slate-700">
                      <span className="mt-1 font-black text-indigo-600">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div>
            <p className="text-sm font-black text-indigo-700">おすすめの使い分け</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#17384d] sm:text-5xl">
              「計画→演習→AI質問→再演習」で回す。
            </h2>
            <ol className="mt-8 space-y-5">
              {[
                "試験日から逆算して、今週の学習範囲を決める",
                "問題を解き、誤答と迷った正解を弱点として残す",
                "理解できない部分だけChatGPTやAI解説で深掘りする",
                "別問題でもう一度確認し、弱点が解消したか判定する",
              ].map((item, index) => (
                <li key={item} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm font-bold leading-7 text-slate-700">{item}</p>
                </li>
              ))}
            </ol>
          </div>

          <aside className="rounded-[30px] bg-[#17384d] p-7 text-white shadow-[0_28px_70px_rgba(15,23,42,0.2)]">
            <p className="text-sm font-black text-indigo-200">it-learning-app</p>
            <h3 className="mt-3 text-3xl font-black leading-tight">
              「次に何を勉強する？」を毎回考えない。
            </h3>
            <p className="mt-5 text-sm leading-7 text-slate-200">
              学習計画、問題演習、進捗・弱点の把握、AIを使った理解確認を、別々の作業ではなく1つの学習ループとして進めるためのITパスポート学習支援アプリです。
            </p>
            <Link
              href={`/onboarding?source=${source}&position=mid`}
              className="mt-7 inline-flex w-full justify-center rounded-full bg-amber-500 px-6 py-4 text-sm font-black text-white transition hover:bg-amber-600"
            >
              無料で学習計画を作る
            </Link>
          </aside>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-4xl">
          <p className="text-sm font-black text-indigo-700">2026年受験者向け</p>
          <h2 className="mt-3 text-3xl font-black text-[#17384d]">AIの回答だけで試験範囲を判断しない。</h2>
          <p className="mt-5 text-base leading-8 text-slate-700">
            IPAは生成AIの仕組み・活用例・留意事項などをITパスポートのシラバスに追加し、2024年4月の試験から適用しています。2026年8月時点の現行シラバスはVer.6.5です。AIは理解を助ける道具として使い、出題範囲や用語の正確性はIPAのシラバスや公開問題でも確認しましょう。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              IPA シラバス
            </a>
            <a
              href="https://www.ipa.go.jp/shiken/syllabus/henkou/2023/20230807.html"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              生成AI項目の追加について
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 className="text-3xl font-black text-[#17384d]">よくある質問</h2>
        <div className="mt-8 space-y-4">
          {faq.map((item) => (
            <details key={item.question} className="rounded-2xl border border-slate-200 bg-white p-5">
              <summary className="cursor-pointer font-black text-[#17384d]">{item.question}</summary>
              <p className="mt-4 text-sm leading-7 text-slate-700">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-[#17384d] px-4 py-14 text-white sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-4xl text-center">
          <p className="text-sm font-black text-indigo-200">AIを使う前に、学習ルートを決める</p>
          <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            試験日と弱点から、次にやることを決めよう。
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-200">
            ChatGPTで質問するだけでは、勉強は自動では進みません。まず学習計画を作り、問題演習で弱点を見つけ、必要なところだけAIで理解を深める流れを作りましょう。
          </p>
          <Link
            href={`/onboarding?source=${source}&position=bottom`}
            className="mt-8 inline-flex justify-center rounded-full bg-amber-500 px-8 py-4 text-base font-black text-white transition hover:bg-amber-600"
          >
            無料で自分専用の学習計画を作る
          </Link>
        </div>
      </section>
    </main>
  );
}
