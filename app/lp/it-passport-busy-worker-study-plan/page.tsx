import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const PAGE_PATH = "/lp/it-passport-busy-worker-study-plan";
const PAGE_URL = `${SITE_URL.replace(/\/$/, "")}${PAGE_PATH}`;

export const metadata: Metadata = {
  title: "忙しい社会人のITパスポート勉強法｜平日15分から始める学習計画",
  description:
    "仕事が忙しくてもITパスポート合格を目指したい社会人向けに、平日15分と休日のまとまった時間を使う学習計画を解説。今日やることを無料で作成できます。",
  keywords: [
    "ITパスポート 社会人",
    "ITパスポート 勉強時間 社会人",
    "ITパスポート 忙しい",
    "ITパスポート スキマ時間",
    "ITパスポート 学習計画",
    "ITパスポート AI",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "忙しい社会人のITパスポート勉強法｜平日15分から始める学習計画",
    description:
      "平日15分と休日学習を組み合わせ、参考書・確認問題・用語復習・過去問を無理なく進める方法を紹介します。",
    type: "website",
    url: PAGE_URL,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "忙しい社会人のITパスポート勉強法",
    description: "平日15分から始める、自分専用のITパスポート学習計画。",
  },
};

const weekdayPlan = [
  { day: "月", task: "参考書を1テーマ読む", time: "15分" },
  { day: "火", task: "前日の確認問題を解く", time: "15分" },
  { day: "水", task: "重要用語を復習する", time: "10〜15分" },
  { day: "木", task: "次のテーマを読む", time: "15分" },
  { day: "金", task: "今週の間違いだけ見直す", time: "15分" },
];

const faq = [
  {
    question: "平日15分だけでも意味がありますか？",
    answer:
      "あります。ただし、読むだけで終わらせず、確認問題や用語復習と組み合わせることが重要です。休日に少し長めの演習時間を確保すると、学習をつなげやすくなります。",
  },
  {
    question: "仕事で勉強できない日があったらどうすればよいですか？",
    answer:
      "翌日に全量を上乗せするより、優先度の高い確認問題や復習だけを残し、計画を組み直すほうが継続しやすくなります。",
  },
  {
    question: "参考書とアプリはどちらを使うべきですか？",
    answer:
      "参考書は体系的な理解、アプリは確認・復習・進捗管理に向いています。どちらか一方ではなく、役割を分けて使うのが効率的です。",
  },
];

export default function BusyWorkerStudyPlanPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "忙しい社会人のITパスポート勉強法",
      description:
        "平日15分と休日学習を組み合わせた、社会人向けITパスポート学習計画のランディングページ。",
      url: PAGE_URL,
      inLanguage: "ja-JP",
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

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#d7e8f2] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-black text-[#12384d]">
            it-learning-app
          </Link>
          <Link
            href="/onboarding?source=busy-worker-study-plan"
            className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white"
          >
            無料で計画を作る
          </Link>
        </div>
      </header>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-[#e8f5fb] px-4 py-2 text-sm font-black text-[#1b75a6]">
              忙しい社会人向け・無料学習プラン
            </p>
            <h1 className="mt-6 text-4xl font-black leading-tight text-[#12384d] sm:text-6xl">
              平日15分でも、
              <br />
              「何をやるか」が決まれば続けられる。
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
              ITパスポートの勉強で止まりやすい原因は、時間の少なさだけではありません。限られた時間で、参考書・確認問題・用語復習・過去問のどれを優先するか決められないことが負担になります。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/onboarding?source=busy-worker-study-plan"
                className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 font-black text-white transition hover:bg-[#d98f00]"
              >
                無料で自分専用の学習計画を作る
              </Link>
              <a
                href="#sample-plan"
                className="inline-flex justify-center rounded-full border border-[#1b75a6] px-7 py-4 font-black text-[#1b75a6] transition hover:bg-[#e8f5fb]"
              >
                1週間の例を見る
              </a>
            </div>
          </div>

          <aside className="rounded-[26px] bg-[#12384d] p-7 text-white shadow-[0_18px_44px_rgba(18,56,77,0.22)]">
            <p className="text-sm font-black text-[#9edaf3]">想定読者</p>
            <p className="mt-2 text-xl font-black">仕事後にまとまった勉強時間を確保できない人</p>
            <div className="mt-7 space-y-4 text-sm leading-7 text-[#e6f6fc]">
              <p>・参考書を買ったが、帰宅後は開けない</p>
              <p>・休日にまとめて進めようとして止まる</p>
              <p>・今日やる内容を決めるだけで疲れる</p>
            </div>
            <div className="mt-7 rounded-[18px] bg-white/10 p-5">
              <p className="text-sm font-black text-[#9edaf3]">訴求軸</p>
              <p className="mt-2 leading-7">長時間の根性学習ではなく、短時間の確認と結果に応じた計画調整で前へ進む。</p>
            </div>
          </aside>
        </div>
      </section>

      <section id="sample-plan" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-black text-[#1b75a6]">SAMPLE PLAN</p>
          <h2 className="mt-3 text-3xl font-black text-[#12384d] sm:text-5xl">平日は小さく、休日に理解をつなげる</h2>
          <p className="mt-5 text-base leading-8 text-slate-700">
            平日にすべてを詰め込む必要はありません。各日の完了条件を一つに絞り、休日にまとめて演習する設計なら、忙しい週でも再開地点を見失いにくくなります。
          </p>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {weekdayPlan.map((item) => (
            <article key={item.day} className="rounded-[20px] border border-[#cfe5f2] bg-white p-5 shadow-[0_10px_24px_rgba(22,94,131,0.07)]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f5fb] font-black text-[#1b75a6]">
                {item.day}
              </span>
              <h3 className="mt-5 font-black text-[#12384d]">{item.task}</h3>
              <p className="mt-3 text-sm font-bold text-[#1b75a6]">目安 {item.time}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[22px] bg-[#fff7df] p-6">
            <p className="text-sm font-black text-[#9a6400]">土曜日</p>
            <h3 className="mt-2 text-2xl font-black text-[#12384d]">今週の範囲を問題で確認</h3>
            <p className="mt-4 leading-8 text-slate-700">確認問題と過去問レベル演習に取り組み、間違いを「知識不足」「読み違い」「未学習」に分けます。</p>
          </article>
          <article className="rounded-[22px] bg-[#e8f5fb] p-6">
            <p className="text-sm font-black text-[#1b75a6]">日曜日</p>
            <h3 className="mt-2 text-2xl font-black text-[#12384d]">結果を見て翌週を軽く調整</h3>
            <p className="mt-4 leading-8 text-slate-700">ページ数ではなく理解度を見て、進む範囲と復習する範囲を決めます。遅れを翌週へ丸ごと持ち越さないことが重要です。</p>
          </article>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black text-[#1b75a6]">WHY IT WORKS</p>
            <h2 className="mt-3 text-3xl font-black text-[#12384d] sm:text-5xl">社会人の独学で必要なのは、完璧な予定表ではない</h2>
          </div>
          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {[
              ["迷う時間を減らす", "毎回ゼロから内容を決めず、今日の完了条件を一つだけ提示します。"],
              ["理解度で進み方を変える", "短い学習でも理解できていれば先へ進み、間違いが多ければ復習を優先します。"],
              ["崩れても戻れる", "実施時間を細かく記録するより、確認問題の結果から次の学習を再設計します。"],
            ].map(([title, body], index) => (
              <article key={title} className="rounded-[22px] border border-[#cfe5f2] p-6">
                <p className="text-3xl font-black text-[#b8ddeb]">0{index + 1}</p>
                <h3 className="mt-4 text-2xl font-black text-[#12384d]">{title}</h3>
                <p className="mt-4 leading-8 text-slate-700">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="overflow-hidden rounded-[28px] bg-[#12384d] p-7 text-white sm:p-11">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
            <div>
              <p className="text-sm font-black text-[#9edaf3]">it-learning-app</p>
              <h2 className="mt-3 text-3xl font-black sm:text-5xl">試験日と使える時間から、今日やることを無料で整理</h2>
              <p className="mt-5 max-w-3xl leading-8 text-[#e6f6fc]">
                学習計画、確認問題、単語復習、過去問レベル演習を別々に管理せず、一つの流れとして進めます。計画どおりにできたかを細かく入力するのではなく、学習結果から次の内容を調整します。
              </p>
            </div>
            <Link
              href="/onboarding?source=busy-worker-study-plan"
              className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 text-center font-black text-white transition hover:bg-[#d98f00]"
            >
              平日15分からの計画を作る
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-4xl">
          <h2 className="text-3xl font-black text-[#12384d] sm:text-4xl">よくある質問</h2>
          <div className="mt-8 space-y-4">
            {faq.map((item) => (
              <details key={item.question} className="rounded-[18px] border border-[#cfe5f2] p-5 open:bg-[#f7fbfe]">
                <summary className="cursor-pointer font-black text-[#12384d]">{item.question}</summary>
                <p className="mt-4 leading-8 text-slate-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d7e8f2] bg-[#f4f8fb] px-4 py-8 text-center text-sm text-slate-600 sm:px-6">
        <p>SEOキーワード：ITパスポート 社会人 / 勉強時間 / 忙しい / スキマ時間 / 学習計画</p>
        <Link href="/blog" className="mt-3 inline-block font-bold text-[#1b75a6]">
          ITパスポート学習ガイドへ戻る
        </Link>
      </footer>
    </main>
  );
}
