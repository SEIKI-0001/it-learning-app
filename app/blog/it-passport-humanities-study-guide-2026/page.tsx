import type { Metadata } from "next";
import Link from "next/link";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/blog/it-passport-humanities-study-guide-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "humanities-study-guide-2026";

export const metadata: Metadata = {
  title: "文系でもITパスポートは合格できる？IT未経験向け勉強法【2026年】",
  description:
    "文系・IT未経験でもITパスポートを目指せる？2026年の試験範囲をもとに、数学やテクノロジ系が不安な人向けの勉強順と弱点対策を解説します。",
  keywords: [
    "ITパスポート 文系",
    "ITパスポート 文系 勉強法",
    "ITパスポート IT未経験",
    "ITパスポート 初心者",
    "ITパスポート テクノロジ 苦手",
    "ITパスポート AI 学習",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "文系でもITパスポートは合格できる？IT未経験向け勉強法【2026年】",
    description:
      "文系・IT未経験者がつまずきやすいポイントを整理し、3分野を効率よく学ぶ順番を解説。",
    type: "article",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "文系でもITパスポートは合格できる？",
    description:
      "IT未経験者向けに、丸暗記と苦手分野の放置を避ける勉強法を解説します。",
  },
};

const studySteps = [
  {
    number: "01",
    title: "最初に3分野の全体像だけつかむ",
    text: "ストラテジは仕事・経営、マネジメントは開発・運用、テクノロジはITの仕組み、と大きく分けます。最初から細かい用語を全部覚えようとしないことが重要です。",
  },
  {
    number: "02",
    title: "テクノロジ系は図と比較で理解する",
    text: "ネットワーク、データベース、セキュリティは文章だけで暗記せず、役割やつながりを図で整理します。似た用語は横並びで比較すると混同を減らせます。",
  },
  {
    number: "03",
    title: "早めに問題演習へ移る",
    text: "参考書を完璧にしてから過去問へ進む必要はありません。問題で実際の聞かれ方を知り、理解が浅いテーマを見つけます。",
  },
  {
    number: "04",
    title: "間違えた理由を分ける",
    text: "『知らなかった』『似た用語と混同』『計算手順が不明』『問題文の読み違い』に分類します。原因が違えば、必要な復習も変わります。",
  },
  {
    number: "05",
    title: "弱点だけ別問題で再確認する",
    text: "解説を読んだ直後に同じ問題を解くだけでは答えを覚えている可能性があります。別問題で同じ知識を使えるか確認して、理解できたかを判定します。",
  },
];

const worries = [
  {
    label: "数学が苦手",
    answer:
      "計算問題はありますが、試験全体が数学試験ではありません。公式を覚えるだけでなく、割合・損益分岐点・稼働率などを『何を求める問題か』で分類して練習します。",
  },
  {
    label: "IT用語を知らない",
    answer:
      "最初は知らなくて当然です。略語を単独暗記せず、『何のための仕組みか』『似た用語と何が違うか』の2点から覚えると整理しやすくなります。",
  },
  {
    label: "テクノロジ系が怖い",
    answer:
      "難しい章を最初から完璧にするより、基礎を一度通した後に問題演習で弱点を特定します。分からないテーマだけ戻る方が学習量を絞れます。",
  },
];

