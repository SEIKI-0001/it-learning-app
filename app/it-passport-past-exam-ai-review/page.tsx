import type { Metadata } from "next";
import Link from "next/link";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/it-passport-past-exam-ai-review";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;

const onboardingUrl =
  "/onboarding?source=past-exam-ai-review-2026&position=hero";

export const metadata: Metadata = {
  title: "ITパスポート過去問の復習をAIで効率化｜間違いを弱点対策につなげる方法【2026年】",
  description:
    "ITパスポートの過去問は解いて終わりではありません。誤答を苦手分野に整理し、次に復習するテーマを決める方法と、AIを使った効率的な学習サイクルを紹介します。",
  keywords: [
    "ITパスポート 過去問 解説",
    "ITパスポート 過去問 復習",
    "ITパスポート AI",
    "ITパスポート 苦手分野",
    "ITパスポート 過去問 勉強法",
    "ITパスポート 学習アプリ",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポート過去問の復習をAIで効率化",
    description:
      "間違えた問題を、次に何を勉強するかへつなげる。ITパスポート独学者向けの過去問復習フローを紹介します。",
    type: "website",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート過去問の復習をAIで効率化",
    description:
      "過去問の誤答を弱点対策へ。解いて終わらない学習サイクルを作ります。",
  },
};

const reviewSteps = [
  {
    number: "01",
    title: "まず過去問を解く",
    text: "正解率だけでなく、迷った問題も記録します。偶然正解した問題は理解が不安定な可能性があります。",
  },
  {
    number: "02",
    title: "誤答の理由を分ける",
    text: "用語を知らない、意味を取り違えた、計算手順が曖昧など、間違い方を分類します。",
  },
  {
    number: "03",
    title: "弱点テーマに戻る",
    text: "問題だけを暗記せず、関連する知識へ戻って理解し直します。似た問題にも対応しやすくなります。",
  },
  {
    number: "04",
    title: "短い確認問題で再判定",
    text: "復習後にもう一度確認し、理解できたテーマと、まだ戻るべきテーマを分けます。",
  },
];

const weakPointExamples = [
  {
    label: "ストラテジ系",
    example: "財務指標・法務・経営戦略の用語が混ざる",
    action: "定義の比較 → 短い確認問題 → 関連過去問",
  },
  {
    label: "マネジメント系",
    example: "開発工程やプロジェクト管理の役割を取り違える",
    action: "工程の流れを整理 → 役割を確認 → 再演習",
  },
  {
    label: "テクノロジ系",
    example: "ネットワーク・DB・セキュリティの仕組みが曖昧",
    action: "仕組みを図式化 → 用語確認 → 類題演習",
  },
];

