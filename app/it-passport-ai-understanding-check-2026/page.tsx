import type { Metadata } from "next";
import Link from "next/link";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/it-passport-ai-understanding-check-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;

const source = "ai-understanding-check-2026";

export const metadata: Metadata = {
  title: "ITパスポートの理解度をAIでチェック｜説明できるかで弱点発見【2026年】",
  description:
    "ITパスポート対策で『答えは選べるけど説明できない』を減らす方法を紹介。AI採点を使って理解のあいまいな用語を見つけ、問題演習と弱点復習につなげます。",
  keywords: [
    "ITパスポート AI 勉強",
    "ITパスポート AI 学習",
    "ITパスポート 理解度",
    "ITパスポート 苦手分野",
    "ITパスポート 学習アプリ",
    "ITパスポート 勉強法 2026",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートの理解度をAIでチェック",
    description:
      "正解を覚えたかではなく、意味を説明できるかで理解度を確認。AIを使った弱点発見の学習法を紹介します。",
    type: "website",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポートの理解度をAIでチェック",
    description:
      "説明できない用語を見つけ、次の復習へ。AIを使ったITパスポート学習法。",
  },
};

const steps = [
  {
    number: "01",
    title: "問題を解いて、迷ったテーマを拾う",
    text: "正解・不正解だけでなく、勘で選んだ問題や2択で迷った問題も『理解があいまい』として残します。",
  },
  {
    number: "02",
    title: "自分の言葉で説明してみる",
    text: "用語の定義を見ずに、20〜60秒程度で『何のためのものか』『似た用語と何が違うか』を説明します。",
  },
  {
    number: "03",
    title: "AI採点で抜けを確認する",
    text: "重要語が抜けていないか、意味を取り違えていないかをAIのフィードバックで確認します。",
  },
  {
    number: "04",
    title: "関連問題で再チェックする",
    text: "説明を直したら、別の問題で再確認します。答えを覚えただけなのか、知識として使えるのかを切り分けます。",
  },
];

const examples = [
  {
    term: "SaaS / PaaS / IaaS",
    weak: "略語の意味は覚えたが、提供範囲の違いを説明できない",
    check: "『利用者が管理する範囲』を軸に3つを比較して説明する",
  },
  {
    term: "RTO / RPO",
    weak: "どちらも障害復旧の指標だと分かるが、時間とデータ損失が混ざる",
    check: "『いつまでに復旧』『どこまでのデータを戻す』で説明し分ける",
  },
  {
    term: "公開鍵暗号 / 共通鍵暗号",
    weak: "鍵を使うことは分かるが、どの場面で何が違うか曖昧",
    check: "鍵の数・速度・鍵配送の観点で違いを説明する",
  },
];

