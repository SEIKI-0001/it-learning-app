import type { Metadata } from "next";
import Link from "next/link";

const pageUrl =
  "https://it-learning-app.vercel.app/compare/it-passport-self-study-vs-course-2026";
const ctaBase = "/onboarding?source=self-study-vs-course-2026";

export const metadata: Metadata = {
  title:
    "ITパスポートは独学・通信講座・AI学習のどれがいい？3つを比較【2026年版】",
  description:
    "ITパスポート対策は独学、通信講座、AI学習のどれを選ぶべき？費用、自由度、学習計画、質問対応、弱点対策を比較し、タイプ別のおすすめ勉強法を解説します。",
  keywords: [
    "ITパスポート 独学 通信講座 比較",
    "ITパスポート 独学",
    "ITパスポート 通信講座",
    "ITパスポート AI 学習",
    "ITパスポート 学習アプリ",
    "ITパスポート 勉強法 2026",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートは独学・通信講座・AI学習のどれがいい？【2026年版】",
    description:
      "費用、自由度、学習計画、質問対応、弱点対策の5軸で比較。自分に合うITパスポート学習法が分かります。",
    type: "website",
    url: pageUrl,
    locale: "ja_JP",
    siteName: "it-learning-app",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート独学・通信講座・AI学習を比較",
    description:
      "どれを選ぶべきか迷う人向け。3つの学習方法を5軸で比較します。",
  },
};

const rows = [
  {
    label: "費用を抑えやすい",
    self: "◎",
    course: "△",
    ai: "○",
  },
  {
    label: "自分のペースで進めやすい",
    self: "◎",
    course: "○",
    ai: "◎",
  },
  {
    label: "学習計画を任せやすい",
    self: "△",
    course: "◎",
    ai: "◎",
  },
  {
    label: "疑問をその場で解消しやすい",
    self: "△",
    course: "○",
    ai: "◎",
  },
  {
    label: "弱点に合わせて調整しやすい",
    self: "△",
    course: "○",
    ai: "◎",
  },
];