const faq = [
  {
    question: "過去問は何周すればいいですか？",
    answer:
      "回数だけを目標にするより、間違えた理由が説明できる状態を目指す方が効率的です。同じ問題を繰り返す場合も、正解を覚えたのではなく知識を理解できたかを確認してください。",
  },
  {
    question: "AIに過去問の答えだけ聞けば十分ですか？",
    answer:
      "答えを得るだけでは弱点が残りやすいため、なぜ他の選択肢が違うのか、関連知識は何か、次に何を復習すべきかまで確認する使い方がおすすめです。",
  },
  {
    question: "2026年の公開問題はありますか？",
    answer:
      "IPAは令和8年度（2026年度）のITパスポート試験の問題冊子と解答例を公開しています。利用時はIPAが示す過去問題使用上の留意点も確認してください。",
  },
  {
    question: "it-learning-appは参考書の代わりになりますか？",
    answer:
      "参考書を完全に置き換えることを目的としていません。参考書・公式公開問題などと組み合わせ、学習計画、理解度確認、弱点復習をつなぐ用途を想定しています。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "ITパスポート過去問の復習をAIで効率化",
      description:
        "ITパスポートの過去問で見つかった弱点を、復習と再演習につなげる方法を紹介するページ。",
      url: pageUrl,
      inLanguage: "ja-JP",
      about: {
        "@type": "Thing",
        name: "ITパスポート試験の過去問学習",
      },
    },
    {
      "@type": "SoftwareApplication",
      name: "it-learning-app",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description:
        "ITパスポート受験者向けに、学習計画、理解度確認、弱点復習、問題演習を支援するWebアプリ。",
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

export default function ItPassportPastExamAiReviewPage() {
  return (
    <main className="min-h-screen bg-[#f7fafc] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="font-black text-[#12384d]">
            it-learning-app
          </Link>
          <Link
            href="/onboarding?source=past-exam-ai-review-2026&position=header"
            className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white transition hover:bg-[#dc9400]"
          >
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-[#e8f5fb] px-4 py-2 text-sm font-black text-[#1b75a6]">
              ITパスポート過去問 × AI復習
            </p>
            <h1 className="mt-6 text-[38px] font-black leading-[1.15] text-[#12384d] sm:text-6xl">
              過去問は、間違えた後からが勉強です。
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
              正解数を数えるだけでは、次に何を勉強すべきかは分かりません。誤答や迷った問題を弱点テーマに変換し、復習と再演習につなげることで、過去問を「実力を測るもの」から「実力を上げるもの」に変えます。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={onboardingUrl}
                className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 text-base font-black text-white transition hover:bg-[#dc9400]"
              >
                無料で弱点復習プランを作る
              </Link>
              <Link
                href="/past-exams/2026?source=past-exam-ai-review-2026"
                className="inline-flex justify-center rounded-full border-2 border-[#1b75a6] px-7 py-4 text-base font-black text-[#1b75a6] transition hover:bg-[#e8f5fb]"
              >
                2026年公開問題を解く
              </Link>
            </div>
          </div>

          <aside className="rounded-[28px] bg-[#12384d] p-7 text-white shadow-[0_24px_64px_rgba(18,56,77,0.24)]">
            <p className="text-sm font-black text-[#8dd7f3]">過去問1問から次の学習へ</p>
            <div className="mt-5 space-y-3 text-sm leading-7">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="font-black">誤答</p>
                <p className="text-[#d9f2fb]">SQLのGROUP BYを取り違えた</p>
              </div>
              <div className="text-center font-black text-[#8dd7f3]">↓</div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="font-black">弱点</p>
                <p className="text-[#d9f2fb]">データベース集計の理解が不安定</p>
              </div>
              <div className="text-center font-black text-[#8dd7f3]">↓</div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="font-black">次の学習</p>
                <p className="text-[#d9f2fb]">基本用語を確認 → 類題で再判定</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-black text-[#1b75a6]">解いて終わらない4ステップ</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#12384d] sm:text-5xl">
            正解率ではなく、誤答から次の行動を決める。
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {reviewSteps.map((step) => (
            <article
              key={step.number}
              className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(22,94,131,0.07)]"
            >
              <p className="text-3xl font-black text-[#1b75a6]">{step.number}</p>
              <h3 className="mt-4 text-xl font-black text-[#12384d]">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#edf6fa] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-4xl">
            <p className="text-sm font-black text-[#1b75a6]">3分野を別々に見る</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#12384d] sm:text-5xl">
              「全体で何点」だけでは、弱点を見落とします。
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              ITパスポートはストラテジ系・マネジメント系・テクノロジ系から幅広く出題されます。総合点だけではなく、どの分野の理解が不安定なのかを分けて復習することが重要です。
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {weakPointExamples.map((item) => (
              <article key={item.label} className="rounded-[22px] bg-white p-6">
                <p className="text-sm font-black text-[#1b75a6]">{item.label}</p>
                <h3 className="mt-3 text-lg font-black leading-7 text-[#12384d]">
                  {item.example}
                </h3>
                <p className="mt-4 border-t border-slate-200 pt-4 text-sm leading-7 text-slate-700">
                  <span className="font-black">復習例：</span>{item.action}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-8 rounded-[30px] bg-[#12384d] p-7 text-white sm:p-10 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="text-sm font-black text-[#8dd7f3]">it-learning-appでつなげる</p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              過去問 → 弱点 → 今日の復習を、一つの学習サイクルに。
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#d9f2fb]">
              it-learning-appは、試験日から逆算した学習計画、確認問題、単語復習、過去問レベル演習などを通じて、独学で迷いやすい「次に何をやるか」を整理します。
            </p>
          </div>
          <Link
            href="/onboarding?source=past-exam-ai-review-2026&position=mid"
            className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 text-base font-black text-white transition hover:bg-[#dc9400]"
          >
            無料で自分専用の計画を作る
          </Link>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-4xl">
          <p className="text-sm font-black text-[#1b75a6]">公式情報</p>
          <h2 className="mt-3 text-3xl font-black text-[#12384d]">2026年の学習で確認しておきたいこと</h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
            <p>
              ITパスポート試験は120分・100問の四肢択一で、ストラテジ系、マネジメント系、テクノロジ系の3分野から出題されます。現在のITパスポート試験シラバスはVer.6.5です。
            </p>
            <p>
              IPAは令和8年度（2026年度）の公開問題と解答例も掲載しています。公式公開問題を使う場合は、IPAの利用上の留意点を確認した上で活用してください。
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
              <a
                href="https://www3.jitec.ipa.go.jp/JitesCbt/html/about/range.html"
                target="_blank"
                rel="noreferrer"
                className="font-black text-[#1b75a6] underline underline-offset-4"
              >
                IPA：試験内容・出題範囲
              </a>
              <a
                href="https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/questions.html"
                target="_blank"
                rel="noreferrer"
                className="font-black text-[#1b75a6] underline underline-offset-4"
              >
                IPA：過去問題・解答例
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-black text-[#1b75a6]">FAQ</p>
        <h2 className="mt-3 text-3xl font-black text-[#12384d]">よくある質問</h2>
        <div className="mt-8 space-y-4">
          {faq.map((item) => (
            <details key={item.question} className="rounded-[18px] border border-slate-200 bg-white p-5">
              <summary className="cursor-pointer font-black text-[#12384d]">
                {item.question}
              </summary>
              <p className="mt-4 text-sm leading-7 text-slate-700">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-[#e8f5fb] px-4 py-14 text-center sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-black leading-tight text-[#12384d] sm:text-5xl">
            次に何を復習するかまで、今日決める。
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-700">
            試験日と使える学習時間を入力して、過去問・確認問題の結果を次の学習につなげる準備を始めましょう。
          </p>
          <Link
            href="/onboarding?source=past-exam-ai-review-2026&position=bottom"
            className="mt-8 inline-flex justify-center rounded-full bg-[#f7a600] px-8 py-4 text-base font-black text-white transition hover:bg-[#dc9400]"
          >
            無料で自分専用の学習計画を作る
          </Link>
        </div>
      </section>
    </main>
  );
}