const faq = [
  {
    question: "文系でもITパスポートに合格できますか？",
    answer:
      "ITパスポートはIT職だけを対象とした試験ではなく、IT化された社会で働く人に必要な基礎知識を問う国家試験です。文系・理系よりも、3分野を広く学び、問題演習で弱点を補うことが重要です。",
  },
  {
    question: "プログラミング経験がなくても大丈夫ですか？",
    answer:
      "プログラミング経験がなくても学習を始められます。シラバスに沿って基礎概念を理解し、選択問題で知識を使える状態にすることを優先してください。",
  },
  {
    question: "文系はどの分野から勉強すべきですか？",
    answer:
      "得意分野を決めつけるより、まず3分野に一度触れてから問題演習で現在地を確認する方法がおすすめです。弱点が見えた後に学習時間を再配分します。",
  },
  {
    question: "2026年はどのシラバスで勉強すればいいですか？",
    answer:
      "IPAが2026年1月8日に掲載したITパスポート試験シラバスVer.6.5が現行版です。教材が現行シラバスに対応しているか確認してください。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BlogPosting",
      headline: "文系でもITパスポートは合格できる？IT未経験向け勉強法【2026年】",
      description:
        "文系・IT未経験者向けに、ITパスポートの勉強順と弱点対策を解説。",
      url: pageUrl,
      inLanguage: "ja-JP",
      datePublished: "2026-08-28",
      dateModified: "2026-08-28",
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

export default function ItPassportHumanitiesStudyGuidePage() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-800">
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
            className="rounded-full bg-[#ea580c] px-4 py-2 text-sm font-black text-white transition hover:bg-[#c2410c]"
          >
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <article>
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
            <div>
              <p className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-sm font-black text-orange-700">
                文系・IT未経験者向け 2026
              </p>
              <h1 className="mt-6 text-[38px] font-black leading-[1.12] text-[#17384d] sm:text-6xl">
                文系でも、ITパスポートは
                <span className="text-orange-600">勉強の順番で変わる。</span>
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
                「数学が苦手」「IT用語をほとんど知らない」という状態でも、最初から全部を理解する必要はありません。3分野の全体像をつかみ、問題で弱点を見つけ、分からない部分だけ戻る。この順番なら、IT未経験でも学習を進めやすくなります。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/onboarding?source=${source}&position=hero`}
                  className="inline-flex justify-center rounded-full bg-[#ea580c] px-7 py-4 text-base font-black text-white transition hover:bg-[#c2410c]"
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

            <aside className="rounded-[30px] bg-[#17384d] p-7 text-white shadow-[0_28px_70px_rgba(15,23,42,0.22)]">
              <p className="text-sm font-black text-orange-200">最初に捨てたい3つの思い込み</p>
              <div className="mt-5 space-y-4">
                {[
                  ["文系だから不利", "→ まず現在地を測る"],
                  ["全部暗記してから問題", "→ 早めに演習する"],
                  ["苦手分野を避ける", "→ 弱点だけ短く戻る"],
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
          <p className="text-sm font-black text-orange-700">結論</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#17384d] sm:text-5xl">
            文系・理系より、「弱点が分かっているか」が重要。
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-700">
            IPAはITパスポートを、IT化された社会で働くすべての人に必要な基礎知識を問う国家試験と位置付けています。令和7年度の年間応募者数は307,266人、合格率は48.6％でした。試験範囲は経営・マネジメント・IT技術まで広いため、得意不得意を早めに把握して学習時間を配分する方が合理的です。
          </p>
          <div className="mt-8 rounded-[26px] border border-orange-200 bg-orange-50 p-6 sm:p-8">
            <p className="font-black text-[#17384d]">2026年の学習範囲</p>
            <p className="mt-3 leading-8 text-slate-700">
              現行シラバスはVer.6.5です。教材を増やす前に、使っている教材が現行範囲に対応しているか確認しましょう。
            </p>
          </div>
        </section>

        <section className="bg-orange-50 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-sm font-black text-orange-700">不安を分解する</p>
            <h2 className="mt-3 text-3xl font-black text-[#17384d] sm:text-5xl">
              文系・IT未経験者がつまずきやすい3ポイント
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {worries.map((item) => (
                <section key={item.label} className="rounded-[26px] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                  <p className="text-sm font-black text-orange-600">{item.label}</p>
                  <p className="mt-4 text-sm leading-7 text-slate-700">{item.answer}</p>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-black text-orange-700">5ステップ</p>
          <h2 className="mt-3 text-3xl font-black text-[#17384d] sm:text-5xl">
            IT未経験から進める勉強の順番
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {studySteps.map((step) => (
              <section key={step.number} className="rounded-[24px] border border-slate-200 bg-white p-5">
                <p className="text-3xl font-black text-orange-600">{step.number}</p>
                <h3 className="mt-4 text-lg font-black text-[#17384d]">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">{step.text}</p>
              </section>
            ))}
          </div>
        </section>

        <section className="bg-[#17384d] px-4 py-14 text-white sm:px-6 sm:py-20">
          <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="text-sm font-black text-orange-200">AIは「答え」より「理解補助」に使う</p>
              <h2 className="mt-3 text-3xl font-black sm:text-5xl">
                分からない理由を、短くつぶす。
              </h2>
              <p className="mt-5 max-w-3xl leading-8 text-slate-200">
                AIには「RTOとRPOを初心者向けに比較して」「公開鍵暗号と共通鍵暗号を図のイメージで説明して」のように、理解できない一点を説明させる使い方が向いています。説明を読んだら、別問題で自力回答できるか確認します。
              </p>
            </div>
            <div className="rounded-[26px] bg-white/10 p-6">
              <p className="font-black">it-learning-appなら</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                試験日と学習可能時間から計画を作り、問題演習で見つかった弱点に次の学習を寄せられます。「何を勉強すればいいか」で止まりにくくするための学習支援です。
              </p>
              <Link
                href={`/onboarding?source=${source}&position=mid`}
                className="mt-6 inline-flex w-full justify-center rounded-full bg-[#f97316] px-6 py-4 font-black text-white transition hover:bg-[#ea580c]"
              >
                無料で弱点から学習計画を作る
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-black text-orange-700">FAQ</p>
          <h2 className="mt-3 text-3xl font-black text-[#17384d] sm:text-5xl">よくある質問</h2>
          <div className="mt-8 space-y-4">
            {faq.map((item) => (
              <section key={item.question} className="rounded-[22px] border border-slate-200 bg-white p-6">
                <h3 className="font-black text-[#17384d]">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">{item.answer}</p>
              </section>
            ))}
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-4xl rounded-[34px] bg-orange-50 p-8 text-center sm:p-12">
            <p className="text-sm font-black text-orange-700">文系かどうかではなく、今の弱点から始める。</p>
            <h2 className="mt-4 text-3xl font-black text-[#17384d] sm:text-5xl">
              今日やることを、自分専用に決める。
            </h2>
            <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-700">
              試験日、平日・休日に使える時間、3分野の理解度から、無理のない学習順を作ります。
            </p>
            <Link
              href={`/onboarding?source=${source}&position=bottom`}
              className="mt-8 inline-flex justify-center rounded-full bg-[#ea580c] px-8 py-4 text-base font-black text-white transition hover:bg-[#c2410c]"
            >
              無料で自分専用の学習計画を作る
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
