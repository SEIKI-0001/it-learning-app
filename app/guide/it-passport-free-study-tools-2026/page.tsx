import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-free-study-tools-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;

export const metadata: Metadata = {
  title: "ITパスポートの無料勉強サイト・ツール7選｜独学の組み合わせ方【2026年版】",
  description:
    "ITパスポートを無料で勉強できる公式資料、公開問題、学習アプリ、AIの使い方を初心者向けに整理。無料ツールを合格につながる学習計画へ組み合わせる方法も解説します。",
  keywords: [
    "ITパスポート 無料 勉強サイト",
    "ITパスポート 無料 アプリ",
    "ITパスポート 過去問 無料",
    "ITパスポート AI 学習",
    "ITパスポート 独学",
    "ITパスポート 勉強法 2026",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートの無料勉強サイト・ツール7選【2026年版】",
    description: "無料教材を集めるだけで終わらず、理解・演習・復習をつなげる使い方を解説します。",
    type: "article",
    url: pageUrl,
    siteName: "ITパスポート学習コーチ",
    locale: "ja_JP",
    publishedTime: "2026-08-07",
    modifiedTime: "2026-08-07",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポートの無料勉強サイト・ツール7選",
    description: "2026年の独学に使える無料教材と、迷わず続けるための組み合わせ方を紹介。",
  },
};

const tools = [
  {
    number: "01",
    title: "IPA公式シラバス",
    role: "出題範囲を確認する",
    body: "学ぶ範囲の基準になる公式資料です。最初から全文を暗記するのではなく、参考書や問題で出会った用語が試験範囲に含まれるかを確認する辞書として使います。",
    href: "https://www.ipa.go.jp/shiken/syllabus/gaiyou.html",
    label: "IPA公式シラバスを見る",
  },
  {
    number: "02",
    title: "IPA公式公開問題",
    role: "本番レベルを知る",
    body: "令和8年度を含む公開問題と解答例を無料で確認できます。学習開始直後は得点より問題文の難しさを把握し、仕上げ段階では時間を測って利用します。",
    href: "https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/questions.html",
    label: "公式公開問題を見る",
  },
  {
    number: "03",
    title: "無料の過去問アプリ",
    role: "スキマ時間に演習する",
    body: "スマートフォンで1問ずつ解けるため、通勤・通学中の反復に向いています。収録年度、解説の分かりやすさ、誤答だけを復習できるかを確認して選びます。",
  },
  {
    number: "04",
    title: "解説動画",
    role: "図や流れで理解する",
    body: "ネットワーク、データベース、会計など、文章だけでは理解しづらい分野の補助に有効です。視聴だけで終えず、直後に確認問題を解いて理解できたかを確かめます。",
  },
  {
    number: "05",
    title: "生成AI・AIチャット",
    role: "分からない部分を言い換える",
    body: "『中学生にも分かる例で説明して』『この選択肢が誤りの理由を比較して』のように質問すると理解を補助できます。回答は公式資料や教材と照合し、丸暗記には使わないことが重要です。",
  },
  {
    number: "06",
    title: "デジタル単語帳",
    role: "忘れた用語を反復する",
    body: "全用語を登録するのではなく、問題で間違えた用語や説明できなかった用語だけを追加します。短い間隔で繰り返し、思い出せるかを確認します。",
  },
  {
    number: "07",
    title: "it-learning-app",
    role: "学習計画と復習をつなぐ",
    body: "教材を増やす代わりに、試験日から逆算した計画、毎日の学習内容、確認問題、苦手分野の復習を一つの流れにまとめます。無料ツールを使う順番に迷う人向けです。",
  },
];

const faq = [
  {
    question: "無料教材だけでITパスポート合格を目指せますか？",
    answer:
      "可能ですが、教材を集めるだけでは学習範囲の漏れや復習不足が起きやすくなります。公式シラバスで範囲を確認し、解説で理解し、公開問題で確認する流れを作ることが重要です。",
  },
  {
    question: "無料の過去問は何年分解けばよいですか？",
    answer:
      "最初から年数を目標にせず、まず最新年度で現在地を確認します。誤答の原因を説明できる状態にしてから年度を広げ、最後に本番形式で解く方が効率的です。",
  },
  {
    question: "AIだけで勉強しても大丈夫ですか？",
    answer:
      "AIは言い換えや疑問解消には有効ですが、試験範囲の網羅性や回答の正確性を単独では保証できません。公式シラバス、参考書、公開問題と組み合わせて使います。",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "ITパスポートの無料勉強サイト・ツール7選｜独学の組み合わせ方【2026年版】",
    description:
      "ITパスポートを無料で学べる公式資料、公開問題、アプリ、AIと、それらを合格につながる学習へ組み合わせる方法を解説します。",
    datePublished: "2026-08-07",
    dateModified: "2026-08-07",
    author: { "@type": "Organization", name: "ITパスポート学習コーチ編集部" },
    publisher: { "@type": "Organization", name: "ITパスポート学習コーチ" },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    url: pageUrl,
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  },
];

