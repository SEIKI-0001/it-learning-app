import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/compare/it-passport-ai-study-tools-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;

export const metadata: Metadata = {
  title: "ITパスポートAI学習ツール比較｜初心者向けの選び方【2026年版】",
  description:
    "ITパスポート対策で使えるAI学習ツールを、質問、暗記、問題演習、学習計画、復習管理の5軸で比較。独学初心者が自分に合う使い方を選ぶポイントを解説します。",
  keywords: [
    "ITパスポート AI",
    "ITパスポート 学習アプリ",
    "ITパスポート ChatGPT",
    "ITパスポート 独学",
    "ITパスポート 勉強法",
    "ITパスポート 学習計画",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートAI学習ツール比較｜初心者向けの選び方",
    description:
      "チャットAI、単語帳、過去問サイト、AI学習管理アプリを5つの評価軸で比較します。",
    type: "website",
    url: pageUrl,
    siteName: "ITパスポート学習コーチ",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポートAI学習ツール比較【2026年版】",
    description:
      "AIに質問できるだけで十分？計画・確認・復習まで含めて初心者向けに比較します。",
  },
};

const comparisonRows = [
  {
    type: "汎用チャットAI",
    bestFor: "分からない用語をその場で質問したい人",
    strengths: ["説明の言い換え", "具体例の作成", "追加質問への対応"],
    cautions: ["回答の正確性を自分で確認する必要がある", "進捗や復習履歴は自動ではつながりにくい"],
    score: ["◎", "△", "○", "△", "△"],
  },
  {
    type: "単語帳・暗記アプリ",
    bestFor: "専門用語をスキマ時間に反復したい人",
    strengths: ["短時間で使いやすい", "反復回数を増やしやすい", "暗記範囲が明確"],
    cautions: ["用語同士の関係や背景理解は弱くなりやすい", "試験全体の学習順は別途必要"],
    score: ["△", "◎", "△", "△", "○"],
  },
  {
    type: "過去問・問題演習サイト",
    bestFor: "出題形式に慣れ、弱点を発見したい人",
    strengths: ["演習量を確保しやすい", "正答率を把握しやすい", "本番形式に慣れやすい"],
    cautions: ["答えを覚えるだけになることがある", "理解不足の原因分析は自分で行う必要がある"],
    score: ["△", "△", "◎", "△", "○"],
  },
  {
    type: "AI学習管理アプリ",
    bestFor: "何をいつ学ぶかまで一つにまとめたい人",
    strengths: ["試験日から逆算しやすい", "確認問題と復習をつなげやすい", "今日やることが明確になる"],
    cautions: ["単発の質問だけなら機能が多く感じる場合がある", "教材との役割分担を決める必要がある"],
    score: ["○", "○", "○", "◎", "◎"],
  },
];

const axes = ["質問", "暗記", "演習", "計画", "復習"];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "ITパスポートAI学習ツール比較｜初心者向けの選び方【2026年版】",
  description:
    "ITパスポート対策向けAI学習ツールを、質問、暗記、問題演習、学習計画、復習管理の5軸で比較します。",
  url: pageUrl,
  datePublished: "2026-07-20",
  dateModified: "2026-07-20",
  publisher: {
    "@type": "Organization",
    name: "ITパスポート学習コーチ",
  },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: comparisonRows.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.type,
      description: item.bestFor,
    })),
  },
};

