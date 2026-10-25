import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/it-passport-readiness-check-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "readiness-check-2026";

export const metadata: Metadata = {
  title: "ITパスポートに合格できるか診断｜今の実力と弱点をチェック【2026年】",
  description:
    "ITパスポートに今の実力で合格できるか不安な人向け。3分野の理解度、問題演習、弱点から現在地を確認し、次にやるべき勉強を決める方法を解説します。無料で学習計画も作れます。",
  keywords: [
    "ITパスポート 合格できるか",
    "ITパスポート 合格診断",
    "ITパスポート 実力チェック",
    "ITパスポート 合格ライン",
    "ITパスポート 弱点",
    "ITパスポート AI 学習",
    "ITパスポート 勉強法 2026",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートに合格できるか診断｜今の実力をチェック【2026年】",
    description: "正答率だけでなく、3分野の弱点と学習状況から現在地を確認。次にやるべき勉強まで整理します。",
    type: "website",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポートに合格できるか診断【2026年】",
    description: "今の実力・弱点を確認し、合格に向けて次にやるべきことを整理します。",
  },
};

const checks = [
  {
    title: "3分野を一度は解いている",
    text: "ストラテジ・マネジメント・テクノロジを偏りなく確認できているかを見ます。",
  },
  {
    title: "正解だけでなく迷った問題も記録している",
    text: "偶然正解した問題を理解済みにしないことが、弱点の見落とし防止につながります。",
  },
  {
    title: "弱点を別問題で再確認している",
    text: "解説を読んで終わらず、類題で再び正解できるかを見ると理解の定着を確認できます。",
  },
  {
    title: "本番形式の演習をしている",
    text: "100問・120分の試験を意識し、知識だけでなく解答ペースも確認します。",
  },
];

const faq = [
  {
    q: "ITパスポートは何点取れば合格ですか？",
    a: "現行試験では、総合評価点600点以上に加えて、ストラテジ・マネジメント・テクノロジの3分野でそれぞれ300点以上が必要です。評価点はIRT方式で算出されるため、単純に正答数だけで合否を確定することはできません。",
  },
  {
    q: "過去問で何割取れれば合格できますか？",
    a: "過去問の正答率は現在地を知る参考にはなりますが、実際の評価点はIRT方式で算出されます。正答率だけでなく、3分野の偏りや、迷って正解した問題、再演習での定着も確認するのがおすすめです。",
  },
  {
    q: "一度高得点なら、もう受験して大丈夫ですか？",
    a: "1回だけの高得点より、別の問題でも安定して解けることが重要です。特に苦手分野を別問題で再確認し、本番形式で時間配分も確認してから受験すると安心です。",
  },
  {
    q: "AIはITパスポートの勉強にどう使えばいいですか？",
    a: "答えを直接聞くより、間違えた理由の説明、似た用語の比較、類題作成などに使うと復習を効率化できます。最終的には自分で問題を解き直して理解を確認してください。",
  },
];

