import type { Metadata } from "next";
import Link from "next/link";

const path = "/lp/it-passport-september-90day-countdown-2026";
const title = "9月からITパスポートを始める人へ｜年内受験の90日ロードマップ【2026年】";
const description = "2026年9月からITパスポートを始め、年内受験を目指す人向けの90日ロードマップ。基礎、問題演習、弱点復習、本番対策を試験日から逆算し、自分専用の学習計画につなげます。";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "ITパスポート 9月から",
    "ITパスポート 年内",
    "ITパスポート 3ヶ月",
    "ITパスポート 90日",
    "ITパスポート 勉強計画",
    "ITパスポート AI 学習",
    "ITパスポート 2026",
  ],
  alternates: { canonical: path },
  openGraph: { title, description, type: "article", url: path },
  twitter: { card: "summary_large_image", title, description },
};

const phases = [
  { period: "1〜3週目", title: "全体像をつかむ", body: "ストラテジ・マネジメント・テクノロジの3分野を広く学びます。最初から暗記を完成させず、用語がどの分野に属するか説明できる状態を目指します。" },
  { period: "4〜6週目", title: "問題演習を主役にする", body: "問題を解き、誤答だけでなく『迷って正解した問題』も記録します。参考書を読む時間より、問題→確認→再挑戦の比率を増やします。" },
  { period: "7〜9週目", title: "弱点へ時間を再配分", body: "3分野を均等に勉強し続けず、正答率が低い論点や説明できない用語へ学習時間を寄せます。AIは似た用語の比較や誤答理由の説明に使います。" },
  { period: "10〜12週目", title: "本番形式で仕上げる", body: "100問・120分を意識した演習を行い、時間配分と分野ごとの穴を確認します。直前期は新教材を増やさず、直近の弱点を別問題で再確認します。" },
];

const faq = [
  { q: "9月から始めて年内受験に間に合いますか？", a: "現在地と確保できる学習時間によります。まず受験候補日を置き、残り日数から学習可能時間を算出して判断するのが安全です。" },
  { q: "毎日何時間勉強すればよいですか？", a: "必要時間には個人差が大きいため、一律の時間を目標にするより、最初の問題演習で現在地を測り、弱点に応じて計画を更新してください。" },
  { q: "AIはITパスポート学習にどう使えますか？", a: "答えを聞くだけでなく、似た用語の比較、誤答理由の説明、数字を変えた類題の作成など、理解と再確認を速くする用途が有効です。" },
];

function Cta({ position }: { position: string }) {
  return (
    <Link
      href={`/onboarding?source=september-90day-countdown-2026&position=${position}`}
      className="inline-flex rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700"
    >
      無料で自分専用の学習計画を作る
    </Link>
  );
}

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: title, description, url: path },
      { "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="font-bold">it-learning-app</Link>
          <Cta position="header" />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-16 md:py-24">
        <p className="mb-4 font-semibold text-blue-700">2026年9月スタート向け・90日ロードマップ</p>
        <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">9月から始めるなら、教材より先に受験日を決める。</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">ITパスポートを年内に受けたい人向けに、約90日を「基礎→演習→弱点→本番対策」の4段階へ分解しました。固定の勉強時間ではなく、あなたの残り日数と現在地から計画を作ります。</p>
        <div className="mt-8"><Cta position="hero" /></div>
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <h2 className="text-2xl font-black md:text-3xl">2026年は「あとで申し込む」が危険</h2>
          <p className="mt-4 max-w-3xl leading-8 text-slate-700">IPAは2026年12月28日以降、システムリプレースに伴うITパスポート試験の休止を予定しています。年内受験を考えるなら、まず公式サイトで会場と開催日を確認し、受験候補日から逆算してください。</p>
          <a className="mt-4 inline-block font-semibold text-blue-700 underline" href="https://www.ipa.go.jp/shiken/mousikomi/cbt_ip.html" target="_blank" rel="noreferrer">IPAの最新試験情報を確認する</a>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-3xl font-black">90日を4段階に分ける</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {phases.map((phase) => (
            <article key={phase.period} className="rounded-2xl border bg-white p-6 shadow-sm">
              <p className="font-bold text-blue-700">{phase.period}</p>
              <h3 className="mt-2 text-xl font-black">{phase.title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{phase.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="text-3xl font-black">同じ90日でも、必要な計画は人によって違う。</h2>
          <p className="mt-5 max-w-3xl leading-8 text-slate-300">平日30分しか取れない人と、毎日2時間使える人では計画が違います。さらに、ストラテジが得意でテクノロジが弱い人と、その逆の人でも配分は変わります。it-learning-appでは、試験日・使える時間・学習結果をもとに「次に何をするか」を決める学習を目指します。</p>
          <div className="mt-8"><Cta position="mid" /></div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-3xl font-black">AIは「答え」より「弱点の説明」に使う</h2>
        <p className="mt-5 max-w-3xl leading-8 text-slate-700">「RTOとRPOを初心者向けに比較して」「この選択肢が誤りになる理由を説明して」「同じ論点で数字だけ変えた問題を作って」のように使うと、調べる時間を減らしながら理解を深められます。説明を読んだ後は、必ず別問題を自力で解いて確認してください。</p>
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="text-3xl font-black">よくある質問</h2>
          <div className="mt-8 space-y-6">
            {faq.map((x) => <div key={x.q}><h3 className="font-bold">{x.q}</h3><p className="mt-2 leading-7 text-slate-600">{x.a}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 text-center">
        <h2 className="text-3xl font-black">9月の1日目を、計画作りだけで終わらせない。</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">受験候補日と使える時間を決めたら、今日やる学習まで落とし込みましょう。</p>
        <div className="mt-8"><Cta position="bottom" /></div>
      </section>
    </main>
  );
}
