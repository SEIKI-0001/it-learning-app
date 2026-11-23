import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-university-students-job-hunting-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "university-students-job-hunting-2026";

export const metadata: Metadata = {
  title: "大学生がITパスポートを取るメリット5選｜就活での活かし方【2026年】",
  description: "大学生がITパスポートを取るメリットを2026年向けに整理。就活での伝え方、文系・IT未経験者の勉強順、取得後にやることまで解説します。",
  keywords: ["ITパスポート 大学生", "ITパスポート 就活", "ITパスポート 大学生 メリット", "ITパスポート 文系", "ITパスポート AI 学習", "ITパスポート 2026"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "大学生がITパスポートを取るメリット5選【2026年】", description: "資格を取って終わりにせず、就活で説明できる学びに変える方法を解説。", type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title: "大学生がITパスポートを取るメリット5選", description: "就活での活かし方と、IT未経験からの勉強順を解説します。" },
};

const benefits = [
  ["01", "ITの基礎を体系的に学べる", "セキュリティやネットワークだけでなく、経営・会計・プロジェクト管理まで、仕事で使う基礎知識を横断して学べます。"],
  ["02", "IT未経験でも学習の入口を作れる", "専門知識がない状態でも、用語を一つずつ整理しながら進められます。文系学生がIT分野へ触れる最初の資格としても使えます。"],
  ["03", "就活で学習行動を説明しやすい", "資格名だけをアピールするのではなく、『なぜ学んだか』『何を理解したか』まで話せれば、主体的な学習経験として伝えられます。"],
  ["04", "業界研究の解像度が上がる", "クラウド、DX、情報セキュリティ、経営戦略などの基本語彙を知ることで、企業説明やニュースを理解しやすくなります。"],
  ["05", "次の学習テーマを見つけやすい", "3分野を広く学ぶため、自分がテクノロジ・経営・マネジメントのどこに興味を持つか確認できます。"],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "大学生がITパスポートを取るメリット5選｜就活での活かし方【2026年】",
  description: "大学生向けにITパスポート取得のメリットと就活での活かし方を解説。",
  mainEntityOfPage: pageUrl,
  publisher: { "@type": "Organization", name: "it-learning-app" },
};

function CTA({ position }: { position: string }) {
  return <Link href={`/onboarding?source=${source}&position=${position}`} className="inline-flex rounded-xl bg-slate-900 px-6 py-3 font-bold text-white hover:bg-slate-700">無料で自分専用の学習計画を作る</Link>;
}

export default function Page() {
  return <main className="min-h-screen bg-white text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="border-b border-slate-200"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold">it-learning-app</Link><CTA position="header" /></div></header>
    <article>
      <section className="mx-auto max-w-4xl px-5 py-16">
        <p className="mb-4 font-semibold text-slate-500">大学生・就活準備向け｜2026年版</p>
        <h1 className="text-4xl font-black leading-tight md:text-5xl">大学生がITパスポートを取るメリット5選<br />就活での活かし方</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">「就活のためにITパスポートを取る意味はある？」と迷っている大学生へ。資格名を履歴書に追加するだけではなく、ITの基礎を学び、自分の言葉で説明できる状態まで持っていくことが重要です。</p>
        <div className="mt-8"><CTA position="hero" /></div>
      </section>

      <section className="bg-slate-50"><div className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-3xl font-black">大学生が取るメリット5選</h2>
        <div className="mt-8 grid gap-5">{benefits.map(([n,t,d]) => <div key={n} className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-sm font-bold text-slate-400">{n}</p><h3 className="mt-1 text-xl font-bold">{t}</h3><p className="mt-3 leading-7 text-slate-600">{d}</p></div>)}</div>
      </div></section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-3xl font-black">就活では「持っている」より「なぜ取ったか」</h2>
        <p className="mt-5 leading-8 text-slate-700">ITパスポートだけで採用が決まるわけではありません。就活で使うなら、「デジタル領域に関心を持った理由」「学習で苦手だった分野」「どう克服したか」「学んだ知識を志望業界でどう使いたいか」まで説明できるようにしておきましょう。</p>
        <div className="mt-8 rounded-2xl bg-slate-900 p-7 text-white"><h3 className="text-xl font-bold">資格取得を、学習経験として残す</h3><p className="mt-3 leading-7 text-slate-300">it-learning-appなら、試験日と使える時間から学習計画を作り、問題演習で見つかった弱点を次の復習につなげられます。</p><div className="mt-5"><CTA position="mid" /></div></div>
      </section>

      <section className="bg-slate-50"><div className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-3xl font-black">大学生の勉強順はこの4ステップ</h2>
        <ol className="mt-7 space-y-4 text-slate-700"><li><b>1. 受験候補日を決める：</b>授業・試験・就活予定から逆算します。</li><li><b>2. 3分野を一度広く見る：</b>ストラテジ、マネジメント、テクノロジの全体像を把握します。</li><li><b>3. 早めに問題を解く：</b>参考書を完璧にする前に演習し、苦手分野を見つけます。</li><li><b>4. 弱点だけ復習する：</b>AIには答えではなく、似た用語の比較や間違えた理由の説明を依頼すると効率的です。</li></ol>
      </div></section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-3xl font-black">2026年受験なら現行範囲を基準に</h2>
        <p className="mt-5 leading-8 text-slate-700">学習範囲や受験ルールは変更されることがあります。教材を選ぶ際は、IPAが公開する最新シラバスと試験案内を確認してください。古い教材だけに依存せず、現在の出題範囲に合わせて学習することが重要です。</p>
        <p className="mt-4"><a className="font-bold underline" href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" target="_blank" rel="noreferrer">IPA公式：試験要綱・シラバス</a></p>
      </section>

      <section className="bg-slate-900"><div className="mx-auto max-w-4xl px-5 py-14 text-center text-white"><h2 className="text-3xl font-black">まず、今日やることを決める</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">試験日と使える時間を入れて、自分向けの学習計画から始めましょう。</p><div className="mt-7"><CTA position="bottom" /></div></div></section>
    </article>
  </main>;
}
