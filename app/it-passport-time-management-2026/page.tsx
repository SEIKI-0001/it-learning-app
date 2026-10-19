import type { Metadata } from "next";
import Link from "next/link";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/it-passport-time-management-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "time-management-2026";

export const metadata: Metadata = {
  title: "ITパスポートの時間配分｜100問・120分をどう解く？【2026年】",
  description:
    "ITパスポートは100問を120分で解くCBT試験です。1問に悩みすぎないための時間配分、見直し時間の作り方、模試での練習方法を2026年向けに解説します。",
  keywords: [
    "ITパスポート 時間配分",
    "ITパスポート 試験時間",
    "ITパスポート 100問 120分",
    "ITパスポート 時間 足りない",
    "ITパスポート CBT",
    "ITパスポート 模試",
    "ITパスポート AI 学習",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートの時間配分｜100問・120分をどう解く？【2026年】",
    description:
      "100問を最後まで解き切るための時間配分と、迷った問題の見直し方を初心者向けに整理。",
    type: "website",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポートの時間配分【2026年】",
    description:
      "100問・120分をどう使う？1周目、再検討、最終確認の3段階で解説します。",
  },
};

const phases = [
  {
    label: "STEP 1",
    time: "最初の75〜85分",
    title: "全100問に一度触れる",
    text: "知識問題はテンポよく進み、計算問題や判断に迷う問題で止まりすぎないようにします。分からない問題は見直し対象として残し、まず未回答を作らないことを優先します。",
  },
  {
    label: "STEP 2",
    time: "次の25〜35分",
    title: "迷った問題だけ再検討する",
    text: "1周目で迷った問題に戻ります。最初から全問を読み直すのではなく、時間を使えば正答可能性が上がりそうな問題から再確認します。",
  },
  {
    label: "STEP 3",
    time: "最後の10分",
    title: "未回答と入力ミスを確認する",
    text: "最後は新しい問題を深く考え続けるより、未回答がないか、選択肢を押し間違えていないか、見直し対象を放置していないかを確認します。",
  },
];

const rules = [
  {
    title: "1問に固定時間をかけない",
    text: "100問・120分を単純平均すると1問あたり約72秒ですが、実際には用語問題と計算問題で必要時間が違います。速く解ける問題で時間を作り、考える価値のある問題へ回します。",
  },
  {
    title: "迷った問題と知らない問題を分ける",
    text: "『二択まで絞れた』問題と『用語自体を知らない』問題では、見直しで点になる可能性が違います。再検討する優先順位を分けると時間を使いやすくなります。",
  },
  {
    title: "時間配分は模試で調整する",
    text: "75分で1周できない人が、本番だけ75分で解けるようになるとは限りません。100問・120分を意識した演習で、自分の1周目の所要時間を測って調整します。",
  },
];

