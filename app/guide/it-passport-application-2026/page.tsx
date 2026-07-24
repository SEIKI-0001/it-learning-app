import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-application-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const applicationUrl = "https://www3.jitec.ipa.go.jp/JitesCbt/html/application/applies.html";
const applicationStepsUrl = "https://www3.jitec.ipa.go.jp/JitesCbt/html/examination/apply.html";
const examDayUrl = "https://www3.jitec.ipa.go.jp/JitesCbt/html/examination/order.html";

export const metadata: Metadata = {
  title: "ITパスポートの申し込み方法と受験までの流れ｜2026年版",
  description:
    "ITパスポート試験の申し込み方法を初心者向けに解説。利用者ID登録、会場・試験日の選択、支払い、確認票、当日の持ち物と、申込後に始める学習計画まで整理します。",
  keywords: [
    "ITパスポート 申し込み",
    "ITパスポート 申込方法",
    "ITパスポート 受験予約",
    "ITパスポート 試験日",
    "ITパスポート 確認票",
    "ITパスポート 勉強計画",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートの申し込み方法と受験までの流れ｜2026年版",
    description:
      "利用者ID登録から試験当日までを6ステップで整理。申し込み後の学習計画も無料で作れます。",
    type: "article",
    url: pageUrl,
    siteName: "ITパスポート学習コーチ",
    locale: "ja_JP",
    publishedTime: "2026-07-24",
    modifiedTime: "2026-07-24",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポートの申し込み方法と受験までの流れ",
    description: "申込み、確認票、当日の準備、試験日から逆算した勉強計画をまとめて確認。",
  },
};

const steps = [
  {
    number: "01",
    title: "利用者IDを登録する",
    body: "初めて受験する場合は、公式サイトで利用者IDとパスワードを登録します。氏名は本人確認書類と一致する表記にし、登録後のIDとパスワードは確認票の取得や結果確認に使うため保管します。",
  },
  {
    number: "02",
    title: "会場と試験日を選ぶ",
    body: "利用者メニューから地域、試験会場、空席のある日時を順に選択します。勉強を始めてから日程を決めるのではなく、先に受験日を確定すると、残り日数から学習量を逆算しやすくなります。",
  },
  {
    number: "03",
    title: "支払い方法を選び、申込みを完了する",
    body: "クレジットカード、コンビニ、バウチャーなど、公式画面に表示される方法から選択します。支払い方法や申込時刻によって予約できる最短日が異なるため、直近日程を希望する場合は公式の最新条件を確認してください。",
  },
  {
    number: "04",
    title: "確認票をすぐに保存する",
    body: "申込み完了後は確認票をダウンロードします。確認票には受験番号、利用者ID、確認コード、試験日時、会場などが記載されています。試験直前にパスワードが分からず取得できない事態を避けるため、その日のうちに保存しておくのが安全です。",
  },
  {
    number: "05",
    title: "試験日から学習計画を逆算する",
    body: "申込みが終わったら、参考書を何ページ読むかではなく、確認問題、用語復習、過去問レベル演習をいつ実施するかまで日程に入れます。結果を見ながら苦手分野へ時間を移せる計画にしておくことが重要です。",
  },
  {
    number: "06",
    title: "前日までに当日の持ち物を確認する",
    body: "公式案内では、確認票または受験番号・利用者ID・確認コードの控え、有効期限内の顔写真付き本人確認書類の原本、荷物を収納するカバンが必要です。会場には余裕を持って到着します。",
  },
];