export default function ItPassportFreeStudyToolsPage() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/blog" className="font-black text-[#12384d]">ITパスポート学習ガイド</Link>
          <Link
            href="/onboarding?source=free-study-tools-2026&position=header"
            className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white transition hover:bg-[#d98f00]"
          >
            無料で計画を作る
          </Link>
        </div>
      </header>

      <article>
        <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <p className="inline-flex rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-black text-[#1b75a6]">
              2026年版・無料で始めたい独学者向け
            </p>
            <h1 className="mt-5 text-4xl font-black leading-tight text-[#12384d] sm:text-6xl">
              ITパスポートの無料勉強サイト・ツール7選
            </h1>
            <p className="mt-6 text-lg leading-9 text-slate-700">
              無料で使える教材は十分にあります。ただし、サイトやアプリを増やしすぎると「次に何を使うか」で迷います。役割を分け、理解・演習・復習を一つの学習サイクルにつなげましょう。
            </p>

            <div className="mt-7 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f7fbfe] p-4">
                <p className="font-black text-[#12384d]">SEOキーワード</p>
                <p className="mt-2 leading-6 text-slate-600">ITパスポート 無料 勉強サイト / 無料アプリ / 過去問</p>
              </div>
              <div className="rounded-2xl bg-[#f7fbfe] p-4">
                <p className="font-black text-[#12384d]">想定読者</p>
                <p className="mt-2 leading-6 text-slate-600">費用を抑えて独学を始めたいが、教材選びに迷っている初心者</p>
              </div>
              <div className="rounded-2xl bg-[#f7fbfe] p-4">
                <p className="font-black text-[#12384d]">訴求軸</p>
                <p className="mt-2 leading-6 text-slate-600">無料教材の数ではなく、使う順番と復習設計で差がつく</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/onboarding?source=free-study-tools-2026&position=hero"
                className="inline-flex justify-center rounded-full bg-[#f7a600] px-6 py-3 text-sm font-black text-white transition hover:bg-[#d98f00]"
              >
                無料で自分専用の学習計画を作る
              </Link>
              <Link
                href="/past-exams/2026?source=free-study-tools-2026"
                className="inline-flex justify-center rounded-full border border-[#1b75a6] px-6 py-3 text-sm font-black text-[#1b75a6] transition hover:bg-[#e8f5fb]"
              >
                2026年公開問題を解く
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-[24px] border border-[#f0d99b] bg-[#fff8e5] p-6 sm:p-8">
            <h2 className="text-2xl font-black text-[#7a5200]">先に結論：無料ツールは3役に絞る</h2>
            <p className="mt-4 leading-8 text-slate-700">
              基礎を理解する教材、実力を確認する問題、間違いを戻す復習管理。この3役がそろえば学習は進められます。複数のサービスで同じ役割を重ねるより、不足している役割だけを追加してください。
            </p>
          </div>
        </section>

        <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-black text-[#12384d]">無料で使える勉強サイト・ツール7選</h2>
            <div className="mt-8 space-y-5">
              {tools.map((tool) => (
                <section key={tool.number} className="rounded-[22px] border border-[#cfe5f2] bg-[#f7fbfe] p-6 sm:p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <p className="text-3xl font-black text-[#8dc8e8]">{tool.number}</p>
                    <div className="flex-1">
                      <p className="text-sm font-black text-[#1b75a6]">{tool.role}</p>
                      <h3 className="mt-1 text-2xl font-black text-[#12384d]">{tool.title}</h3>
                      <p className="mt-3 leading-8 text-slate-700">{tool.body}</p>
                      {tool.href ? (
                        <a
                          href={tool.href}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex font-black text-[#1b75a6] underline decoration-2 underline-offset-4"
                        >
                          {tool.label}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-3xl font-black text-[#12384d]">おすすめの無料学習ルート</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {[
              ["1. 範囲を決める", "公式シラバスと参考書の目次を照らし合わせ、今週学ぶトピックを決めます。"],
              ["2. 理解する", "解説記事・動画・AIを使い、自分の言葉で説明できる状態を目指します。"],
              ["3. 問題で確認する", "確認問題と公開問題を解き、正解したかだけでなく迷った理由も残します。"],
              ["4. 誤答だけ戻る", "間違えた分野を単語帳や短い解説に戻し、数日後にもう一度解きます。"],
            ].map(([title, body]) => (
              <section key={title} className="rounded-[22px] border border-[#cfe5f2] bg-white p-6">
                <h3 className="text-xl font-black text-[#12384d]">{title}</h3>
                <p className="mt-3 leading-8 text-slate-700">{body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-[26px] bg-[#12384d] p-7 text-white sm:p-10">
            <p className="text-sm font-black text-[#9ed8f5]">無料教材を探す時間を、学ぶ時間へ</p>
            <h2 className="mt-2 text-3xl font-black">今日やることを自動で整理する</h2>
            <p className="mt-4 max-w-2xl leading-8 text-slate-200">
              it-learning-appは、試験日と学習状況から毎日の内容を整理し、確認問題の結果に応じて復習対象を見つけます。教材を置き換えるのではなく、無料教材を合格まで使い切るための学習管理役です。
            </p>
            <Link
              href="/onboarding?source=free-study-tools-2026&position=mid"
              className="mt-6 inline-flex rounded-full bg-[#f7a600] px-6 py-3 text-sm font-black text-white transition hover:bg-[#d98f00]"
            >
              無料で学習計画を作る
            </Link>
          </div>
        </section>

        <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-black text-[#12384d]">よくある質問</h2>
            <div className="mt-8 space-y-4">
              {faq.map((item) => (
                <section key={item.question} className="rounded-[20px] border border-[#cfe5f2] p-6">
                  <h3 className="font-black text-[#12384d]">Q. {item.question}</h3>
                  <p className="mt-3 leading-8 text-slate-700">{item.answer}</p>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-4xl rounded-[30px] bg-[#e8f5fb] p-8 text-center sm:p-12">
            <h2 className="text-3xl font-black text-[#12384d]">無料で、迷わない独学を始める</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-700">
              試験日から逆算した計画と理解度チェックで、次に使う教材・解く問題・戻る範囲を整理します。
            </p>
            <Link
              href="/onboarding?source=free-study-tools-2026&position=bottom"
              className="mt-7 inline-flex rounded-full bg-[#f7a600] px-7 py-3 text-sm font-black text-white transition hover:bg-[#d98f00]"
            >
              無料で自分専用の計画を作る
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
