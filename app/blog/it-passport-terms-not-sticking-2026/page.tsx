import type { Metadata } from "next";
import Link from "next/link";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/blog/it-passport-terms-not-sticking-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "terms-not-sticking-2026";

export const metadata: Metadata = {
  title: "ITパスポートの用語が覚えられない人へ｜丸暗記をやめる5ステップ【2026年】",
  description:
    "ITパスポートの用語が覚えられない人向けに、関連づけ・問題演習・比較・復習で知識を定着させる5ステップを解説。2026年最新シラバス対応。",
  keywords: [
    "ITパスポート 用語 覚えられない",
    "ITパスポート 暗記 コツ",
    "ITパスポート 用語 覚え方",
    "ITパスポート 勉強法 2026",
    "ITパスポート AI 学習",
    "ITパスポート 初心者",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートの用語が覚えられない人へ",
    description:
      "バラバラの丸暗記をやめて、意味・比較・問題演習・復習で定着させる5ステップを解説。",
    type: "article",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポートの用語が覚えられない人へ",
    description:
      "丸暗記ではなく、関連づけと問題演習で覚える。2026年向けの用語学習法。",
  },
};

const steps = [
  {
    number: "01",
    title: "用語を1個ずつ覚えない",
    text: "単語カードのように孤立させるのではなく、同じテーマの言葉を2〜4個まとめて覚えます。例：RTOとRPO、SaaS・PaaS・IaaS、共通鍵暗号と公開鍵暗号。",
  },
  {
    number: "02",
    title: "最初に『何のための用語か』だけ言えるようにする",
    text: "正式名称を完璧に暗唱する前に、その言葉が何を解決する仕組みなのかを一文で説明します。意味の土台があると略語や細部を後から追加しやすくなります。",
  },
  {
    number: "03",
    title: "問題の中で用語を覚える",
    text: "用語集を読むだけで終わらず、早めに選択問題へ移ります。どのような聞かれ方をするのかを見ることで、覚えるべき違いがはっきりします。",
  },
  {
    number: "04",
    title: "間違えた理由を1行で残す",
    text: "『知らなかった』『似た用語と混同した』『意味は知っていたが選択肢で迷った』のように理由を残します。復習対象は不正解だけでなく、勘で当たった問題も含めます。",
  },
  {
    number: "05",
    title: "別の問題で再確認する",
    text: "解説を読んだ直後に同じ問題へ戻るだけでは、答えそのものを覚えている可能性があります。少し時間を空け、別問題で同じ知識を使えるか確認します。",
  },
];

const examples = [
  {
    title: "RTO / RPO",
    bad: "どちらも『復旧に関する指標』としてまとめて覚える",
    good: "RTO＝いつまでに復旧するか、RPO＝どの時点までのデータを戻すか、と対比する",
  },
  {
    title: "SaaS / PaaS / IaaS",
    bad: "3つの正式名称だけ暗記する",
    good: "利用者がどこまで管理するか、提供範囲の違いで並べる",
  },
  {
    title: "CRM / SFA / SCM",
    bad: "英字3文字をそれぞれ単独で覚える",
    good: "顧客関係・営業活動・供給網という業務目的の違いで整理する",
  },
];

