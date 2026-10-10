import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-free-study-sites-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "free-study-sites-2026";

export const metadata: Metadata = {
  title: "ITパスポート無料勉強サイト5タイプ比較｜独学での使い分け【2026年】",
  description:
    "ITパスポートを無料で勉強したい人向けに、IPA公式資料、過去問演習、用語解説、動画、AI学習支援の5タイプを比較。無料教材を組み合わせて弱点対策まで進める方法を解説します。",
  keywords: [
    "ITパスポート 無料 勉強サイト",
    "ITパスポート 勉強サイト",
    "ITパスポート 無料 学習",
    "ITパスポート 独学 無料",
    "ITパスポート 過去問 無料",
    "ITパスポート AI 学習",
    "ITパスポート 2026",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポート無料勉強サイト5タイプ比較【2026年】",
    description: "無料教材を集めるだけで終わらない。5タイプの役割と、独学での使い分けを整理します。",
    type: "article",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート無料勉強サイト5タイプ比較【2026年】",
    description: "IPA公式資料・過去問・用語解説・動画・AI学習支援を目的別に使い分け。",
  },
};

const studyTypes = [
  {
    no: "01",
    title: "IPA公式のシラバス・公開情報",
    best: "出題範囲を正確に確認したい人",
    role: "学習範囲の基準を作る",
    strength: "試験実施団体の一次情報なので、2026年に何を学ぶべきかの基準にできます。",
    caution: "資料だけでは、初心者が毎日の勉強順序まで決めるのは難しい場合があります。",
  },
  {
    no: "02",
    title: "過去問・問題演習サイト",
    best: "知識を問題で確認したい人",
    role: "現在地と弱点を見つける",
    strength: "短時間でも問題を解きやすく、正解・不正解から苦手な論点を見つけられます。",
    caution: "正答率だけ追うと、答えを覚えただけの状態や『迷って正解』を見落としやすくなります。",
  },
  {
    no: "03",
    title: "用語解説・まとめサイト",
    best: "知らない用語をすぐ確認したい人",
    role: "ピンポイントで理解を補う",
    strength: "CRM、RTO、公開鍵など、分からない言葉を短時間で調べる用途に向いています。",
    caution: "最初から最後まで読むだけでは、問題で使える知識になったか判断しにくい点に注意が必要です。",
  },
  {
    no: "04",
    title: "無料動画・講義コンテンツ",
    best: "文章だけでは理解しづらい人",
    role: "図や説明で全体像をつかむ",
    strength: "通勤中などにも利用しやすく、図解や口頭説明で概念のイメージを作りやすい方法です。",
    caution: "視聴しただけで理解した気にならないよう、見た後に問題を解いて確認する必要があります。",
  },
  {
    no: "05",
    title: "AI学習支援",
    best: "質問・計画・弱点復習を効率化したい人",
    role: "教材同士を学習ループにつなげる",
    strength: "似た用語の比較、誤答理由の説明、弱点に合わせた復習などを補助できます。",
    caution: "AIの回答をそのまま暗記せず、公式範囲や問題演習と組み合わせ、自分で再回答することが重要です。",
  },
];

const steps = [
  ["1", "シラバスで範囲を見る", "まずIPAの現行シラバスで3分野の全体像を確認します。全部を暗記するのではなく、どんな範囲があるかを知る段階です。"],
  ["2", "基礎を1つの教材で学ぶ", "用語サイトや動画を何個も並行せず、最初の基礎教材は1つに絞ります。分からない箇所だけ別の解説を使います。"],
  ["3", "早めに問題を解く", "完璧になる前に問題演習へ進みます。不正解だけでなく、迷って正解した問題も弱点候補として残します。"],
  ["4", "弱点だけ調べ直す", "間違えた理由を用語解説やAIで確認します。『なぜこの選択肢が違うのか』まで説明できる状態を目指します。"],
  ["5", "別問題で再確認する", "復習した論点を別の問題で解き、同じ考え方を使えるか確認します。できなければ再び弱点として残します。"],
];

const faq = [
  {
    q: "ITパスポートは無料サイトだけで勉強できますか？",
    a: "無料の公式資料、問題演習、解説コンテンツを組み合わせて学ぶことは可能です。ただし、必要な学習量はIT経験や現在の理解度によって異なります。教材数よりも、問題演習で弱点を見つけて復習する流れを作ることが重要です。",
  },
  {
    q: "2026年はどのシラバスを見ればいいですか？",
    a: "2026年8月時点でIPAが掲載しているITパスポート試験の現行シラバスはVer.6.5です。学習範囲を確認するときは公式の最新版を基準にしてください。",
  },
  {
    q: "無料の過去問は何に使えばいいですか？",
    a: "合格できるかを点数だけで判断するためではなく、どの分野・論点で判断が曖昧なのかを見つけるために使うのがおすすめです。間違えた問題と迷って正解した問題を分けて記録すると復習しやすくなります。",
  },
  {
    q: "ChatGPTなどのAIだけで勉強してもいいですか？",
    a: "AIは用語の言い換え、似た概念の比較、誤答理由の説明などには便利ですが、公式の出題範囲や問題演習と組み合わせる方が安全です。AIに正答を聞いて終わらず、自分で別問題に再回答してください。",
  },
  {
    q: "it-learning-appは無料教材とどう使い分けますか？",
    a: "無料教材を『知る・解く』ために使い、it-learning-appでは試験日からの学習計画、問題演習後の弱点把握、次に何を勉強するかの整理に使う想定です。教材を置き換えるのではなく、学習の順番をつなぐ役割です。",
  },
];

