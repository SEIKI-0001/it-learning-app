import type { Metadata } from "next";
import Link from "next/link";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/it-passport-ai-mistake-notebook-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "ai-mistake-notebook-2026";

export const metadata: Metadata = {
  title: "ITパスポートの間違いノートをAIで効率化｜復習メモの作り方【2026年】",
  description:
    "ITパスポートの過去問で同じミスを繰り返す人向けに、間違いノートを3行で作る方法とAIを使った復習法を解説。弱点から次の学習計画につなげます。",
  keywords: [
    "ITパスポート 間違いノート",
    "ITパスポート 復習方法",
    "ITパスポート 間違えた問題",
    "ITパスポート 過去問 復習",
    "ITパスポート AI 学習",
    "ITパスポート 勉強法 2026",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートの間違いノートをAIで効率化",
    description:
      "過去問のミスを3行の復習メモに変え、AIで比較・類題・再確認まで進める学習法。",
    type: "website",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポートの間違いノートをAIで効率化",
    description:
      "同じミスを繰り返さない。3行メモとAIで弱点復習を回す方法。",
  },
};

const noteTemplate = [
  {
    label: "1. 何を勘違いした？",
    example: "RTOとRPOを逆に覚えていた",
  },
  {
    label: "2. 正しい理解は？",
    example: "RTO＝復旧までの目標時間、RPO＝どこまでのデータを戻すかの目標時点",
  },
  {
    label: "3. 次は何で見分ける？",
    example: "時間内に復旧→RTO／失ってよいデータ範囲→RPO",
  },
];

const steps = [
  {
    number: "01",
    title: "間違えた理由を1つに絞る",
    text: "知識不足、似た用語との混同、問題文の読み違い、計算ミスなど、原因を1つだけ残します。長い反省文は不要です。",
  },
  {
    number: "02",
    title: "正解ではなく判断基準を書く",
    text: "答えの選択肢だけではなく『次に何を見れば判断できるか』を一言で残すと、表現が変わった問題にも対応しやすくなります。",
  },
  {
    number: "03",
    title: "AIに比較・言い換えを頼む",
    text: "混同した2語の違い、初心者向けの言い換え、具体例をAIに出させ、理解の穴を短時間で埋めます。",
  },
  {
    number: "04",
    title: "別問題で再確認する",
    text: "同じ問題を覚えただけにならないよう、類題や別年度の問題で再判定します。再び迷ったら、復習優先度を上げます。",
  },
];

const aiPrompts = [
  "RTOとRPOの違いを、IT初心者にも分かるように比較表なしで3文で説明して",
  "SaaS・PaaS・IaaSを、利用者が管理する範囲の違いで説明して",
  "この誤答理由から、同じ論点を確認できる四択問題を1問作って。答えは最後に表示して",
];

