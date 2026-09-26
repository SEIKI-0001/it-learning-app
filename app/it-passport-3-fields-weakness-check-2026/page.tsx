import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/it-passport-3-fields-weakness-check-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "three-fields-weakness-check-2026";

export const metadata: Metadata = {
  title: "ITパスポート3分野の弱点診断｜ストラテジ・マネジメント・テクノロジ対策【2026年】",
  description:
    "ITパスポートのストラテジ・マネジメント・テクノロジのうち、どこを優先して勉強すべきかを簡単チェック。3分野の特徴、苦手サイン、復習方法を整理し、自分向けの学習計画につなげます。",
  keywords: [
    "ITパスポート 苦手分野",
    "ITパスポート ストラテジ マネジメント テクノロジ",
    "ITパスポート 分野別 勉強法",
    "ITパスポート テクノロジ 難しい",
    "ITパスポート AI 学習",
    "ITパスポート 2026",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポート3分野の弱点診断【2026年】",
    description: "3分野のうち、次にどこを勉強すべきかを苦手サインから確認。",
    type: "website",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート3分野の弱点診断【2026年】",
    description: "ストラテジ・マネジメント・テクノロジの優先順位をチェック。",
  },
};

const faq = [
  {
    q: "ITパスポートで一番出題数が多い分野は？",
    a: "IPAの案内では、100問のうちテクノロジ系が45問程度、ストラテジ系が35問程度、マネジメント系が20問程度です。",
  },
  {
    q: "得意分野だけ勉強すれば合格できますか？",
    a: "おすすめできません。総合評価点だけでなく、ストラテジ・マネジメント・テクノロジの各分野にも300点以上の基準があります。苦手分野を放置しないことが重要です。",
  },
  {
    q: "弱点分野はどうやって見つけますか？",
    a: "分野別に問題を解き、誤答だけでなく迷って正解した問題も記録してください。正答率だけでなく、説明できない論点や同じ種類の誤答が続く分野を弱点候補として扱うと実践的です。",
  },
  {
    q: "2026年はどのシラバスで勉強すればいいですか？",
    a: "IPAが2026年1月8日に掲載したITパスポート試験シラバスVer.6.5が現行です。受験前にはIPA公式サイトで最新情報を確認してください。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: metadata.title,
      description: metadata.description,
      url: pageUrl,
      inLanguage: "ja-JP",
      datePublished: "2026-08-22",
      dateModified: "2026-08-22",
      publisher: { "@type": "Organization", name: "it-learning-app" },
    },
    {
      "@type": "SoftwareApplication",
      name: "it-learning-app",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description: "ITパスポート学習の実力測定、弱点把握、学習計画作成を支援するWebアプリ。",
      url: siteUrl,
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

const CTA = ({ position, label = "無料で弱点から学習計画を作る" }: { position: string; label?: string }) => (
  <Link
    href={`/onboarding?source=${source}&position=${position}`}
    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 font-bold text-white transition hover:bg-slate-700"
  >
    {label}
  </Link>
);

const fields = [
  {
    name: "ストラテジ系",
    count: "約35問",
    role: "経営・法務・マーケティング・会計・システム戦略",
    signs: ["SWOTや4Pなど似た経営用語が混ざる", "著作権・個人情報・契約の違いで迷う", "損益分岐点などの計算で手が止まる"],
    action: "用語を単語だけで覚えず、「何のために使うか」「似た用語と何が違うか」をセットで復習する。",
  },
  {
    name: "マネジメント系",
    count: "約20問",
    role: "システム開発・プロジェクト管理・サービス管理・監査",
    signs: ["開発工程の順番があいまい", "WBS・ガントチャート・EVMなどを混同する", "インシデント管理や変更管理の目的を説明できない"],
    action: "個別用語の暗記より、企画→開発→運用の流れの中で「いつ・誰が・何を管理するか」を整理する。",
  },
  {
    name: "テクノロジ系",
    count: "約45問",
    role: "基礎理論・コンピュータ・DB・ネットワーク・セキュリティ・AI",
    signs: ["ネットワークやDB用語が抽象的に感じる", "2進数・稼働率などの計算問題を避けている", "暗号・認証・攻撃手法の違いが混ざる"],
    action: "仕組みを図や具体例で理解してから問題を解き、間違えた論点だけ類題で再確認する。",
  },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="font-black tracking-tight">it-learning-app</Link>
          <CTA position="header" label="無料で弱点をチェック" />
        </div>
      </header>

      <section className="border-b border-slate-100 bg-gradient-to-b from-sky-50 to-white">
        <div className="mx-auto max-w-5xl px-5 py-16 text-center sm:py-20">
          <p className="text-sm font-bold text-sky-700">2026年8月22日更新｜現行シラバスVer.6.5対応</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">
            ITパスポート3分野の弱点診断
            <span className="mt-2 block text-2xl font-bold text-slate-600 sm:text-3xl">次に勉強すべき分野を決める</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            「テクノロジが難しい気がする」「ストラテジの用語が混ざる」。感覚だけで勉強時間を決めると、必要な対策を外しやすくなります。
            3分野の苦手サインを確認して、次の学習を絞り込みましょう。
          </p>
          <div className="mt-8"><CTA position="hero" /></div>
          <p className="mt-4 text-xs text-slate-500">登録前に、3分野の特徴と苦手サインをこのページで確認できます。</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-center text-3xl font-black">まず知っておきたい3分野の比重</h2>
        <p className="mx-auto mt-4 max-w-3xl text-center leading-7 text-slate-600">
          IPAの案内では、100問の内訳はストラテジ系35問程度、マネジメント系20問程度、テクノロジ系45問程度です。
          ただし、出題数が少ない分野も捨てられません。各分野に300/1,000点以上の基準があるためです。
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {fields.map((field) => (
            <div key={field.name} className="rounded-2xl border border-slate-200 p-6">
              <p className="text-sm font-bold text-sky-700">{field.count}程度</p>
              <h3 className="mt-2 text-xl font-black">{field.name}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{field.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-sky-700">SELF CHECK</p>
              <h2 className="mt-2 text-3xl font-black">当てはまる項目が多い分野は？</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">1つの結果だけで断定せず、実際の問題演習結果と合わせて判断してください。</p>
          </div>
          <div className="mt-8 space-y-6">
            {fields.map((field) => (
              <article key={field.name} className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-2xl font-black">{field.name}</h3>
                  <span className="text-sm font-bold text-slate-500">{field.count}</span>
                </div>
                <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                  {field.signs.map((sign) => (
                    <li key={sign} className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">✓ {sign}</li>
                  ))}
                </ul>
                <div className="mt-5 rounded-xl bg-sky-50 p-4">
                  <p className="text-sm font-bold text-sky-900">優先してやること</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{field.action}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="rounded-3xl bg-sky-50 p-8 sm:p-10">
          <p className="text-sm font-bold text-sky-700">弱点を見つけた後が重要</p>
          <h2 className="mt-2 text-3xl font-black">3分野を均等に勉強する必要はありません。</h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-700">
            重要なのは、問題演習の結果に応じて学習時間を配分し直すことです。得意分野を何度も読み直すより、誤答や「迷って正解した問題」が集中する論点へ戻る方が、次の一問につながります。
          </p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-4">
            {[
              ["1", "問題を解く", "3分野の現在地を確認"],
              ["2", "迷いも記録", "正解でも説明できなければ候補"],
              ["3", "弱点だけ復習", "用語・仕組み・計算を絞る"],
              ["4", "別問題で再判定", "理解が再現できるか確認"],
            ].map(([n, title, body]) => (
              <li key={n} className="rounded-2xl bg-white p-5">
                <span className="text-sm font-black text-sky-700">STEP {n}</span>
                <h3 className="mt-2 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8"><CTA position="mid" /></div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-14">
        <h2 className="text-3xl font-black">AIは「答えを出す人」ではなく弱点の説明役にする</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ["比較させる", "『公開鍵暗号と共通鍵暗号を、用途と鍵の違いで比較して』のように混同ポイントを整理する。"],
            ["間違いを説明させる", "『この選択肢がなぜ違うのか』を説明させ、自分の誤解がどこにあったか確認する。"],
            ["類題を作らせる", "理解した後に数字や状況を変えた類題を解き、本当に再現できるか確認する。"],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-slate-200 p-6">
              <h3 className="font-black">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-3xl font-black">2026年受験者が確認する公式情報</h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            IPAが掲載している現行のITパスポート試験シラバスはVer.6.5です。試験要綱Ver.5.6ではITパスポート試験の内容変更はありません。
            また、システムリプレースに伴い2026年12月28日以降は試験休止予定と案内されています。受験前は必ずIPA公式情報を確認してください。
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold">
            <a href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" target="_blank" rel="noreferrer" className="text-sky-700 underline underline-offset-4">IPA 試験要綱・シラバス</a>
            <a href="https://www.ipa.go.jp/shiken/2026/cbt-202605-jisshi.html" target="_blank" rel="noreferrer" className="text-sky-700 underline underline-offset-4">IPA 2026年CBT試験実施案内</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-3xl font-black">よくある質問</h2>
        <div className="mt-7 space-y-7">
          {faq.map((item) => (
            <div key={item.q}>
              <h3 className="font-black">{item.q}</h3>
              <p className="mt-2 leading-7 text-slate-600">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-5 py-14 text-center">
          <h2 className="text-3xl font-black">「どこが苦手か」で終わらせず、今日やる学習まで決める。</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">
            it-learning-appで、試験日・学習時間・問題演習の結果から、自分向けの学習計画を作成できます。
          </p>
          <div className="mt-7"><CTA position="bottom" /></div>
        </div>
      </section>
    </main>
  );
}