const faqItems = [
  {
    question: "ITパスポートは独学でも合格できますか？",
    answer:
      "独学でも合格を目指せます。ただし、教材を読むだけでなく、試験日から逆算した計画、問題演習、誤答の復習まで自分で管理する必要があります。",
  },
  {
    question: "通信講座を使うメリットは何ですか？",
    answer:
      "学習順や教材があらかじめ整理されている点が大きなメリットです。自分で計画を作る負担を減らしたい人や、決められたカリキュラムに沿って進めたい人に向いています。",
  },
  {
    question: "AIだけでITパスポート対策はできますか？",
    answer:
      "AIは説明の言い換え、疑問解消、計画作成などに役立ちますが、回答が常に正しいとは限りません。IPAの公式シラバスや公開問題など、信頼できる一次情報と併用するのが安全です。",
  },
  {
    question: "2026年のITパスポートは何を基準に勉強すればいいですか？",
    answer:
      "IPAが公開しているITパスポート試験シラバスVer.6.5を学習範囲の基準にしてください。試験は100問・120分で、総合評価点600点以上かつ3分野すべて300点以上が合格基準です。",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "ITパスポート 独学・通信講座・AI学習 比較",
  description:
    "ITパスポート対策の独学、通信講座、AI学習を比較し、タイプ別の選び方を解説します。",
  url: pageUrl,
  inLanguage: "ja-JP",
  datePublished: "2026-08-09",
  dateModified: "2026-08-09",
  publisher: { "@type": "Organization", name: "it-learning-app" },
};

export default function ItPassportSelfStudyVsCoursePage() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-black tracking-tight text-[#173b4f]">
            it-learning-app
          </Link>
          <Link
            href={`${ctaBase}&position=header`}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-black text-white transition hover:bg-amber-600"
          >
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-sm font-black text-sky-700">
              2026年版・ITパスポート勉強法比較
            </p>
            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-[#173b4f] sm:text-6xl">
              独学・通信講座・AI学習。
              <br />
              あなたに合うのはどれ？
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-700">
              ITパスポート対策は、教材の良し悪しだけで決まりません。費用を抑えたいのか、計画を任せたいのか、苦手に合わせて学習を変えたいのかで、最適な方法は変わります。3つの選択肢を比較し、自分に合う学び方を整理します。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={`${ctaBase}&position=hero`}
                className="inline-flex justify-center rounded-full bg-amber-500 px-8 py-4 text-lg font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-600"
              >
                無料で自分専用の学習計画を作る
              </Link>
              <span className="text-center text-sm font-bold text-slate-500">
                試験日から逆算して今日やることを整理
              </span>
            </div>
          </div>

          <aside className="rounded-[28px] bg-[#173b4f] p-7 text-white shadow-xl">
            <p className="text-sm font-black text-sky-200">結論</p>
            <p className="mt-4 text-2xl font-black leading-10">
              自己管理が得意なら独学。カリキュラム重視なら通信講座。柔軟な計画と弱点対策を重視するならAI学習が候補です。
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-black text-sky-700">5項目で比較</p>
        <h2 className="mt-3 text-3xl font-black text-[#173b4f] sm:text-4xl">
          3つの学習方法には、得意・不得意がある
        </h2>
        <p className="mt-5 max-w-3xl leading-8 text-slate-700">
          ◎は特に相性がよい、○は対応しやすい、△は自分で補う必要が出やすい項目です。サービスごとの差があるため、一般的な傾向として比較しています。
        </p>
        <div className="mt-8 overflow-x-auto rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[720px] w-full border-collapse text-left">
            <thead className="bg-[#173b4f] text-white">
              <tr>
                <th className="px-5 py-4 font-black">比較項目</th>
                <th className="px-5 py-4 font-black">独学</th>
                <th className="px-5 py-4 font-black">通信講座</th>
                <th className="px-5 py-4 font-black">AI学習</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-slate-200">
                  <th className="px-5 py-5 font-bold text-[#173b4f]">{row.label}</th>
                  <td className="px-5 py-5 text-xl font-black">{row.self}</td>
                  <td className="px-5 py-5 text-xl font-black">{row.course}</td>
                  <td className="px-5 py-5 text-xl font-black">{row.ai}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-sky-50 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black text-[#173b4f] sm:text-4xl">
            タイプ別：おすすめの選び方
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "独学が向く人",
                lead: "費用を抑え、自分で計画できる",
                body: "参考書や公式公開問題を自分で選び、試験日までの進捗も自分で管理できる人には独学が合理的です。自由度が高い一方、苦手分野の放置や計画倒れには注意が必要です。",
              },
              {
                title: "通信講座が向く人",
                lead: "決められた順番で進めたい",
                body: "教材選びや学習順で迷いたくない人に向きます。カリキュラムが整理されているため着手しやすく、一定のペースを作りやすいのが利点です。",
              },
              {
                title: "AI学習が向く人",
                lead: "計画も弱点対策も柔軟に変えたい",
                body: "学習できる時間が日によって違う人や、問題結果に合わせて次の学習内容を変えたい人と相性があります。AIの説明は一次情報と照合しながら使うのが前提です。",
              },
            ].map((item) => (
              <article key={item.title} className="rounded-[24px] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-black text-[#173b4f]">{item.title}</h3>
                <p className="mt-3 font-black text-amber-600">{item.lead}</p>
                <p className="mt-4 leading-8 text-slate-700">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-black text-sky-700">2026年の試験条件</p>
        <h2 className="mt-3 text-3xl font-black text-[#173b4f] sm:text-4xl">
          どの方法でも、ゴールは同じ
        </h2>
        <p className="mt-6 leading-8 text-slate-700">
          ITパスポート試験は120分・100問のCBT方式です。合格には総合評価点600点以上に加え、ストラテジ系・マネジメント系・テクノロジ系の3分野すべてで300点以上が必要です。学習範囲はIPAの「ITパスポート試験」シラバスVer.6.5を基準に確認できます。
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            ["100問", "四肢択一式"],
            ["120分", "CBT方式"],
            ["600点以上", "＋各分野300点以上"],
          ].map(([value, label]) => (
            <div key={value} className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
              <p className="text-2xl font-black text-[#173b4f]">{value}</p>
              <p className="mt-2 text-sm font-bold text-slate-500">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm leading-7 text-slate-500">
          出典：IPA「ITパスポート試験 試験内容・出題範囲」「試験要綱・シラバスについて」。最新の試験情報は必ずIPA公式サイトで確認してください。
        </p>
      </section>

      <section className="bg-[#173b4f] px-4 py-14 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl rounded-[28px] bg-white/10 p-7 sm:p-10">
          <p className="text-sm font-black text-sky-200">独学の自由さ＋学習管理</p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            「今日は何をやる？」を考える時間を減らす
          </h2>
          <p className="mt-6 max-w-3xl leading-8 text-slate-100">
            it-learning-appは、試験日から学習計画を逆算し、毎日のタスク、確認問題、苦手分野の復習をつなげるITパスポート学習支援アプリです。教材を一つに固定するのではなく、参考書や公式公開問題と組み合わせながら独学全体を管理できます。
          </p>
          <Link
            href={`${ctaBase}&position=mid`}
            className="mt-8 inline-flex rounded-full bg-amber-500 px-8 py-4 text-lg font-black text-white transition hover:bg-amber-600"
          >
            無料で自分専用の学習計画を作る
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 className="text-3xl font-black text-[#173b4f]">よくある質問</h2>
        <div className="mt-8 space-y-4">
          {faqItems.map((item) => (
            <details key={item.question} className="rounded-2xl border border-slate-200 bg-white p-6">
              <summary className="cursor-pointer font-black text-[#173b4f]">
                {item.question}
              </summary>
              <p className="mt-4 leading-8 text-slate-700">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-[30px] bg-amber-50 p-8 text-center sm:p-12">
          <p className="text-sm font-black text-amber-700">まずは無料で計画を確認</p>
          <h2 className="mt-3 text-3xl font-black text-[#173b4f] sm:text-4xl">
            あなたの試験日から、今日やることを逆算
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-700">
            自分で全部決める独学と、固定カリキュラムの中間へ。まずは試験日と学習時間を入力して、自分専用の学習計画を作ってみてください。
          </p>
          <Link
            href={`${ctaBase}&position=bottom`}
            className="mt-7 inline-flex rounded-full bg-amber-500 px-8 py-4 text-lg font-black text-white shadow-lg transition hover:bg-amber-600"
          >
            無料で学習計画を作る
          </Link>
        </div>
      </section>
    </main>
  );
}
