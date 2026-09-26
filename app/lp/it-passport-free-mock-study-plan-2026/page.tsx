import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/lp/it-passport-free-mock-study-plan-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "free-mock-study-plan-2026";

export const metadata: Metadata = {
  title: "ITパスポート無料模試の使い方｜100問・120分の後にやるべき弱点対策【2026年】",
  description: "ITパスポートの無料模試を受けた後、点数だけ見て終わっていませんか？100問・120分の実力確認から弱点を特定し、次の学習計画へつなげる方法を2026年向けに解説します。",
  keywords: [
    "ITパスポート 無料 模試",
    "ITパスポート 模擬試験 無料",
    "ITパスポート 模試 2026",
    "ITパスポート 100問 120分",
    "ITパスポート 弱点対策",
    "ITパスポート AI 学習",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポート無料模試の使い方｜受けた後の弱点対策【2026年】",
    description: "模試は点数を見るだけではもったいない。結果から次に学ぶべき弱点を決める方法を解説。",
    type: "website",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート無料模試の使い方【2026年】",
    description: "100問・120分の模試結果を弱点対策と次の学習計画につなげる方法。",
  },
};

const faq = [
  {
    q: "ITパスポートの模試は何点取れれば安心ですか？",
    a: "本試験の評価はIRT方式で、単純な正答数だけでは合否を確定できません。総合だけでなく3分野の弱点、迷った問題、時間配分も含めて判断するのが安全です。",
  },
  {
    q: "模試は何回受ければいいですか？",
    a: "回数より、1回ごとに弱点を修正できているかが重要です。受験後に誤答を分類し、復習した後で別問題や別年度で再確認してください。",
  },
  {
    q: "無料の公開問題でも対策できますか？",
    a: "はい。IPAはITパスポートの公開問題と解答例を掲載しています。まず公式問題で実力確認し、理解が不足した分野を復習する方法が有効です。",
  },
  {
    q: "AIは模試の復習にどう使えばいいですか？",
    a: "正解だけを聞くのではなく、『なぜこの選択肢が違うのか』『似た用語との違い』『同じ論点の類題を1問』のように、誤答原因の理解と再確認に使うのがおすすめです。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: metadata.title,
      description: metadata.description,
      url: pageUrl,
      inLanguage: "ja-JP",
      datePublished: "2026-08-21",
      dateModified: "2026-08-21",
    },
    {
      "@type": "FAQPage",
      mainEntity: faq.map((x) => ({
        "@type": "Question",
        name: x.q,
        acceptedAnswer: { "@type": "Answer", text: x.a },
      })),
    },
  ],
};

const Cta = ({ position }: { position: string }) => (
  <Link
    href={`/onboarding?source=${source}&position=${position}`}
    className="inline-flex rounded-xl bg-slate-900 px-6 py-3 font-bold text-white hover:bg-slate-700"
  >
    無料で弱点から学習計画を作る
  </Link>
);

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-bold">it-learning-app</Link>
          <Cta position="header" />
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-14">
        <p className="mb-3 text-sm font-bold text-slate-500">ITパスポート模試・2026年版</p>
        <h1 className="text-4xl font-black leading-tight tracking-tight">
          ITパスポート無料模試は<br />「受けた後」で差がつく
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          100問・120分を解いて点数を見るだけでは、次の学習は決まりません。模試は「合格できるか」を見るだけでなく、どの分野・どの考え方で失点しているかを見つけるために使います。
        </p>
        <div className="mt-8"><Cta position="hero" /></div>

        <section className="mt-16">
          <h2 className="text-2xl font-black">無料模試で確認したいのは点数だけではない</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["分野", "ストラテジ・マネジメント・テクノロジのどこで落としているか"],
              ["迷い", "正解したが根拠を説明できなかった問題はどれか"],
              ["時間", "100問を解き切るまでに時間が足りたか"],
              ["再現性", "同じ論点の別問題でも正解できるか"],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-slate-200 p-5">
                <p className="font-black">{t}</p>
                <p className="mt-2 leading-7 text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-3xl bg-slate-50 p-7">
          <h2 className="text-2xl font-black">模試の後にやる4ステップ</h2>
          <ol className="mt-5 space-y-5 text-slate-700">
            <li><b>1. 誤答と迷った問題を分ける：</b>正解でも根拠が曖昧なら復習対象にします。</li>
            <li><b>2. 誤答原因を分類する：</b>知識不足、用語の混同、計算ミス、問題文の読み違いに分けます。</li>
            <li><b>3. 弱い論点だけ戻る：</b>参考書を最初からやり直さず、失点した論点へ戻ります。</li>
            <li><b>4. 別問題で再判定する：</b>覚え直した直後ではなく、別問題で解けるか確認します。</li>
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black">本番は100問・120分。3分野すべてを見る</h2>
          <p className="mt-4 leading-8 text-slate-700">
            現行ITパスポート試験は100問・120分です。合格には総合評価点600/1,000点以上に加えて、ストラテジ系・マネジメント系・テクノロジ系の各分野で300/1,000点以上が必要です。評価点はIRT方式で算出されるため、「60問正解なら必ず合格」と単純には言えません。
          </p>
          <p className="mt-4 leading-8 text-slate-700">
            だからこそ、模試では総合点だけでなく、分野別の弱点を見ます。1分野だけ極端に弱い場合は、そこを優先して次の学習時間を配分します。
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black">AIは「誤答の理由」を短時間でほどく</h2>
          <p className="mt-4 leading-8 text-slate-700">
            復習で時間がかかるのは、解説を読んでも「なぜ自分が間違えたのか」が分からないときです。AIには正答だけでなく、「初心者向けに違いを説明」「間違えた選択肢がなぜ違うか」「同じ論点の確認問題を1問」のように依頼し、理解と再判定に使います。
          </p>
        </section>

        <section className="mt-14 border-y border-slate-200 py-10">
          <h2 className="text-2xl font-black">公式の公開問題も無料で使える</h2>
          <p className="mt-4 leading-8 text-slate-700">
            IPAは2026年度を含むITパスポートの公開問題・解答例を掲載しています。まず公式問題で本番レベルを確認し、その結果を弱点復習へつなげるのが基本です。2026年中に受験する場合は、IPAが2026年12月28日以降のCBT試験休止を予定しているため、受験日も早めに確認してください。
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold">
            <a className="underline" href="https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/questions.html" target="_blank" rel="noreferrer">IPA：公開問題・解答例</a>
            <a className="underline" href="https://www.ipa.go.jp/shiken/mousikomi/cbt_ip.html" target="_blank" rel="noreferrer">IPA：ITパスポート試験（CBT方式）</a>
          </div>
        </section>

        <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-white">
          <p className="text-sm font-bold text-slate-300">it-learning-app</p>
          <h2 className="mt-2 text-3xl font-black">模試の結果を「次にやること」へ変える。</h2>
          <p className="mt-4 leading-8 text-slate-200">
            点数を見るだけでは弱点は消えません。試験日、確保できる時間、問題演習で見つかった弱点から、次に取り組む学習を決めましょう。
          </p>
          <div className="mt-6"><Cta position="mid" /></div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black">よくある質問</h2>
          <div className="mt-6 space-y-6">
            {faq.map((x) => (
              <div key={x.q}>
                <h3 className="font-bold">{x.q}</h3>
                <p className="mt-2 leading-7 text-slate-600">{x.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-14 text-center">
          <Cta position="bottom" />
          <p className="mt-3 text-sm text-slate-500">模試を解いたら、次は弱点から学習順を決める。</p>
        </div>
      </article>
    </main>
  );
}