export default function Page() {
  const cta = (position: string) => `/onboarding?source=${source}&position=${position}`;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: metadata.title,
    description: metadata.description,
    url: pageUrl,
    datePublished: "2026-08-27",
    dateModified: "2026-08-27",
    publisher: { "@type": "Organization", name: "it-learning-app" },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-bold">it-learning-app</Link>
          <Link href={cta("header")} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <p className="mb-4 text-sm font-semibold text-sky-700">2026年8月27日更新｜無料で独学したい人へ</p>
        <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
          ITパスポートの無料勉強サイト、<br className="hidden md:block" />集めるより「役割」で使い分ける。
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
          公式資料、過去問、用語解説、動画、AI。無料で使える学習手段は増えています。大切なのはサイト数ではなく、「知る → 解く → 弱点を直す → もう一度解く」がつながる組み合わせです。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={cta("hero")} className="rounded-xl bg-sky-700 px-6 py-3 font-semibold text-white">
            無料で自分専用の学習計画を作る
          </Link>
          <a
            href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-stone-300 bg-white px-6 py-3 font-semibold"
          >
            IPA公式シラバスを見る
          </a>
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <p className="text-sm font-semibold text-sky-700">結論</p>
          <h2 className="mt-2 text-3xl font-bold">無料教材だけでも始められる。でも「次に何をするか」は別問題。</h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            ITパスポート対策では、無料の資料や演習環境を利用できます。ただし、複数のサイトを行き来するほど「今日は何をやるか」「どこが弱いか」「いつ復習するか」が曖昧になりがちです。教材は役割を決めて使い、学習計画と弱点管理を別に持つと進めやすくなります。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-semibold text-sky-700">5 TYPES</p>
        <h2 className="mt-2 text-3xl font-bold">無料で使える学習手段を5タイプで比較</h2>
        <div className="mt-8 space-y-5">
          {studyTypes.map((item) => (
            <article key={item.no} className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 md:grid-cols-[72px_1fr]">
              <div className="text-3xl font-black text-sky-700">{item.no}</div>
              <div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-800">向いている人：{item.best}</span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 font-semibold text-slate-700">役割：{item.role}</span>
                </div>
                <p className="mt-4 leading-7 text-slate-600"><strong className="text-slate-900">強み：</strong>{item.strength}</p>
                <p className="mt-2 leading-7 text-slate-600"><strong className="text-slate-900">注意：</strong>{item.caution}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-semibold text-sky-300">FREE × AI</p>
            <h2 className="mt-2 text-3xl font-bold">無料教材を「学習ループ」にすると強い。</h2>
            <p className="mt-4 leading-7 text-slate-300">
              公式資料で範囲を確認し、問題で弱点を見つけ、解説やAIで理解を補い、別問題で再確認する。この一連の流れを毎回自分で組み立てるのが面倒なら、学習計画と弱点管理をアプリ側に任せます。
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 text-slate-950">
            <h3 className="text-lg font-bold">it-learning-appで補う部分</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <li>✓ 試験日から学習量を逆算する</li>
              <li>✓ 問題演習から弱点を把握する</li>
              <li>✓ 次に復習する内容を整理する</li>
              <li>✓ 学習後に理解度をもう一度確認する</li>
            </ul>
            <Link href={cta("mid")} className="mt-6 block rounded-xl bg-sky-700 px-5 py-3 text-center font-semibold text-white">
              無料で学習計画を作る
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-semibold text-sky-700">HOW TO USE</p>
        <h2 className="mt-2 text-3xl font-bold">無料サイトを使う順番はこの5ステップ</h2>
        <div className="mt-8 grid gap-4">
          {steps.map(([no, title, body]) => (
            <div key={no} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-6 md:grid-cols-[52px_1fr]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-800">{no}</div>
              <div>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-bold">2026年に確認しておきたい公式情報</h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            2026年8月時点でIPAが掲載している現行ITパスポート試験シラバスはVer.6.5です。試験範囲はブログや動画だけで判断せず、公式シラバスを基準にしてください。また、2027年度からは新試験制度が予定されているため、2026年受験者と2027年度以降の受験者では参照する情報を分ける必要があります。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" target="_blank" rel="noreferrer" className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold">IPA シラバス</a>
            <a href="https://www.ipa.go.jp/shiken/syllabus/henkou/2026/20260630.html" target="_blank" rel="noreferrer" className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold">2027年度 新試験制度情報</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-bold">よくある質問</h2>
        <div className="mt-8 space-y-4">
          {faq.map(({ q, a }) => (
            <details key={q} className="rounded-xl border border-stone-200 bg-white p-5">
              <summary className="cursor-pointer font-bold">{q}</summary>
              <p className="mt-3 leading-7 text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="text-sm font-semibold text-sky-700">START FREE</p>
        <h2 className="mt-2 text-3xl font-bold md:text-4xl">教材探しを終えて、今日やることを決める。</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">
          無料教材はそのまま活用しながら、試験日・使える時間・現在の弱点から、自分向けの学習計画を作りましょう。
        </p>
        <Link href={cta("bottom")} className="mt-8 inline-block rounded-xl bg-sky-700 px-7 py-4 font-semibold text-white">
          無料で自分専用の学習計画を作る
        </Link>
      </section>
    </main>
  );
}