const faq = [
  {
    question: "ITパスポートの試験時間は何分ですか？",
    answer:
      "現行のITパスポート試験は120分で、出題数は100問です。CBT方式で実施されます。",
  },
  {
    question: "1問あたり何分で解けばいいですか？",
    answer:
      "単純平均では1問72秒ですが、すべての問題を同じ時間で解く必要はありません。短時間で判断できる知識問題と、計算・読解が必要な問題を分けて考える方が実践的です。",
  },
  {
    question: "時間が足りなくなる場合はどう練習すればいいですか？",
    answer:
      "まず100問形式の演習で1周目に何分かかるか測り、時間を使いすぎる問題の種類を特定します。用語不足なのか、計算なのか、迷いすぎなのかで対策を変えてください。",
  },
  {
    question: "見直し時間はどのくらい残すべきですか？",
    answer:
      "公式に指定された配分はありません。本ページでは出発点として最後10分程度を最終確認に残す例を紹介しています。模試結果に合わせて自分用に調整してください。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "ITパスポートの時間配分｜100問・120分をどう解く？【2026年】",
      description:
        "ITパスポート試験の時間配分、見直し方、模試での練習方法を解説。",
      url: pageUrl,
      inLanguage: "ja-JP",
      datePublished: "2026-08-30",
      dateModified: "2026-08-30",
      publisher: { "@type": "Organization", name: "it-learning-app" },
    },
    {
      "@type": "SoftwareApplication",
      name: "it-learning-app",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description:
        "ITパスポートの学習計画、問題演習、弱点復習を支援するWebアプリ。",
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

export default function ItPassportTimeManagement2026Page() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="font-black tracking-tight text-[#16324a]">
            it-learning-app
          </Link>
          <Link
            href={`/onboarding?source=${source}&position=header`}
            className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-black text-white transition hover:bg-[#1d4ed8]"
          >
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <section className="overflow-hidden bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              試験直前の時間戦略 2026
            </p>
            <h1 className="mt-6 text-[40px] font-black leading-[1.08] tracking-tight text-[#16324a] sm:text-6xl">
              100問・120分。
              <br />
              <span className="text-blue-600">全部を72秒で解く必要はない。</span>
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
              ITパスポートは、知識問題も計算問題も同じ100問の中に出てきます。大切なのは「1問何秒」と固定することではなく、全問に触れる時間、迷った問題を戻る時間、最後に確認する時間を最初から分けておくことです。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/onboarding?source=${source}&position=hero`}
                className="inline-flex justify-center rounded-full bg-[#2563eb] px-7 py-4 text-base font-black text-white transition hover:bg-[#1d4ed8]"
              >
                無料で自分専用の学習計画を作る
              </Link>
              <a
                href="https://www.ipa.go.jp/shiken/mousikomi/cbt_ip.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex justify-center rounded-full border-2 border-slate-300 px-7 py-4 text-base font-black text-slate-700 transition hover:bg-slate-50"
              >
                IPA公式情報を確認
              </a>
            </div>
          </div>

          <aside className="rounded-[30px] bg-[#16324a] p-7 text-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <p className="text-sm font-black text-blue-200">現行試験</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-sm text-slate-300">試験時間</p>
                <p className="mt-2 text-3xl font-black">120分</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-sm text-slate-300">出題数</p>
                <p className="mt-2 text-3xl font-black">100問</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-300">
              単純平均は1問72秒。これは「全問を72秒で解く」というルールではなく、時間配分を考えるための目安です。
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-black text-blue-700">まず知っておきたいこと</p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-[#16324a] sm:text-5xl">
          「時間が足りない」は、知識不足だけが原因ではない。
        </h2>
        <p className="mt-5 text-base leading-8 text-slate-700">
          現行ITパスポート試験はCBT方式で、120分・100問です。問題ごとの難易度や必要時間は同じではありません。知らない用語で長く悩む、計算問題を一度で完璧に解こうとする、二択で決め切れず何度も読み直す。こうした「止まり方」を放置すると、知識があっても最後まで到達しにくくなります。
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {rules.map((item) => (
            <div key={item.title} className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-black text-[#16324a]">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#eaf1ff] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-5xl">
          <p className="text-sm font-black text-blue-700">時間配分の出発点</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#16324a] sm:text-5xl">
            120分を3段階に分けて練習する。
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">
            以下は公式指定ではなく、初めて時間戦略を作る人向けの配分例です。模試で実測し、自分の得意・不得意に合わせて5〜10分単位で調整してください。
          </p>

          <div className="mt-10 space-y-5">
            {phases.map((phase) => (
              <div key={phase.label} className="grid gap-5 rounded-[28px] bg-white p-6 shadow-sm sm:p-8 md:grid-cols-[150px_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-black text-blue-600">{phase.label}</p>
                  <p className="mt-2 text-lg font-black text-[#16324a]">{phase.time}</p>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#16324a]">{phase.title}</h3>
                  <p className="mt-3 leading-8 text-slate-600">{phase.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-black text-blue-700">模試で確認する3つの数字</p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-[#16324a] sm:text-5xl">
          点数だけでなく、「どこで時間を失ったか」を残す。
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["1周目の所要時間", "全問に一度触れるまで何分かかったか"],
            ["見直し対象の数", "迷った問題が多すぎないか"],
            ["時間超過の原因", "計算・読解・知識不足のどれか"],
          ].map(([title, text]) => (
            <div key={title} className="rounded-[24px] bg-[#16324a] p-6 text-white">
              <h3 className="font-black">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[30px] border border-blue-200 bg-blue-50 p-7 sm:p-9">
          <p className="text-sm font-black text-blue-700">it-learning-appで次につなげる</p>
          <h2 className="mt-3 text-3xl font-black text-[#16324a]">
            時間不足の原因が弱点なら、次の学習内容まで変える。
          </h2>
          <p className="mt-4 leading-8 text-slate-700">
            例えばテクノロジ系の計算で時間を使いすぎるなら、単に「もっと速く解く」と決めるだけでは不十分です。弱点テーマを特定し、次回の演習までに必要な復習を学習計画へ入れる。it-learning-appは、こうした問題演習と次の学習をつなげるための学習支援アプリです。
          </p>
          <Link
            href={`/onboarding?source=${source}&position=mid`}
            className="mt-6 inline-flex rounded-full bg-[#2563eb] px-7 py-4 font-black text-white transition hover:bg-[#1d4ed8]"
          >
            無料で弱点から学習計画を作る
          </Link>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="text-3xl font-black text-[#16324a] sm:text-4xl">よくある質問</h2>
          <div className="mt-8 space-y-4">
            {faq.map((item) => (
              <div key={item.question} className="rounded-[24px] border border-slate-200 p-6">
                <h3 className="font-black text-[#16324a]">Q. {item.question}</h3>
                <p className="mt-3 leading-8 text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#16324a] px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-4xl text-center">
          <p className="text-sm font-black text-blue-200">時間配分も、弱点対策も一緒に設計</p>
          <h2 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
            次の120分を変えるには、
            <br />
            今日の学習から変える。
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-300">
            試験日、使える学習時間、現在の弱点から、自分専用の学習計画を作成。問題を解いた後に「次に何をやるか」で迷う時間を減らします。
          </p>
          <Link
            href={`/onboarding?source=${source}&position=bottom`}
            className="mt-8 inline-flex rounded-full bg-white px-8 py-4 font-black text-[#16324a] transition hover:bg-blue-50"
          >
            無料で自分専用の学習計画を作る
          </Link>
          <p className="mt-5 text-xs leading-6 text-slate-400">
            ※時間配分例はit-learning-appによる学習上の目安であり、IPAが指定する解答時間ではありません。
          </p>
        </div>
      </section>
    </main>
  );
}
