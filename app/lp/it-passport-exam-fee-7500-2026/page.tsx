import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/lp/it-passport-exam-fee-7500-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "exam-fee-7500-2026";

export const metadata: Metadata = {
  title: "ITパスポートの受験料は7,500円｜一発合格へ向けた勉強法【2026年】",
  description:
    "ITパスポートの受験料は7,500円。申込前に知っておきたい支払い方法と2026年の注意点、受験料を無駄にしないための学習計画・弱点対策を解説します。",
  keywords: [
    "ITパスポート 受験料",
    "ITパスポート 受験料 7500円",
    "ITパスポート 費用",
    "ITパスポート 申し込み",
    "ITパスポート 一発合格",
    "ITパスポート 勉強法 2026",
    "ITパスポート AI 学習",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートの受験料は7,500円｜受験前にやるべきこと【2026年】",
    description: "7,500円の受験料を無駄にしないために、申込前後の学習計画と弱点対策を整理します。",
    type: "website",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート受験料7,500円｜一発合格へ向けた準備",
    description: "申込前に確認したい費用・2026年の日程注意点・学習計画をまとめました。",
  },
};

const faq = [
  {
    q: "ITパスポートの受験料はいくらですか？",
    a: "2026年8月時点の受験手数料は7,500円（税込）です。クレジットカード、コンビニ、バウチャーで支払えます。コンビニ払いでは別途払込手数料がかかります。",
  },
  {
    q: "申し込んだ後にキャンセルして返金できますか？",
    a: "IPAの受験要領では、受領した受験手数料は理由を問わず返還できないとされています。申込前に受験日と学習期間を確認しておくことが重要です。",
  },
  {
    q: "2026年はいつまで受験できますか？",
    a: "2025年12月27日以降に申し込んだ場合、2026年12月28日以降の試験日は選択できず、2026年12月27日までの受験が案内されています。会場の空席もあるため早めの確認が必要です。",
  },
  {
    q: "受験申込と勉強はどちらを先にすべきですか？",
    a: "勉強が終わるまで待つより、無理のない受験日を決めて残り日数から学習量を逆算する方法がおすすめです。理解度に応じて計画を更新すると、苦手分野へ時間を配分しやすくなります。",
  },
];

const steps = [
  ["1", "受験日を決める", "空席と自分の予定を確認し、学習の締切を先に固定します。"],
  ["2", "3分野の現在地を測る", "ストラテジ・マネジメント・テクノロジを問題演習で確認します。"],
  ["3", "弱点へ時間を寄せる", "全部を同じ量だけ勉強せず、誤答や迷った問題が多い分野を優先します。"],
  ["4", "本番形式で再確認する", "試験前は時間を意識した演習で、知識だけでなく解答ペースも確認します。"],
];

function Cta({ position, label = "無料で自分専用の学習計画を作る" }: { position: string; label?: string }) {
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
        name: "ITパスポートの受験料は7,500円｜一発合格へ向けた勉強法【2026年】",
        url: pageUrl,
        description: metadata.description,
        inLanguage: "ja-JP",
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
          <Cta position="header" label="無料で計画を作る" />
        </div>
      </header>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-5 py-16 sm:py-20">
          <p className="mb-4 text-sm font-bold text-slate-600">2026年 ITパスポート受験ガイド</p>
          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            ITパスポートの受験料は7,500円。<br className="hidden sm:block" />
            申し込むなら、合格まで逆算しよう。
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
            ITパスポートの受験手数料は7,500円（税込）。受験料を払ってから「何を勉強すればいい？」と迷わないよう、試験日・残り日数・弱点から学習計画を先に作っておくのが効率的です。
          </p>
          <div className="mt-8"><Cta position="hero" /></div>
          <p className="mt-3 text-xs text-slate-500">登録後、学習条件に合わせて計画を作成できます。</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-2xl font-black sm:text-3xl">まず確認：ITパスポート受験にかかる費用</h2>
        <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200">
          <dl className="divide-y divide-slate-200">
            <div className="grid gap-1 p-5 sm:grid-cols-[180px_1fr]"><dt className="font-bold">受験手数料</dt><dd>7,500円（税込）</dd></div>
            <div className="grid gap-1 p-5 sm:grid-cols-[180px_1fr]"><dt className="font-bold">支払い方法</dt><dd>クレジットカード、コンビニ、バウチャー</dd></div>
            <div className="grid gap-1 p-5 sm:grid-cols-[180px_1fr]"><dt className="font-bold">コンビニ払い</dt><dd>別途、払込手数料187円が必要</dd></div>
            <div className="grid gap-1 p-5 sm:grid-cols-[180px_1fr]"><dt className="font-bold">返金</dt><dd>受領済みの受験手数料は原則返還不可</dd></div>
          </dl>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          金額・支払条件は2026年8月時点のIPA公式案内に基づきます。申込時は必ず最新の公式情報を確認してください。
        </p>
        <a className="mt-3 inline-block text-sm font-bold underline" href="https://www3.jitec.ipa.go.jp/JitesCbt/html/examination/apply.html" target="_blank" rel="noreferrer">IPA ITパスポート受験申込手順を確認する</a>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-4xl px-5 py-14">
          <h2 className="text-2xl font-black sm:text-3xl">7,500円を払う前に決めたいのは「教材」より受験日</h2>
          <p className="mt-5 leading-8 text-slate-700">
            参考書やアプリを比較し続けても、締切がなければ学習は伸びがちです。先に無理のない試験日を決めると、「あと何週間あるか」「平日は何分必要か」「どの分野を優先するか」を具体化できます。
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {steps.map(([n, title, text]) => (
              <div key={n} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-black text-slate-500">STEP {n}</div>
                <h3 className="mt-2 text-xl font-black">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-2xl font-black sm:text-3xl">2026年受験者は「12月27日まで」に注意</h2>
        <p className="mt-5 leading-8 text-slate-700">
          IPAはシステムリプレースに伴い、2027年1月以降に試験を一時休止する予定です。2025年12月27日以降に受験申込みをした場合は、2026年12月28日以降の試験日を選択できず、2026年12月27日までの受験が案内されています。年末に近づくほど希望会場・日時の空席があるとは限らないため、年内合格を狙うなら早めに日程を確認しましょう。
        </p>
        <a className="mt-3 inline-block text-sm font-bold underline" href="https://www3.jitec.ipa.go.jp/JitesCbt/" target="_blank" rel="noreferrer">IPA ITパスポート試験公式サイトで最新情報を確認する</a>
      </section>

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-5 py-14 text-center">
          <p className="text-sm font-bold text-slate-300">受験日を決めたら、次は今日やることを決める</p>
          <h2 className="mt-3 text-3xl font-black">残り日数から、自分専用の学習計画へ。</h2>
          <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-300">
            it-learning-appなら、試験日や学習可能時間をもとに学習を始め、問題演習で見つかった弱点を次の復習につなげられます。
          </p>
          <div className="mt-8"><Cta position="mid" label="無料で合格までの計画を作る" /></div>
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
          <h2 className="text-2xl font-black sm:text-3xl">受験料を払うだけで終わらせない。</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">受験日から逆算して、今日の学習を始めましょう。</p>
          <div className="mt-7"><Cta position="bottom" /></div>
        </div>
      </section>
    </main>
  );
}
