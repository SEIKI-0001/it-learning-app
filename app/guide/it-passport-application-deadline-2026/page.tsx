import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-application-deadline-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const cta = "/onboarding?source=application-deadline-2026";
const title = "ITパスポートはいつまで申し込める？2026年の申込・試験休止前にやること5選";
const description =
  "2026年のITパスポートはいつまで申し込める？申込日から選べる試験日、2026年12月28日以降の試験休止、受験日を決めた後の勉強手順まで5項目で解説します。";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "ITパスポート 申し込み いつまで 2026",
    "ITパスポート 申込期限",
    "ITパスポート 試験日 2026",
    "ITパスポート 12月27日",
    "ITパスポート CBT 休止",
    "ITパスポート 勉強計画",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title,
    description,
    type: "article",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: { card: "summary_large_image", title, description },
};

const actions = [
  {
    no: "1",
    title: "まず『受験したい日』から逆算する",
    text: "2026年9月27日までに新規申込みをする場合、ITパスポートは申込日から3か月先の同日までの試験開催日から選べます。9月28日以降の新規申込みでは、選べる試験開催日は2026年12月27日までです。会場ごとに開催日や空席が異なるため、年末に受けたい人ほど早めに候補日を確認しておくのが安全です。",
  },
  {
    no: "2",
    title: "2026年12月28日以降は試験休止予定と理解する",
    text: "IPAはシステムリプレースに伴い、ITパスポートを含むCBT試験を2026年12月28日以降に一時休止すると案内しています。会場によっては12月27日より前に試験実施が休止となる場合もあるため、『12月末ぎりぎりに受ければよい』とは考えない方がよいでしょう。",
  },
  {
    no: "3",
    title: "申込みだけで安心せず、学習開始日を同時に決める",
    text: "受験日が決まったら、その日から逆算して学習開始日と週ごとの目標を決めます。最初はストラテジ・マネジメント・テクノロジを広く触り、早い段階で問題演習を入れて弱点を発見する方が、参考書を完璧にしてから演習するより計画を調整しやすくなります。",
  },
  {
    no: "4",
    title: "『勉強時間』ではなく『弱点が減ったか』で進捗を見る",
    text: "30時間、50時間、100時間といった一律の目安だけでは、自分が合格に近づいているかは判断できません。問題を解き、間違えた分野を記録し、復習後に再度解く。弱点が減っているかを基準にすると、残り日数に応じて勉強の優先順位を変えられます。",
  },
  {
    no: "5",
    title: "直前期は新しい教材より、誤答の再確認を優先する",
    text: "試験が近づいたら教材を増やすより、これまで間違えた問題と苦手分野を再確認します。特に『用語を知らなかった』『似た概念を混同した』『問題文を読み違えた』のように誤答原因を分けると、必要な復習だけに時間を使えます。",
  },
];

const faq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "2026年のITパスポートはいつまで受験できますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "IPAは2026年12月28日以降にCBT試験を一時休止すると案内しており、新規申込みで選べる試験開催日は遅くとも2026年12月27日までです。会場によってはそれより前に試験実施が休止となる場合があります。",
      },
    },
    {
      "@type": "Question",
      name: "2026年9月27日までに申し込むと何月まで選べますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ITパスポートは、2026年9月27日までの新規申込みでは申込日から3か月先の同日までの試験開催日から選択できます。実際に選べる日は会場の開催日と空席状況によります。",
      },
    },
    {
      "@type": "Question",
      name: "受験日を決めた後は何から勉強すればいいですか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "まず3分野を広く学び、早い段階で問題演習を行って弱点を把握します。その後は弱点復習と再演習を繰り返し、試験直前は誤答したテーマを優先して確認します。",
      },
    },
  ],
};

const article = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  datePublished: "2026-08-13",
  dateModified: "2026-08-13",
  mainEntityOfPage: pageUrl,
  author: { "@type": "Organization", name: "it-learning-app" },
  publisher: { "@type": "Organization", name: "it-learning-app" },
};