const faq = [
  {
    question: "受験票は郵送されますか？",
    answer:
      "郵送されません。申込み後に利用者メニューから確認票をダウンロードします。印刷できない場合は、受験番号、利用者ID、確認コードの3点を控えて持参します。",
  },
  {
    question: "申し込んだ直後から何を勉強すればよいですか？",
    answer:
      "最初に短い確認問題で現在地を把握し、基礎理解、用語復習、過去問レベル演習の順に配分します。試験までの日数が短い場合は、全範囲を均等に読むより弱点確認を優先します。",
  },
  {
    question: "本人確認書類はコピーでもよいですか？",
    answer:
      "公式案内では原本が必要です。氏名、有効期限、顔写真の状態も事前に確認してください。利用できる書類の詳細は必ず公式ページで確認します。",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "ITパスポートの申し込み方法と受験までの流れ｜2026年版",
    description:
      "ITパスポート試験の利用者ID登録、受験予約、確認票、当日の準備と、申込後の学習計画を解説します。",
    datePublished: "2026-07-24",
    dateModified: "2026-07-24",
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

export default function ItPassportApplicationGuidePage() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/blog" className="font-black text-[#12384d]">
            ITパスポート学習ガイド
          </Link>
          <Link
            href="/onboarding?source=application-guide-2026"
            className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white transition hover:bg-[#d98f00]"
          >
            無料で勉強計画を作る
          </Link>
        </div>
      </header>

      <article>
        <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <p className="inline-flex rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-black text-[#1b75a6]">
              2026年版・初めて受験する人向け
            </p>
            <h1 className="mt-5 text-4xl font-black leading-tight text-[#12384d] sm:text-6xl">
              ITパスポートの申し込み方法と受験までの流れ
            </h1>
            <p className="mt-6 text-lg leading-9 text-slate-700">
              利用者IDの登録から、会場・試験日の予約、確認票、当日の準備までを6ステップで整理します。申込みをゴールにせず、確定した試験日から「今日やること」まで逆算しましょう。
            </p>

            <div className="mt-7 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f7fbfe] p-4">
                <p className="font-black text-[#12384d]">SEOキーワード</p>
                <p className="mt-2 leading-6 text-slate-600">ITパスポート 申し込み / 申込方法 / 受験予約</p>
              </div>
              <div className="rounded-2xl bg-[#f7fbfe] p-4">
                <p className="font-black text-[#12384d]">想定読者</p>
                <p className="mt-2 leading-6 text-slate-600">初受験で、予約から当日までの手順をまとめて確認したい人</p>
              </div>
              <div className="rounded-2xl bg-[#f7fbfe] p-4">
                <p className="font-black text-[#12384d]">訴求軸</p>
                <p className="mt-2 leading-6 text-slate-600">試験日を先に決め、申込直後から合格までの学習を逆算する</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={applicationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex justify-center rounded-full border border-[#1b75a6] px-6 py-3 text-sm font-black text-[#1b75a6] transition hover:bg-[#e8f5fb]"
              >
                IPA公式の受験申込みを確認
              </a>
              <Link
                href="/onboarding?source=application-guide-2026&position=hero"
                className="inline-flex justify-center rounded-full bg-[#f7a600] px-6 py-3 text-sm font-black text-white transition hover:bg-[#d98f00]"
              >
                試験日から無料計画を作る
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-[24px] border border-[#f0d99b] bg-[#fff8e5] p-6 sm:p-8">
            <h2 className="text-2xl font-black text-[#7a5200]">申込み前に知っておきたい要点</h2>
            <ul className="mt-5 space-y-3 leading-8 text-slate-700">
              <li>・受験票は郵送されず、確認票を自分でダウンロードします。</li>
              <li>・支払い方法や申込時刻により、予約可能な最短日が異なります。</li>
              <li>・試験当日は確認票の情報と、指定された本人確認書類の原本が必要です。</li>
              <li>・制度や予約条件は変更される可能性があるため、申込時点の公式案内を優先します。</li>
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-4xl space-y-6 px-4 pb-14 sm:px-6">
          <div>
            <p className="text-sm font-black text-[#1b75a6]">申し込みから受験まで</p>
            <h2 className="mt-2 text-3xl font-black text-[#12384d] sm:text-4xl">迷わない6ステップ</h2>
          </div>

          {steps.map((step) => (
            <section
              key={step.number}
              className="grid gap-5 rounded-[24px] border border-[#cfe5f2] bg-white p-6 shadow-[0_12px_30px_rgba(22,94,131,0.07)] sm:grid-cols-[72px_minmax(0,1fr)] sm:p-8"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#12384d] text-lg font-black text-white">
                {step.number}
              </div>
              <div>
                <h3 className="text-2xl font-black text-[#12384d]">{step.title}</h3>
                <p className="mt-4 leading-8 text-slate-700">{step.body}</p>
              </div>
            </section>
          ))}
        </section>

        <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-black text-[#12384d]">申込み完了後、最初の30分でやること</h2>
            <div className="mt-7 grid gap-5 md:grid-cols-3">
              {[
                ["10分", "現在地を確認", "ストラテジ・マネジメント・テクノロジから短い確認問題を解き、最初の弱点を把握します。"],
                ["10分", "学習可能時間を入力", "平日・休日に無理なく使える時間を設定し、試験日までに確保できる学習量を見積もります。"],
                ["10分", "今日のタスクを開始", "参考書を読む範囲、確認問題、用語復習の3つに絞り、最初の学習を完了させます。"],
              ].map(([time, title, body]) => (
                <div key={title} className="rounded-[22px] border border-[#cfe5f2] bg-[#f7fbfe] p-6">
                  <p className="text-sm font-black text-[#1b75a6]">{time}</p>
                  <h3 className="mt-2 text-xl font-black text-[#12384d]">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-9 rounded-[24px] bg-[#12384d] p-7 text-white sm:p-9">
              <h3 className="text-2xl font-black">試験日は決まった。次は、今日やることを決める。</h3>
              <p className="mt-4 max-w-3xl leading-8 text-[#e6f6fc]">
                it-learning-appは、試験日、使える時間、確認問題の結果から、参考書・用語復習・過去問レベル演習を毎日のタスクに整理します。予定どおり進まなかった日も、理解度を基準に次の計画を調整できます。
              </p>
              <Link
                href="/onboarding?source=application-guide-2026&position=mid-cta"
                className="mt-6 inline-flex rounded-full bg-[#f7a600] px-7 py-4 text-sm font-black text-white transition hover:bg-[#d98f00]"
              >
                無料で自分専用の学習計画を作る
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-3xl font-black text-[#12384d]">よくある質問</h2>
          <div className="mt-7 space-y-4">
            {faq.map((item) => (
              <section key={item.question} className="rounded-[22px] border border-[#cfe5f2] bg-white p-6 sm:p-7">
                <h3 className="text-lg font-black text-[#12384d]">{item.question}</h3>
                <p className="mt-3 leading-8 text-slate-700">{item.answer}</p>
              </section>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={applicationStepsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex justify-center rounded-full border border-[#1b75a6] px-6 py-3 text-sm font-black text-[#1b75a6]"
            >
              公式の申込手順を見る
            </a>
            <a
              href={examDayUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex justify-center rounded-full border border-[#1b75a6] px-6 py-3 text-sm font-black text-[#1b75a6]"
            >
              公式の試験当日案内を見る
            </a>
          </div>
        </section>

        <section className="bg-[#12384d] px-4 py-12 text-white sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-black text-[#8ed4f0]">申込みを、学習開始の合図に</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">試験日から逆算した計画を無料で作成</h2>
            <p className="mx-auto mt-5 max-w-2xl leading-8 text-[#e6f6fc]">
              毎日何をするか迷う時間を減らし、確認問題の結果に応じて、次に学ぶ内容と復習の優先順位を整理します。
            </p>
            <Link
              href="/onboarding?source=application-guide-2026&position=final-cta"
              className="mt-7 inline-flex rounded-full bg-[#f7a600] px-8 py-4 text-base font-black text-white transition hover:bg-[#d98f00]"
            >
              it-learning-appを無料で始める
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