export default function AiStudyToolsComparisonPage() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/blog" className="font-black text-[#12384d]">
            ITパスポート学習ガイド
          </Link>
          <Link
            href="/onboarding?source=ai-tools-comparison"
            className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white"
          >
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="inline-flex rounded-full bg-[#fff2cc] px-3 py-1 text-xs font-black text-[#9a6400]">
            AI学習ツール比較・2026年版
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-[#12384d] sm:text-6xl">
            ITパスポートのAI学習ツールは、問題数より「学習がつながるか」で選ぶ
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-9 text-slate-700">
            AIに質問できることと、合格まで学習を進められることは別です。チャットAI、単語帳、過去問サイト、AI学習管理アプリを、質問・暗記・演習・計画・復習の5軸で比較します。
          </p>

          <dl className="mt-8 grid gap-4 text-sm leading-7 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f7fbfe] p-5">
              <dt className="font-black text-[#12384d]">SEOキーワード</dt>
              <dd className="mt-2 text-slate-600">ITパスポート AI / 学習アプリ / ChatGPT / 独学</dd>
            </div>
            <div className="rounded-2xl bg-[#f7fbfe] p-5">
              <dt className="font-black text-[#12384d]">想定読者</dt>
              <dd className="mt-2 text-slate-600">AIを勉強に使いたいが、どの種類を選ぶべきか迷っている初心者</dd>
            </div>
            <div className="rounded-2xl bg-[#f7fbfe] p-5">
              <dt className="font-black text-[#12384d]">訴求軸</dt>
              <dd className="mt-2 text-slate-600">単発の便利さではなく、計画・理解確認・復習までつながるかを見る</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="overflow-x-auto rounded-[24px] border border-[#cfe5f2] bg-white shadow-[0_16px_40px_rgba(22,94,131,0.08)]">
          <table className="min-w-[820px] w-full text-left text-sm">
            <thead className="bg-[#12384d] text-white">
              <tr>
                <th className="px-5 py-4 font-black">ツールの種類</th>
                {axes.map((axis) => (
                  <th key={axis} className="px-4 py-4 text-center font-black">{axis}</th>
                ))}
                <th className="px-5 py-4 font-black">向いている人</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.type} className="border-t border-[#d7edf7] align-top">
                  <th className="px-5 py-5 text-base font-black text-[#12384d]">{row.type}</th>
                  {row.score.map((value, index) => (
                    <td key={`${row.type}-${axes[index]}`} className="px-4 py-5 text-center text-lg font-black text-[#1b75a6]">{value}</td>
                  ))}
                  <td className="px-5 py-5 leading-7 text-slate-700">{row.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-6 text-slate-500">◎：特に得意　○：対応しやすい　△：別の方法による補完が必要</p>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 pb-12 sm:px-6 lg:grid-cols-2">
        {comparisonRows.map((row) => (
          <article key={row.type} className="rounded-[24px] border border-[#cfe5f2] bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-black text-[#12384d]">{row.type}</h2>
            <p className="mt-3 font-bold leading-7 text-[#1b75a6]">向いている人：{row.bestFor}</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="font-black text-[#12384d]">強み</h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                  {row.strengths.map((item) => <li key={item}>・{item}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-black text-[#9a6400]">注意点</h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                  {row.cautions.map((item) => <li key={item}>・{item}</li>)}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-black text-[#12384d]">初心者が選ぶときの3つの基準</h2>
          <div className="mt-8 space-y-5">
            {[
              ["1. 今日やることが決まるか", "ツールを開いたあとに何をすべきか迷うなら、便利でも継続しにくくなります。試験日と使える時間から、今日の学習を具体化できるか確認します。"],
              ["2. 正解・不正解の次に進めるか", "問題を解くだけでなく、間違えた原因を特定し、確認問題や用語復習へ戻れる仕組みがあると、同じミスを減らしやすくなります。"],
              ["3. 学習結果で計画を変えられるか", "予定どおり進んだかだけでなく、理解度や演習結果を見て、次の学習量や復習の優先順位を調整できることが重要です。"],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl bg-[#f7fbfe] p-6">
                <h3 className="text-xl font-black text-[#12384d]">{title}</h3>
                <p className="mt-3 leading-8 text-slate-700">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#12384d] px-4 py-12 text-white sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black text-[#ffd270]">比較後の次の一歩</p>
          <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            it-learning-appで、今日の学習から無料で整理する
          </h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#e6f6fc]">
            it-learning-appは、試験日から逆算した計画、毎日の学習内容、確認問題、用語復習、過去問レベル演習を一つの流れにまとめます。教材を増やすのではなく、今ある教材を最後まで使い切るための学習管理を支援します。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/onboarding?source=ai-tools-comparison"
              className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 font-black text-white transition hover:bg-[#d98f00]"
            >
              無料で自分専用の学習計画を作る
            </Link>
            <Link
              href="/it-passport-study-coach"
              className="inline-flex justify-center rounded-full border border-white/50 px-7 py-4 font-black text-white transition hover:bg-white/10"
            >
              AI学習コーチの仕組みを見る
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <h2 className="text-2xl font-black text-[#12384d]">まとめ</h2>
        <p className="mt-4 leading-8 text-slate-700">
          用語の質問、暗記、過去問演習には、それぞれ得意なツールがあります。ただし、独学で合格まで進めるには、それらを試験日から逆算した計画と復習サイクルにつなぐ必要があります。まずは自分が最も迷っている工程を特定し、その工程を補えるツールから選びましょう。
        </p>
      </section>
    </main>
  );
}
