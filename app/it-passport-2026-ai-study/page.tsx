import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/it-passport-2026-ai-study";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const cta = "/onboarding?source=it-passport-2026-ai-study-intro";

export const metadata: Metadata = {
  title: "ITパスポート2026のAI勉強法｜シラバス6.5対応の学習を効率化",
  description:
    "2026年にITパスポートを受験する人向けに、最新シラバス6.5を確認しながらAIで学習計画・理解度確認・復習を効率化する方法を紹介。it-learning-appなら今日やることから整理できます。",
  keywords: [
    "ITパスポート 2026 勉強法",
    "ITパスポート AI",
    "ITパスポート AI 勉強",
    "ITパスポート シラバス 6.5",
    "ITパスポート 学習アプリ",
    "ITパスポート 独学 2026",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポート2026のAI勉強法｜最新範囲から今日やることまで整理",
    description:
      "シラバス確認、学習計画、問題演習、苦手復習をバラバラにしない。2026年受験者向けのAI学習の進め方。",
    type: "website",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート2026のAI勉強法",
    description: "2026年の試験範囲を確認し、学習計画・演習・復習を一つの流れに。",
  },
};

const flow = [
  {
    number: "01",
    title: "最新の試験範囲を確認する",
    body: "まずIPAの最新シラバスを基準にします。2026年1月8日掲載のVer.6.5では、下請法の記載が中小受託取引適正化法へ更新されています。大きな改訂があると決めつけず、公式情報を起点に学習範囲を確認することが重要です。",
  },
  {
    number: "02",
    title: "試験日から学習量を逆算する",
    body: "平日・休日に使える時間を入れて、参考書、確認問題、過去問レベル演習をいつ進めるかを決めます。計画段階では時間と量を具体化し、毎日迷わない状態を作ります。",
  },
  {
    number: "03",
    title: "理解できたかを問題で判定する",
    body: "予定時間を消化しただけでは、合格に近づいたか分かりません。確認問題や演習結果を使って理解度を確認し、十分なら次へ、弱ければ復習を追加します。",
  },
  {
    number: "04",
    title: "AIは説明と整理に使う",
    body: "分からない用語を自分のレベルに合わせて説明させたり、間違えた理由を整理したりする用途はAIと相性が良い一方、AIの回答だけを暗記するのは避けます。試験範囲と正誤判断は公式資料や問題演習で確認します。",
  },
];

const useCases = [
  ["今日やることが決まらない", "試験日と残り期間から、その日の学習範囲を小さく具体化する"],
  ["参考書を読んでも理解できたか不安", "確認問題を解き、結果を次の学習判断に使う"],
  ["苦手分野が増えて整理できない", "誤答や正答率の低いテーマを優先して復習する"],
  ["AIに聞きすぎて学習が散らかる", "AIは疑問解消に使い、全体の学習順序は計画に固定する"],
];

const faq = [
  {
    q: "シラバス6.5で勉強内容は大きく変わりましたか？",
    a: "IPAが明示しているVer.6.5の変更点は、下請法を削除し、中小受託取引適正化法を追加したことです。『2026年だから全面的に勉強し直す』必要があるとは限りません。公式シラバスを基準に不足だけ確認するのが効率的です。",
  },
  {
    q: "ChatGPTなどの生成AIだけでITパスポート対策はできますか？",
    a: "疑問解消や説明の言い換えには便利ですが、学習範囲の網羅、正答率の把握、本番レベル演習までAIチャットだけで管理するのは非効率になりがちです。公式範囲、問題演習、復習管理と組み合わせるのがおすすめです。",
  },
  {
    q: "it-learning-appは参考書の代わりですか？",
    a: "参考書を完全に置き換えることより、試験日からの計画、毎日の学習、理解度確認、復習をつなぐ学習支援として使う設計です。手元の教材と併用できます。",
  },
];