const faq = [
  {
    question: "ITパスポート試験に記述式問題はありますか？",
    answer:
      "現行のITパスポート試験は多肢選択式です。このページで紹介する記述回答とAI採点は、本番形式を再現するものではなく、用語を自分の言葉で説明して理解の抜けを見つけるための学習トレーニングです。",
  },
  {
    question: "選択問題が解けていれば、説明できなくても大丈夫ですか？",
    answer:
      "本番では選択肢から答えますが、過去問の答えだけを覚えると少し表現が変わった問題で迷いやすくなります。すべてを長文で説明する必要はありませんが、苦手テーマだけでも意味や違いを短く説明できる状態にすると理解確認に使えます。",
  },
  {
    question: "AIに答えを聞くのと何が違いますか？",
    answer:
      "最初に自分で説明してからフィードバックを受ける点が違います。答えを先に見るのではなく、自分の理解を外に出してから不足を確認することで、復習対象を絞りやすくします。",
  },
  {
    question: "it-learning-appでは何ができますか？",
    answer:
      "学習計画、問題演習、進捗管理などに加え、学習用の記述問題へ回答しAIから採点・解説を受ける機能があります。AI採点は本番試験の採点を再現するものではなく、理解度確認の補助として使います。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "ITパスポートの理解度をAIでチェック",
      description:
        "AI採点を使い、ITパスポートの用語を説明できるかで理解度を確認する学習方法を紹介するページ。",
      url: pageUrl,
      inLanguage: "ja-JP",
    },
    {
      "@type": "SoftwareApplication",
      name: "it-learning-app",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description:
        "ITパスポート受験者向けに、学習計画、問題演習、進捗管理、AIを使った理解度確認を支援するWebアプリ。",
      url: `${siteUrl.replace(/\/$/, "")}/`,
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

export default function ItPassportAiUnderstandingCheckPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800">
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
            className="rounded-full bg-[#f59e0b] px-4 py-2 text-sm font-black text-white transition hover:bg-[#d97706]"
          >
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <section className="overflow-hidden bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
              ITパスポート × AI理解度チェック
            </p>
            <h1 className="mt-6 text-[38px] font-black leading-[1.12] text-[#17384d] sm:text-6xl">
              「正解できた」より、
              <span className="text-indigo-600">説明できる</span>を増やす。
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
              過去問で正解しても、理由を聞かれると説明できない。そんな知識は少し表現が変わるだけで迷いやすくなります。苦手な用語だけ自分の言葉で説明し、AIのフィードバックで理解の抜けを見つける学習法を紹介します。
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              ※ 現行ITパスポート試験は多肢選択式です。AI採点は本番形式ではなく、理解確認用の学習トレーニングです。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/onboarding?source=${source}&position=hero`}
                className="inline-flex justify-center rounded-full bg-[#f59e0b] px-7 py-4 text-base font-black text-white transition hover:bg-[#d97706]"
              >
                無料で自分専用の学習計画を作る
              </Link>
              <Link
                href={`/ai-grading?source=${source}&position=hero`}
                className="inline-flex justify-center rounded-full border-2 border-indigo-500 px-7 py-4 text-base font-black text-indigo-700 transition hover:bg-indigo-50"
              >
                AI採点を見てみる
              </Link>
            </div>
          </div>

          <aside className="rounded-[30px] bg-[#172554] p-7 text-white shadow-[0_28px_70px_rgba(23,37,84,0.24)]">
            <p className="text-sm font-black text-indigo-200">理解度チェックの例</p>
            <p className="mt-4 text-lg font-black">Q. RTOとRPOの違いを説明してください。</p>
            <div className="mt-5 rounded-2xl bg-white/10 p-4 text-sm leading-7 text-indigo-50">
              <p className="font-black text-white">あなたの回答</p>
              <p className="mt-1">RTOは復旧までの時間、RPOは復旧するデータの時点を表す指標。</p>
            </div>
            <div className="mt-4 rounded-2xl bg-indigo-400/15 p-4 text-sm leading-7">
              <p className="font-black text-indigo-200">AIフィードバックの使い方</p>
              <p className="mt-1 text-indigo-50">不足している観点を確認 → 定義を修正 → 類題で再確認</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-4xl">
          <p className="text-sm font-black text-indigo-700">なぜ「説明する」のか</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#17384d] sm:text-5xl">
            過去問の答えを覚えるだけでは、弱点が見えにくい。
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-700">
            ITパスポートはストラテジ系・マネジメント系・テクノロジ系を幅広く学ぶため、似た略語や概念が増えるほど「見たことはある」状態になりがちです。そこで、迷ったテーマだけ短く説明してみると、知っている部分と説明できない部分を分けやすくなります。
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {steps.map((step) => (
            <article
              key={step.number}
              className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
            >
              <p className="text-3xl font-black text-indigo-600">{step.number}</p>
              <h3 className="mt-4 text-xl font-black text-[#17384d]">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-indigo-50 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-sm font-black text-indigo-700">こんなテーマで差が出る</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-black leading-tight text-[#17384d] sm:text-5xl">
            「意味は知っている」を、「違いまで説明できる」に変える。
          </h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {examples.map((item) => (
              <article key={item.term} className="rounded-[24px] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-black text-[#17384d]">{item.term}</h3>
                <p className="mt-4 text-sm font-bold text-rose-600">ありがちな状態</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{item.weak}</p>
                <p className="mt-4 text-sm font-bold text-indigo-700">確認方法</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{item.check}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-8 rounded-[30px] bg-[#17384d] p-7 text-white sm:p-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div>
            <p className="text-sm font-black text-sky-200">it-learning-appで学習をつなぐ</p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              AI採点だけで終わらず、次の勉強まで決める。
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200">
              苦手を見つけても、復習の順番や時間配分が決まっていなければ続きません。it-learning-appでは、学習計画・問題演習・進捗管理と組み合わせて、今日やることを整理できます。
            </p>
          </div>
          <div className="space-y-3">
            <Link
              href={`/onboarding?source=${source}&position=mid`}
              className="flex justify-center rounded-full bg-[#f59e0b] px-6 py-4 font-black text-white transition hover:bg-[#d97706]"
            >
              無料で学習計画を作る
            </Link>
            <Link
              href={`/ai-grading?source=${source}&position=mid`}
              className="flex justify-center rounded-full border border-white/40 px-6 py-4 font-black text-white transition hover:bg-white/10"
            >
              AI採点を試す
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-4xl">
          <p className="text-sm font-black text-indigo-700">2026年受験者へ</p>
          <h2 className="mt-3 text-3xl font-black text-[#17384d]">現行範囲で、まず合格力を作る。</h2>
          <p className="mt-5 text-base leading-8 text-slate-700">
            IPAが掲載する現行ITパスポート試験シラバスはVer.6.5です。2027年度から試験内容の変更が予定されていますが、2026年に受験するなら現行範囲を基準に学習を進めます。IPAは2026年度の公開問題・解答例も公開しているため、基礎理解の確認には公式問題も活用できます。
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
            <a
              href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              IPA シラバスを確認 ↗
            </a>
            <a
              href="https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/questions.html"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              IPA 公開問題を確認 ↗
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-black text-indigo-700">FAQ</p>
        <h2 className="mt-3 text-3xl font-black text-[#17384d]">よくある質問</h2>
        <div className="mt-8 space-y-4">
          {faq.map((item) => (
            <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white p-5">
              <summary className="cursor-pointer list-none font-black text-[#17384d]">
                {item.question}
              </summary>
              <p className="mt-4 text-sm leading-7 text-slate-700">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-[#172554] px-4 py-14 text-white sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-4xl text-center">
          <p className="text-sm font-black text-indigo-200">迷ったまま勉強を続けない</p>
          <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            苦手を見つけて、今日やることまで決める。
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-indigo-100">
            試験日と学習時間から、自分専用の学習計画を作成。問題演習やAI採点で見つけた弱点を、次の復習につなげます。
          </p>
          <Link
            href={`/onboarding?source=${source}&position=bottom`}
            className="mt-8 inline-flex justify-center rounded-full bg-[#f59e0b] px-8 py-4 text-base font-black text-white transition hover:bg-[#d97706]"
          >
            無料で自分専用の学習計画を作る
          </Link>
        </div>
      </section>
    </main>
  );
}