const faq = [
  {
    question: "ITパスポートは暗記だけで合格できますか？",
    answer:
      "用語知識は重要ですが、似た概念の違いや問題文の文脈を判断する必要があります。用語集の丸暗記だけでなく、問題演習とセットで学ぶ方が実戦的です。",
  },
  {
    question: "用語集は何周すればいいですか？",
    answer:
      "回数を目標にするより、問題演習で間違えたテーマに戻り、別問題で再び答えられるか確認する方が効率的です。全用語を同じ回数復習する必要はありません。",
  },
  {
    question: "AIはITパスポートの暗記にどう使えますか？",
    answer:
      "似た用語の比較、初心者向けの言い換え、数字や条件を変えた確認問題の作成に向いています。答えを先に聞くより、自分で解いた後の理解補助として使うのがおすすめです。",
  },
  {
    question: "2026年のITパスポートはどのシラバスで勉強すればいいですか？",
    answer:
      "IPAが2026年1月8日に掲載したITパスポート試験シラバスVer.6.5が現行版です。教材や用語集が現行シラバスに対応しているか確認してください。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BlogPosting",
      headline: "ITパスポートの用語が覚えられない人へ｜丸暗記をやめる5ステップ【2026年】",
      description:
        "ITパスポートの用語を、関連づけ・比較・問題演習・復習で定着させる方法を解説。",
      url: pageUrl,
      inLanguage: "ja-JP",
      datePublished: "2026-08-24",
      dateModified: "2026-08-24",
      author: { "@type": "Organization", name: "it-learning-app" },
      publisher: { "@type": "Organization", name: "it-learning-app" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ],
};

export default function ItPassportTermsNotStickingPage() {
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

      <article>
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
            <div>
              <p className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                ITパスポート用語の覚え方 2026
              </p>
              <h1 className="mt-6 text-[38px] font-black leading-[1.12] text-[#17384d] sm:text-6xl">
                用語が覚えられないなら、
                <span className="text-emerald-600">丸暗記をやめる。</span>
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
                ITパスポートはストラテジ、マネジメント、テクノロジの3分野にまたがり、似た略語や専門用語が大量に出てきます。1語ずつ暗記するより、関連づけて問題の中で使い、間違えた部分だけ復習する方が整理しやすくなります。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/onboarding?source=${source}&position=hero`}
                  className="inline-flex justify-center rounded-full bg-[#f59e0b] px-7 py-4 text-base font-black text-white transition hover:bg-[#d97706]"
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

            <aside className="rounded-[30px] bg-[#163047] p-7 text-white shadow-[0_28px_70px_rgba(15,23,42,0.22)]">
              <p className="text-sm font-black text-emerald-200">覚え方を変える3つの視点</p>
              <div className="mt-5 space-y-4">
                {[
                  ["単独暗記", "→ 関連用語と比較する"],
                  ["読むだけ", "→ 問題の中で使う"],
                  ["全範囲を反復", "→ 間違えた部分を優先"],
                ].map(([left, right]) => (
                  <div key={left} className="rounded-2xl bg-white/10 p-4">
                    <p className="text-sm text-slate-300">{left}</p>
                    <p className="mt-1 font-black text-white">{right}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-black text-emerald-700">結論</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#17384d] sm:text-5xl">
            覚える量を減らすのではなく、覚え方を変える。
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-700">
            現行のITパスポート試験は100問・120分で、幅広い知識を問います。2026年8月時点の現行シラバスはVer.6.5です。範囲が広いからこそ、すべての言葉を同じ強度で暗記するより、問題演習で使う知識を優先し、弱点に戻る学習ループが重要です。
          </p>
        </section>

        <section className="bg-emerald-50 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-sm font-black text-emerald-700">5ステップ</p>
            <h2 className="mt-3 text-3xl font-black text-[#17384d] sm:text-5xl">
              用語を定着させる勉強の順番
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
              {steps.map((step) => (
                <section key={step.number} className="rounded-[24px] bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                  <p className="text-3xl font-black text-emerald-600">{step.number}</p>
                  <h3 className="mt-4 text-lg font-black text-[#17384d]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{step.text}</p>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-black text-emerald-700">具体例</p>
          <h2 className="mt-3 text-3xl font-black text-[#17384d] sm:text-5xl">
            「似ている言葉」は並べて覚える
          </h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {examples.map((item) => (
              <section key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-6">
                <h3 className="text-xl font-black text-[#17384d]">{item.title}</h3>
                <p className="mt-5 text-xs font-black uppercase tracking-wide text-rose-600">避けたい覚え方</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{item.bad}</p>
                <p className="mt-5 text-xs font-black uppercase tracking-wide text-emerald-700">おすすめ</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{item.good}</p>
              </section>
            ))}
          </div>
        </section>

        <section className="bg-[#163047] px-4 py-14 text-white sm:px-6 sm:py-20">
          <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="text-sm font-black text-emerald-200">AIは「答えを聞く」より「違いを整理する」ために使う</p>
              <h2 className="mt-3 text-3xl font-black sm:text-5xl">
                分からない1語に、30分かけない。
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200">
                AIには「RTOとRPOを初心者向けに比較して」「この4択で他の3つが違う理由を説明して」「同じ論点で数字を変えた問題を1問作って」のように依頼すると、復習を短時間で進めやすくなります。
              </p>
            </div>
            <div className="rounded-[24px] bg-white/10 p-6">
              <p className="font-black text-emerald-200">復習プロンプト例</p>
              <p className="mt-3 text-sm leading-7 text-white">
                「ITパスポート初心者向けに、SaaS・PaaS・IaaSの違いを『利用者が管理する範囲』で比較してください。最後に確認問題を1問出してください。」
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-black text-emerald-700">学習管理</p>
          <h2 className="mt-3 text-3xl font-black text-[#17384d] sm:text-5xl">
            問題は「何を覚えるか」より「次に何を復習するか」。
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-700">
            用語が多い試験では、苦手なテーマを自分で管理し続けること自体が負担になります。it-learning-appでは、学習計画・問題演習・進捗管理をまとめ、今日やる内容を決めやすくします。参考書や用語集と併用しながら、弱点に学習時間を寄せる使い方ができます。
          </p>
          <div className="mt-8 rounded-[26px] bg-amber-50 p-6 sm:p-8">
            <p className="text-sm font-black text-amber-700">無料で開始</p>
            <p className="mt-2 text-2xl font-black text-[#17384d]">
              自分の試験日と学習時間から、続けやすい計画を作る。
            </p>
            <Link
              href={`/onboarding?source=${source}&position=mid`}
              className="mt-6 inline-flex rounded-full bg-[#f59e0b] px-7 py-4 font-black text-white transition hover:bg-[#d97706]"
            >
              無料で自分専用の学習計画を作る
            </Link>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto w-full max-w-5xl">
            <p className="text-sm font-black text-emerald-700">FAQ</p>
            <h2 className="mt-3 text-3xl font-black text-[#17384d]">よくある質問</h2>
            <div className="mt-8 space-y-4">
              {faq.map((item) => (
                <section key={item.question} className="rounded-[22px] border border-slate-200 p-6">
                  <h3 className="font-black text-[#17384d]">Q. {item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{item.answer}</p>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-5xl rounded-[32px] bg-[#f59e0b] p-8 text-center text-white sm:p-12">
            <p className="text-sm font-black text-amber-100">it-learning-app</p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">
              覚えられない用語を、次の復習につなげる。
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-amber-50">
              勉強時間、試験日、問題演習の進捗をまとめて、自分向けの学習計画を作成します。
            </p>
            <Link
              href={`/onboarding?source=${source}&position=bottom`}
              className="mt-8 inline-flex rounded-full bg-white px-8 py-4 text-base font-black text-amber-700 transition hover:bg-amber-50"
            >
              無料で学習計画を作る
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