export default function Page() {
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "it-learning-app",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description:
      "ITパスポート受験者向けに、試験日からの学習計画、毎日の学習内容、理解度確認、復習を支援するWebアプリ。",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-bold tracking-tight">it-learning-app</Link>
          <Link href={`${cta}&position=header`} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950">
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:pb-24 sm:pt-20">
        <div className="max-w-4xl">
          <p className="mb-5 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-200">
            2026年受験者向け｜シラバスVer.6.5対応
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            ITパスポートのAI勉強を、<br className="hidden sm:block" />
            「質問するだけ」で終わらせない。
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
            最新範囲を確認し、試験日から逆算し、問題で理解度を測り、弱いところへ戻る。it-learning-appは、AIを単発の質問ツールではなく、合格までの学習サイクルに組み込むためのITパスポート学習支援アプリです。
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href={`${cta}&position=hero`} className="rounded-xl bg-cyan-300 px-7 py-4 text-center font-bold text-slate-950">
              無料で自分専用の学習計画を作る
            </Link>
            <a href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" target="_blank" rel="noreferrer" className="rounded-xl border border-white/20 px-7 py-4 text-center font-semibold text-white">
              IPA公式シラバスを確認する
            </a>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto grid max-w-6xl gap-5 px-5 py-12 sm:grid-cols-3">
          <div><p className="text-sm font-semibold text-cyan-200">対象</p><p className="mt-2 text-lg font-bold">2026年にITパスポートを受験する人</p></div>
          <div><p className="text-sm font-semibold text-cyan-200">解決すること</p><p className="mt-2 text-lg font-bold">計画・理解度確認・復習の分断</p></div>
          <div><p className="text-sm font-semibold text-cyan-200">使い方</p><p className="mt-2 text-lg font-bold">教材とAIを学習サイクルにつなぐ</p></div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-bold text-cyan-200">2026年の前提</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">まず、最新情報を正しく押さえる</h2>
          <p className="mt-5 leading-8 text-slate-300">
            IPAは2026年1月8日にITパスポート試験シラバスVer.6.5を掲載しています。明示された変更点は「下請法」の削除と「中小受託取引適正化法」の追加です。さらに、CBT試験はシステムリプレースに伴い2026年12月28日以降の休止が予定されています。2026年内受験を考えるなら、古い情報に振り回されず、公式情報と受験日を先に確定させるのが合理的です。
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            ※試験日・休止期間は会場や今後のIPA発表で変わる可能性があります。申込み前に必ずIPA公式サイトをご確認ください。
          </p>
        </div>
      </section>

      <section className="bg-white text-slate-950">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-bold text-blue-700">AI学習の正しい順番</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">AIより先に、学習の流れを設計する</h2>
            <p className="mt-5 leading-8 text-slate-600">生成AIは便利ですが、毎回その場で質問するだけでは学習範囲や復習が散らかりやすくなります。先に4つの流れを固定します。</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {flow.map((item) => (
              <div key={item.number} className="rounded-2xl border border-slate-200 p-6 sm:p-7">
                <p className="text-sm font-black text-blue-700">{item.number}</p>
                <h3 className="mt-2 text-xl font-bold">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-bold text-cyan-200">it-learning-appの役割</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">「何を聞くか」より、「次に何をやるか」を決める</h2>
            <p className="mt-5 leading-8 text-slate-300">
              AIチャットは説明が得意です。it-learning-appは、その説明を含む学習全体を、計画→確認→復習という流れに置くことを重視します。
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            {useCases.map(([problem, solution], index) => (
              <div key={problem} className={`grid gap-2 p-6 sm:grid-cols-2 sm:gap-6 ${index ? "border-t border-white/10" : ""}`}>
                <p className="font-semibold text-slate-300">{problem}</p>
                <p className="font-bold text-white">→ {solution}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 rounded-2xl bg-cyan-300 p-7 text-slate-950 sm:flex sm:items-center sm:justify-between sm:gap-8">
          <div>
            <p className="text-sm font-black">START FREE</p>
            <h3 className="mt-2 text-2xl font-bold">試験日から、今日やることを決める</h3>
            <p className="mt-2 text-slate-800">まずは自分の残り期間に合わせた学習計画を作成します。</p>
          </div>
          <Link href={`${cta}&position=mid`} className="mt-5 inline-block shrink-0 rounded-xl bg-slate-950 px-6 py-3 font-bold text-white sm:mt-0">
            無料で始める
          </Link>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-4xl px-5 py-16 sm:py-24">
          <h2 className="text-3xl font-bold sm:text-4xl">よくある質問</h2>
          <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {faq.map((item) => (
              <div key={item.q} className="py-6">
                <h3 className="text-lg font-bold">{item.q}</h3>
                <p className="mt-3 leading-7 text-slate-300">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 text-center sm:py-24">
        <p className="text-sm font-bold text-cyan-200">2026 IT PASSPORT STUDY</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-5xl">AIを使うなら、合格までの流れごと整える。</h2>
        <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-300">
          試験日、学習時間、問題の結果をつなげて、今日やることを明確にします。
        </p>
        <Link href={`${cta}&position=bottom`} className="mt-8 inline-block rounded-xl bg-white px-8 py-4 font-bold text-slate-950">
          it-learning-appで無料の学習計画を作る
        </Link>
      </section>
    </main>
  );
}