export default function Page() {
  return (
    <main className="min-h-screen bg-stone-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-bold">it-learning-app</Link>
          <Link href={`${cta}&position=header`} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <article>
        <section className="mx-auto max-w-4xl px-5 py-16 text-center">
          <p className="text-sm font-bold text-indigo-700">2026年8月版・受験申込ガイド</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            ITパスポートはいつまで申し込める？<br className="hidden md:block" />
            休止前にやること5選
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            2026年後半は、いつ申し込むかで選べる試験日の範囲が変わります。申込期限だけでなく、受験日を決めた直後から何を勉強するかまでまとめました。
          </p>
          <Link href={`${cta}&position=hero`} className="mt-8 inline-block rounded-xl bg-indigo-700 px-8 py-4 font-bold text-white">
            受験日から逆算した学習計画を無料で作る
          </Link>
        </section>

        <section className="border-y bg-white">
          <div className="mx-auto max-w-4xl px-5 py-12">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <p className="text-sm font-bold text-amber-900">先に押さえる2026年の重要ポイント</p>
              <p className="mt-3 leading-7 text-slate-700">
                IPAの2026年3月13日公表・4月7日更新情報では、ITパスポート試験は2026年12月28日以降に一時休止予定です。2026年9月28日以降に新規申込みをする場合、選択できる試験開催日は申込日から2026年12月27日までです。
              </p>
              <a
                href="https://www.ipa.go.jp/shiken/2026/cbt-202605-jisshi.html"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-sm font-bold text-indigo-700 underline underline-offset-4"
              >
                IPA公式「2026年5月以降の試験実施について」を確認する
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-16">
          <p className="text-sm font-bold text-indigo-700">CHECKLIST</p>
          <h2 className="mt-2 text-3xl font-black">休止前にやること5選</h2>
          <div className="mt-9 space-y-5">
            {actions.map((item) => (
              <section key={item.no} className="rounded-2xl border bg-white p-6 md:p-7">
                <div className="flex gap-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-black text-indigo-800">
                    {item.no}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold">{item.title}</h3>
                    <p className="mt-3 leading-8 text-slate-600">{item.text}</p>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="bg-slate-900 text-white">
          <div className="mx-auto max-w-4xl px-5 py-14 md:flex md:items-center md:justify-between md:gap-10">
            <div>
              <p className="text-sm font-bold text-indigo-300">申込日を、勉強開始日に変える</p>
              <h2 className="mt-2 text-3xl font-black">試験日から逆算すれば、今日やることが決まる。</h2>
              <p className="mt-4 max-w-2xl leading-7 text-slate-300">
                it-learning-appでは、試験日と学習状況をもとに学習計画を作り、問題演習から弱点を見つけて次に復習する内容へつなげます。
              </p>
            </div>
            <Link href={`${cta}&position=mid`} className="mt-7 inline-block shrink-0 rounded-xl bg-white px-7 py-4 font-bold text-slate-900 md:mt-0">
              無料で学習計画を作る
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-16">
          <h2 className="text-3xl font-black">申し込む前に知っておきたいこと</h2>
          <div className="mt-8 overflow-hidden rounded-2xl border bg-white">
            <div className="grid gap-1 border-b p-6 md:grid-cols-[180px_1fr] md:gap-6">
              <p className="font-bold">8月13日に申込む場合</p>
              <p className="leading-7 text-slate-600">原則として申込日から3か月先の同日までの開催日が選択範囲です。ただし、実際の開催日・空席は会場ごとに異なります。</p>
            </div>
            <div className="grid gap-1 border-b p-6 md:grid-cols-[180px_1fr] md:gap-6">
              <p className="font-bold">9月28日以降</p>
              <p className="leading-7 text-slate-600">新規申込みで選べるのは2026年12月27日までの試験開催日です。</p>
            </div>
            <div className="grid gap-1 p-6 md:grid-cols-[180px_1fr] md:gap-6">
              <p className="font-bold">12月28日以降</p>
              <p className="leading-7 text-slate-600">システムリプレースに伴うCBT試験の一時休止が予定されています。再開時期はIPAの最新案内を確認してください。</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-500">
            ※ 本ページは2026年8月13日時点のIPA公表情報をもとに作成しています。試験会場、空席、再開時期などは変更される可能性があるため、申込み時は必ずIPA公式サイトで最新情報を確認してください。
          </p>
        </section>

        <section className="border-y bg-white">
          <div className="mx-auto max-w-4xl px-5 py-16">
            <h2 className="text-3xl font-black">よくある質問</h2>
            <div className="mt-8 space-y-6">
              {faq.mainEntity.map((item) => (
                <div key={item.name} className="rounded-2xl bg-stone-50 p-6">
                  <h3 className="font-bold">Q. {item.name}</h3>
                  <p className="mt-3 leading-7 text-slate-600">A. {item.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-16 text-center">
          <p className="font-bold text-indigo-700">受験日を決めたら、次は合格までの道順を決める。</p>
          <h2 className="mt-3 text-3xl font-black">自分専用のITパスポート学習計画を作成</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">
            残り日数と弱点に合わせて、何を優先して学ぶかを整理します。計画を作るだけでなく、問題演習の結果を次の復習につなげられます。
          </p>
          <Link href={`${cta}&position=bottom`} className="mt-7 inline-block rounded-xl bg-indigo-700 px-8 py-4 font-bold text-white">
            無料で自分専用の学習計画を作る
          </Link>
        </section>
      </article>
    </main>
  );
}