function Cta({ position, label = "無料で今の実力から学習計画を作る" }: { position: string; label?: string }) {
  return (
    <Link
      href={`/onboarding?source=${source}&position=${position}`}
      className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-slate-700"
    >
      {label}
    </Link>
  );
}

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "ITパスポートに合格できるか診断｜今の実力と弱点をチェック【2026年】",
        url: pageUrl,
        description: metadata.description,
        inLanguage: "ja-JP",
      },
      {
        "@type": "SoftwareApplication",
        name: "it-learning-app",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description: "ITパスポート学習を、問題演習・弱点確認・学習計画につなげる学習支援アプリ。",
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="font-bold tracking-tight">it-learning-app</Link>
          <Cta position="header" label="無料で実力チェックを始める" />
        </div>
      </header>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-5 py-16 sm:py-20">
          <p className="mb-4 text-sm font-bold text-slate-600">2026年 ITパスポート学習ガイド</p>
          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            今の実力で、ITパスポートに<br className="hidden sm:block" />合格できるか知りたい人へ。
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
            「過去問で7割だったから大丈夫」とは限りません。ITパスポートは総合点だけでなく3分野それぞれに合格基準があります。正答率、分野ごとの弱点、再演習での定着をまとめて見て、次に何を勉強するか決めましょう。
          </p>
          <div className="mt-8"><Cta position="hero" /></div>
          <p className="mt-3 text-xs text-slate-500">学習条件と問題演習の結果をもとに、次の学習につなげられます。</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-2xl font-black sm:text-3xl">まず知っておきたいITパスポートの合格基準</h2>
        <p className="mt-5 leading-8 text-slate-700">
          現行のITパスポート試験は100問・120分です。合格には総合評価点600点以上に加え、ストラテジ系・マネジメント系・テクノロジ系の3分野でそれぞれ300点以上が必要です。評価点はIRT方式で算出されるため、「60問正解なら必ず600点」のような単純換算はできません。
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-6">
            <div className="text-sm font-bold text-slate-500">総合評価点</div>
            <div className="mt-2 text-3xl font-black">600 / 1,000点以上</div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <div className="text-sm font-bold text-slate-500">分野別評価点</div>
            <div className="mt-2 text-3xl font-black">各300 / 1,000点以上</div>
          </div>
        </div>
        <a className="mt-5 inline-block text-sm font-bold underline" href="https://www3.jitec.ipa.go.jp/JitesCbt/html/about/range.html" target="_blank" rel="noreferrer">IPA公式の試験内容・出題範囲を確認する</a>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-4xl px-5 py-14">
          <h2 className="text-2xl font-black sm:text-3xl">「合格できそうか」は4つの状態で確認する</h2>
          <p className="mt-5 leading-8 text-slate-700">
            1回の模試点数だけで判断するより、学習証拠を複数見る方が現在地を把握しやすくなります。以下を順番に確認してください。
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {checks.map((item, index) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-black text-slate-500">CHECK {index + 1}</div>
                <h3 className="mt-2 text-xl font-black">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-2xl font-black sm:text-3xl">正答率だけを見ると、弱点を見落としやすい</h2>
        <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid gap-3 border-b border-slate-200 p-5 sm:grid-cols-[160px_1fr]">
            <div className="font-black">正答した</div>
            <div className="text-slate-600">本当に理解して正解したか、消去法や勘だったかを分けます。</div>
          </div>
          <div className="grid gap-3 border-b border-slate-200 p-5 sm:grid-cols-[160px_1fr]">
            <div className="font-black">間違えた</div>
            <div className="text-slate-600">知識不足・用語混同・計算ミスなど、原因を分けて復習します。</div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-[160px_1fr]">
            <div className="font-black">復習した</div>
            <div className="text-slate-600">別問題でも解けるか再確認して、初めて「定着した」と判断します。</div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-5 py-14 text-center">
          <p className="text-sm font-bold text-slate-300">点数を見るだけで終わらせない</p>
          <h2 className="mt-3 text-3xl font-black">実力測定から「次にやること」までつなげる。</h2>
          <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-300">
            it-learning-appは、問題演習で現在地を確認し、弱点を次の復習や学習計画につなげるための学習支援アプリです。試験日と使える時間も踏まえて、今日やることを具体化できます。
          </p>
          <div className="mt-8"><Cta position="mid" label="無料で今の実力から計画を作る" /></div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-2xl font-black sm:text-3xl">AIは「答えを教える係」ではなく「弱点を説明する係」にする</h2>
        <p className="mt-5 leading-8 text-slate-700">
          AIを使うなら、正解をそのまま聞くよりも、「なぜこの選択肢が違う？」「AとBの違いを初心者向けに比較して」「数字を変えた類題を1問作って」といった使い方が有効です。最後は必ず自分で別問題を解き、理解できたかを確認しましょう。
        </p>
        <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-lg font-black">2026年受験者へ</h3>
          <p className="mt-3 leading-7 text-slate-600">
            IPAが掲載している現行ITパスポート試験のシラバスはVer.6.5です。2027年度から新試験制度が予定されていますが、2026年6月30日時点では新ITパスポート試験のシラバス案は準備中とされています。2026年中に受験する場合は、現行範囲を基準に学習を進めてください。
          </p>
          <a className="mt-4 inline-block text-sm font-bold underline" href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" target="_blank" rel="noreferrer">IPA公式シラバスを確認する</a>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-2xl font-black sm:text-3xl">よくある質問</h2>
        <div className="mt-7 space-y-4">
          {faq.map((item) => (
            <details key={item.q} className="rounded-2xl border border-slate-200 p-5">
              <summary className="cursor-pointer font-bold">{item.q}</summary>
              <p className="mt-4 leading-7 text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-5 py-14 text-center">
          <h2 className="text-2xl font-black sm:text-3xl">「受かるかな？」を、今日やることに変える。</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-600">
            今の点数だけで悩むより、弱点を確認して次の一歩を決めましょう。試験日・学習時間・現在地に合わせた学習計画から始められます。
          </p>
          <div className="mt-8"><Cta position="bottom" /></div>
        </div>
      </section>
    </main>
  );
}
