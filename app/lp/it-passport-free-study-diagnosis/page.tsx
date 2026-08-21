import type { Metadata } from "next";
import Link from "next/link";

const title = "ITパスポート無料学習診断｜試験日から今日やることをAIで整理";
const description =
  "ITパスポートの勉強を何から始めるべきか迷っている初心者向けに、試験日・学習時間・理解度から今日の学習メニューを作る無料診断LPです。";
const canonical =
  "https://it-learning-app.vercel.app/lp/it-passport-free-study-diagnosis";

export const metadata: Metadata = {
  title: `${title} | ITパスポート学習コーチ`,
  description,
  alternates: { canonical },
  keywords: [
    "ITパスポート 無料診断",
    "ITパスポート 勉強計画",
    "ITパスポート AI",
    "ITパスポート 初心者",
    "ITパスポート 独学",
    "ITパスポート 学習アプリ",
  ],
  openGraph: {
    title,
    description,
    type: "website",
    url: canonical,
    siteName: "ITパスポート学習コーチ",
    locale: "ja_JP",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: title,
  description,
  url: canonical,
  mainEntity: {
    "@type": "SoftwareApplication",
    name: "it-learning-app",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description:
      "ITパスポート試験に向けて、学習計画、確認問題、単語帳、復習管理を支援する学習アプリ。",
  },
};

const painPoints = [
  "参考書を買ったが、今日はどこまで進めればいいか分からない",
  "過去問を解いても、理解不足なのか暗記不足なのか判断できない",
  "試験日までに間に合うペースなのか見えない",
  "復習する内容を自分で管理するのが面倒",
];

const diagnosisInputs = [
  {
    label: "試験日",
    detail: "残り30日・60日・90日など、期間に合わせて学習量を調整します。",
  },
  {
    label: "平日・休日の学習時間",
    detail: "無理な計画ではなく、実際に続けやすい分量に分解します。",
  },
  {
    label: "今の理解度",
    detail: "未経験・参考書1周目・過去問開始後など、現在地に合わせます。",
  },
];

const benefits = [
  {
    title: "今日やることが決まる",
    body: "ストラテジ・マネジメント・テクノロジの広い範囲を、1日単位の行動に落とし込みます。",
  },
  {
    title: "理解度を確認できる",
    body: "読んだだけで終わらず、確認問題で分かったつもりを減らします。",
  },
  {
    title: "復習を忘れにくい",
    body: "用語や苦手テーマを単語帳・復習メニューにつなげ、記憶の抜けを減らします。",
  },
];

const comparison = [
  {
    method: "参考書だけ",
    weakness: "計画・復習・進捗管理を自分で行う必要がある",
    fit: "自分で管理できる人向け",
  },
  {
    method: "過去問サイトだけ",
    weakness: "初心者は解説を読んでも知識が点になりやすい",
    fit: "基礎学習後の演習向け",
  },
  {
    method: "it-learning-app",
    weakness: "試験日と学習時間を入力して進める設計",
    fit: "迷わず毎日の学習を進めたい初心者向け",
  },
];

export default function ItPassportFreeStudyDiagnosisPage() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/blog" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b75a6] text-sm font-black text-white">
              IP
            </span>
            <span className="text-sm font-black text-[#12384d] sm:text-base">
              ITパスポート学習ガイド
            </span>
          </Link>
          <Link
            href="/onboarding"
            className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white transition hover:bg-[#d98f00]"
          >
            無料診断を始める
          </Link>
        </div>
      </header>

      <section className="bg-white px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-[#fff2cc] px-3 py-1 text-xs font-black text-[#9a6400]">
              無料学習診断LP
            </p>
            <h1 className="mt-5 max-w-4xl text-[34px] font-black leading-[1.18] text-[#12384d] sm:text-6xl">
              ITパスポート、今日は何を勉強する？
              <br />
              AIで最初の1日を決める。
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
              ITパスポート対策で最初につまずくのは、知識ではなく「進め方」です。it-learning-appの無料学習診断なら、試験日・使える時間・今の理解度から、今日やるべき学習メニューを整理できます。
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/onboarding"
                className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 text-sm font-black text-white transition hover:bg-[#d98f00]"
              >
                無料で今日の学習メニューを作る
              </Link>
              <a
                href="https://www3.jitec.ipa.go.jp/JitesCbt/html/about/range.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex justify-center rounded-full border border-[#1b75a6] px-7 py-4 text-sm font-black text-[#1b75a6] transition hover:bg-[#e8f5fb]"
              >
                IPA公式の出題範囲を見る
              </a>
            </div>
            <p className="mt-4 text-xs font-bold text-slate-500">
              SEOキーワード：ITパスポート 無料診断 / ITパスポート 勉強計画 / ITパスポート AI
            </p>
          </div>

          <aside className="rounded-[24px] border border-[#cfe5f2] bg-[#f7fbfe] p-6 shadow-[0_18px_44px_rgba(22,94,131,0.10)]">
            <p className="text-lg font-black text-[#12384d]">想定読者</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              IT未経験で、参考書・過去問・アプリのどれから始めるべきか迷っている受験予定者。
            </p>
            <p className="mt-6 text-lg font-black text-[#12384d]">訴求軸</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              「教材を増やす」のではなく、今日やること・理解確認・復習管理をAIで軽くする。
            </p>
            <p className="mt-6 text-lg font-black text-[#12384d]">CTA</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              試験日と学習時間を入力し、無料で今日の学習メニューを作成する。
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-[26px] border border-[#cfe5f2] bg-white p-6 shadow-[0_14px_34px_rgba(22,94,131,0.08)] sm:p-8">
          <h2 className="text-3xl font-black text-[#12384d]">こんな状態なら、無料診断から始めてください</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {painPoints.map((point) => (
              <div key={point} className="rounded-[18px] bg-[#f7fbfe] p-5 text-sm font-bold leading-7 text-slate-700">
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-4 sm:px-6 lg:grid-cols-3">
        {diagnosisInputs.map((item, index) => (
          <article key={item.label} className="rounded-[22px] border border-[#cfe5f2] bg-white p-6 shadow-[0_12px_28px_rgba(22,94,131,0.08)]">
            <span className="text-3xl font-black text-[#1b75a6]">{String(index + 1).padStart(2, "0")}</span>
            <h2 className="mt-4 text-2xl font-black text-[#12384d]">{item.label}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[26px] bg-[#12384d] p-6 text-white sm:p-8">
            <h2 className="text-3xl font-black">診断後にできること</h2>
            <div className="mt-6 grid gap-4">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="rounded-[18px] bg-white/10 p-5">
                  <h3 className="text-xl font-black">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#e6f6fc]">{benefit.body}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[26px] border border-[#cfe5f2] bg-white p-6 shadow-[0_14px_34px_rgba(22,94,131,0.08)] sm:p-8">
            <p className="text-lg font-black text-[#12384d]">タイトル案</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">ITパスポート無料学習診断｜試験日から今日やることをAIで整理</p>
            <p className="mt-6 text-lg font-black text-[#12384d]">メタディスクリプション</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{description}</p>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="overflow-hidden rounded-[24px] border border-[#cfe5f2] bg-white shadow-[0_14px_34px_rgba(22,94,131,0.08)]">
          <div className="bg-[#e8f5fb] px-5 py-4">
            <h2 className="text-2xl font-black text-[#12384d]">参考書・過去問だけで不安な人へ</h2>
          </div>
          <div className="grid gap-0 lg:grid-cols-3">
            {comparison.map((row) => (
              <article key={row.method} className="border-t border-[#d7edf7] p-5 lg:border-l lg:border-t-0 first:lg:border-l-0">
                <h3 className="text-xl font-black text-[#12384d]">{row.method}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-700"><span className="font-black text-[#9a6400]">注意点：</span>{row.weakness}</p>
                <p className="mt-3 text-sm leading-7 text-slate-700"><span className="font-black text-[#1b75a6]">向いている人：</span>{row.fit}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-[28px] bg-[#f7a600] p-8 text-center text-white shadow-[0_18px_44px_rgba(154,100,0,0.20)]">
          <p className="text-sm font-black">無料で始められます</p>
          <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            まずは「今日やること」を決める。
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-bold leading-7 sm:text-base">
            ITパスポート対策は、完璧な教材選びよりも最初の1日を進めることが重要です。it-learning-appで試験日から逆算し、今日の学習メニューを作成してください。
          </p>
          <Link
            href="/onboarding"
            className="mt-7 inline-flex rounded-full bg-white px-8 py-4 text-sm font-black text-[#9a6400] transition hover:bg-[#fff7dc]"
          >
            無料で学習診断を始める
          </Link>
        </div>
      </section>
    </main>
  );
}