const faq = [
  {
    question: "ITパスポートの間違いノートは全部の誤答をまとめるべきですか？",
    answer:
      "全部を丁寧にまとめる必要はありません。繰り返し間違える問題、2択で迷った問題、似た用語を混同した問題など、再発しやすいミスを優先すると復習量を抑えやすくなります。",
  },
  {
    question: "紙のノートとスマホのどちらがいいですか？",
    answer:
      "続けやすい方で構いません。重要なのは見た目ではなく、短時間で記録し、後から再確認できることです。きれいに作り込むより、3行程度で残して問題演習へ戻る方が実践的です。",
  },
  {
    question: "AIにそのまま答えを聞いてもいいですか？",
    answer:
      "答えだけを見るより、まず自分がなぜ間違えたかを言語化し、その後に違いの説明や類題作成をAIへ依頼する方が、弱点の特定と再確認につなげやすくなります。",
  },
  {
    question: "2026年のITパスポートはどのシラバスで勉強すればいいですか？",
    answer:
      "IPAが2026年1月8日に掲載したITパスポート試験シラバスVer.6.5が現行です。学習中は古い教材だけに依存せず、IPAの最新シラバスも確認してください。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "ITパスポートの間違いノートをAIで効率化",
      description:
        "ITパスポートの過去問で見つかった弱点を3行メモにし、AIを使って復習・再確認する方法を紹介するページ。",
      url: pageUrl,
      inLanguage: "ja-JP",
    },
    {
      "@type": "SoftwareApplication",
      name: "it-learning-app",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description:
        "ITパスポート受験者向けに、学習計画、問題演習、進捗管理、AIを使った学習支援を提供するWebアプリ。",
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

export default function ItPassportAiMistakeNotebookPage() {
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
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
              ITパスポート × AI復習
            </p>
            <h1 className="mt-6 text-[38px] font-black leading-[1.12] text-[#17384d] sm:text-6xl">
              間違いをためず、
              <span className="text-emerald-600">次に正解するメモ</span>へ。
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
              過去問を何度も解いているのに、同じ用語でまた迷う。そんなときは、間違いノートをきれいに作るより「なぜ間違えたか」「正しい理解」「次の判断基準」の3行だけを残す方が続けやすくなります。AIを使えば、似た用語の比較や類題作成まで短時間で進められます。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/onboarding?source=${source}&position=hero`}
                className="inline-flex justify-center rounded-full bg-amber-500 px-7 py-4 text-base font-black text-white transition hover:bg-amber-600"
              >
                無料で弱点から学習計画を作る
              </Link>
              <a
                href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex justify-center rounded-full border-2 border-slate-300 px-7 py-4 text-base font-black text-slate-700 transition hover:bg-slate-50"
              >
                IPA最新シラバスを見る
              </a>
            </div>
          </div>

          <aside className="rounded-[30px] bg-[#17384d] p-7 text-white shadow-[0_28px_70px_rgba(15,23,42,0.2)]">
            <p className="text-sm font-black text-emerald-200">3行だけの間違いメモ</p>
            <div className="mt-5 space-y-4">
              {noteTemplate.map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm font-black text-white">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{item.example}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-4xl">
          <p className="text-sm font-black text-emerald-700">間違いノートが続かない理由</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#17384d] sm:text-5xl">
            「まとめる作業」が勉強時間を奪っていませんか？
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-700">
            ITパスポートは出題範囲が広く、ストラテジ・マネジメント・テクノロジの用語を横断して覚える必要があります。誤答をすべてノートに清書すると、それだけで時間がかかります。目的はノートを完成させることではなく、同じ論点を次に正解できる状態へ変えることです。
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {steps.map((step) => (
            <article
              key={step.number}
              className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
            >
              <p className="text-3xl font-black text-emerald-600">{step.number}</p>
              <h3 className="mt-4 text-xl font-black text-[#17384d]">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-emerald-50 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-4xl">
            <p className="text-sm font-black text-emerald-700">AIは「答え」より「復習」に使う</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#17384d] sm:text-5xl">
              迷った理由を渡すと、復習が具体的になる。
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              AIに問題文を丸投げするのではなく、自分の誤答理由を先に言語化してから、比較説明・言い換え・類題作成を頼みます。すると「分からなかった」が、次に確認すべき具体的なテーマへ変わります。
            </p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {aiPrompts.map((prompt) => (
              <div key={prompt} className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Prompt example</p>
                <p className="mt-3 text-sm font-bold leading-7 text-slate-700">「{prompt}」</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-[28px] bg-[#17384d] p-7 text-white sm:p-10">
            <p className="text-sm font-black text-emerald-200">復習対象が見えたら、次は時間配分</p>
            <h3 className="mt-3 text-2xl font-black sm:text-3xl">弱点を見つけるだけで終わらせない。</h3>
            <p className="mt-4 max-w-3xl leading-8 text-slate-200">
              it-learning-appでは、試験日や学習状況から学習計画を作成できます。間違いメモで見つかった弱点を、残り期間のどこで復習するかまで決めて、問題演習へ戻りましょう。
            </p>
            <Link
              href={`/onboarding?source=${source}&position=mid`}
              className="mt-6 inline-flex rounded-full bg-amber-500 px-7 py-4 font-black text-white transition hover:bg-amber-600"
            >
              無料で弱点から学習計画を作る
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <p className="text-sm font-black text-emerald-700">2026年の学習範囲</p>
            <h2 className="mt-3 text-3xl font-black text-[#17384d]">現行シラバスはVer.6.5</h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              IPAが2026年1月8日に掲載したITパスポート試験シラバスVer.6.5が現行です。間違いノートを作るときも、古い教材だけに依存せず、現在のシラバスで扱う範囲かを確認すると復習の優先順位を付けやすくなります。
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              出典：IPA「試験要綱・シラバスについて」。シラバスは試験に必要な知識・技能を整理した学習指針です。
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-6">
            <p className="font-black text-[#17384d]">復習の優先順位</p>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <li>1. 繰り返し間違える</li>
              <li>2. 正解したが2択で迷った</li>
              <li>3. 似た用語を取り違えた</li>
              <li>4. 解説を読んでも説明できない</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-4xl">
          <h2 className="text-3xl font-black text-[#17384d]">よくある質問</h2>
          <div className="mt-8 space-y-4">
            {faq.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-slate-200 p-5">
                <summary className="cursor-pointer list-none font-black text-[#17384d]">
                  {item.question}
                </summary>
                <p className="mt-3 text-sm leading-7 text-slate-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#17384d] px-4 py-14 text-white sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-4xl text-center">
          <p className="text-sm font-black text-emerald-200">間違いを、次の学習へ。</p>
          <h2 className="mt-3 text-3xl font-black sm:text-5xl">弱点から、自分専用の計画を作る。</h2>
          <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-200">
            試験日と今の理解度に合わせて、次に何を勉強するかを整理。間違いノートを作るだけで終わらず、復習と問題演習を回せる状態へつなげます。
          </p>
          <Link
            href={`/onboarding?source=${source}&position=bottom`}
            className="mt-8 inline-flex rounded-full bg-amber-500 px-8 py-4 text-base font-black text-white transition hover:bg-amber-600"
          >
            無料で自分専用の学習計画を作る
          </Link>
          <p className="mt-4 text-xs text-slate-400">登録後、学習状況に合わせて計画を作成できます。</p>
        </div>
      </section>
    </main>
  );
}
