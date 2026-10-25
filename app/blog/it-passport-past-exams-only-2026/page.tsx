import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/blog/it-passport-past-exams-only-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "past-exams-only-2026";

export const metadata: Metadata = {
  title: "ITパスポートは過去問だけで受かる？失敗しない勉強法【2026年版】",
  description:
    "ITパスポートは過去問だけで合格できる？2026年受験者向けに、過去問だけでは不足しやすい理由、何を追加で学ぶべきか、弱点を効率よく潰す勉強法を解説します。",
  keywords: [
    "ITパスポート 過去問だけ",
    "ITパスポート 過去問だけで受かる",
    "ITパスポート 過去問 勉強法",
    "ITパスポート 独学",
    "ITパスポート 過去問 何割",
    "ITパスポート AI 学習",
    "ITパスポート 2026",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートは過去問だけで受かる？失敗しない勉強法【2026年版】",
    description:
      "過去問を合格判定だけで終わらせず、弱点発見と復習に使う方法を解説します。",
    type: "article",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポートは過去問だけで受かる？【2026年版】",
    description: "過去問中心で勉強するときに不足しやすい点と、効率的な弱点復習法を解説。",
  },
};

const faq = [
  {
    q: "ITパスポートは過去問だけで合格できますか？",
    a: "過去問は非常に重要ですが、過去問だけに限定すると未出・更新された論点や、正解したものの理解が浅い論点を見落とす可能性があります。過去問を現在地の測定に使い、誤答や迷った問題から不足知識を補う方法が安全です。",
  },
  {
    q: "過去問は何点くらい取れれば本番を受けてよいですか？",
    a: "本試験はIRT方式で評価点が算出されるため、過去問の単純な正答率を本番の評価点へそのまま換算できません。総合点だけでなく、3分野の弱点が残っていないかも確認してください。",
  },
  {
    q: "過去問で正解した問題も復習した方がいいですか？",
    a: "根拠を説明できず勘で正解した問題は復習対象にするのがおすすめです。『なぜ他の選択肢が違うか』まで説明できるか確認すると、理解の浅い正解を見つけやすくなります。",
  },
  {
    q: "2026年の学習範囲は何を基準にすればいいですか？",
    a: "2026年8月時点でIPAが掲載しているITパスポート試験シラバスはVer.6.5です。過去問とあわせて現行シラバスを確認し、古い問題だけでは拾えない範囲がないか確認してください。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BlogPosting",
      headline: metadata.title,
      description: metadata.description,
      url: pageUrl,
      inLanguage: "ja-JP",
      datePublished: "2026-08-18",
      dateModified: "2026-08-18",
      author: { "@type": "Organization", name: "it-learning-app" },
      publisher: { "@type": "Organization", name: "it-learning-app" },
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
    className="inline-flex rounded-xl bg-slate-900 px-6 py-3 font-bold text-white transition hover:bg-slate-700"
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
        <p className="mb-3 text-sm font-bold text-slate-500">ITパスポート勉強法・2026年版</p>
        <h1 className="text-4xl font-black leading-tight tracking-tight">
          ITパスポートは過去問だけで受かる？<br />失敗しない勉強法
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          過去問はITパスポート対策の中心になる教材です。ただし、「何度も解いて答えを覚える」だけでは、本番で問われ方が変わったときや、まだ学んでいない論点に対応しにくくなります。大切なのは、過去問を合格判定ではなく「弱点を見つける検査」として使うことです。
        </p>
        <div className="mt-8"><Cta position="hero" /></div>

        <section className="mt-16">
          <h2 className="text-2xl font-black">結論：過去問は中心でOK。ただし「過去問だけ」に固定しない</h2>
          <p className="mt-4 leading-8 text-slate-700">
            IPAは2026年度を含むITパスポートの公開問題・解答例を公開しています。まず公式問題を解いて現在地を把握するのは合理的です。一方、過去問で一度も出会っていない知識や、古い年度では扱いが異なるテーマまで過去問だけで網羅できるとは限りません。
          </p>
          <p className="mt-4 leading-8 text-slate-700">
            おすすめは「過去問 → 誤答と迷った問題を分類 → 必要な範囲だけ教材やシラバスへ戻る → 別問題で再確認」という往復です。インプットを最初から全部やり直すより、復習範囲を絞りやすくなります。
          </p>
        </section>

        <section className="mt-14 rounded-3xl bg-slate-50 p-7">
          <h2 className="text-2xl font-black">過去問だけで勉強すると起こりやすい3つの失敗</h2>
          <div className="mt-6 space-y-6 text-slate-700">
            <div><h3 className="font-bold">1. 答えを覚えて「理解した」と錯覚する</h3><p className="mt-2 leading-7">同じ問題を繰り返すと、選択肢の位置や文面を覚えて正解できるようになります。正解したら「なぜその選択肢か」を一言で説明できるか確認します。</p></div>
            <div><h3 className="font-bold">2. 得意分野の高得点で弱点を隠す</h3><p className="mt-2 leading-7">本試験は総合600点以上だけでなく、ストラテジ・マネジメント・テクノロジの各分野でも300点以上が必要です。総合正答率だけでなく、分野別に弱点を確認する必要があります。</p></div>
            <div><h3 className="font-bold">3. 現行シラバスとの差分を見落とす</h3><p className="mt-2 leading-7">2026年8月時点で現行シラバスはVer.6.5です。古い年度の問題を多く解くほど、現在の範囲確認をシラバスで補う意味が大きくなります。</p></div>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black">過去問を「弱点発見ツール」に変える4ステップ</h2>
          <ol className="mt-6 space-y-5 text-slate-700">
            <li><b>1. まず時間を決めてまとめて解く：</b>本試験は100問・120分です。短い一問一答だけでなく、まとまった問題数にも定期的に取り組みます。</li>
            <li><b>2. 誤答を4種類に分ける：</b>「知らない」「混同した」「計算ミス」「勘で選んだ」に分けると、次に何を復習するか決めやすくなります。</li>
            <li><b>3. 必要なところだけ戻る：</b>知らない用語なら基礎解説、混同なら比較表、計算ミスなら同じ型の類題というように復習方法を変えます。</li>
            <li><b>4. 別の問題で再判定する：</b>同じ問題の正解ではなく、別問題でも説明・判断できたら弱点が改善したと考えます。</li>
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black">「過去問で何割取れたか」だけを合格判定にしない</h2>
          <p className="mt-4 leading-8 text-slate-700">
            現行ITパスポート試験は100問・120分の四肢択一式で、評価点はIRT（項目応答理論）に基づいて算出されます。合格基準は総合評価点600/1,000点以上、かつ3分野それぞれ300/1,000点以上です。そのため「過去問で60%正解したから本番も600点」と単純換算することはできません。
          </p>
          <p className="mt-4 leading-8 text-slate-700">
            正答率は目安として使いながら、分野別のばらつき、勘で正解した問題、最近繰り返し間違えるテーマも一緒に見ます。
          </p>
        </section>

        <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-white">
          <p className="text-sm font-bold text-slate-300">it-learning-app</p>
          <h2 className="mt-2 text-3xl font-black">過去問を解いた後の「次に何をする？」を減らす。</h2>
          <p className="mt-4 leading-8 text-slate-200">
            問題演習で見つかった弱点を、次の復習につなげる。試験日と使える時間から、自分向けの学習計画を作って始めましょう。
          </p>
          <div className="mt-6"><Cta position="mid" /></div>
        </section>

        <section className="mt-14 border-y border-slate-200 py-10">
          <h2 className="text-2xl font-black">2026年受験者が確認しておきたい公式情報</h2>
          <p className="mt-4 leading-8 text-slate-700">
            IPAが掲載しているITパスポート試験シラバスは2026年8月時点でVer.6.5です。公開問題には2026年度分も掲載されています。過去問演習は、最新版のシラバスと公式公開問題を起点にすると情報の古さを避けやすくなります。
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold">
            <a className="underline" href="https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/questions.html" target="_blank" rel="noreferrer">IPA：ITパスポート過去問題</a>
            <a className="underline" href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" target="_blank" rel="noreferrer">IPA：試験要綱・シラバス</a>
            <a className="underline" href="https://www3.jitec.ipa.go.jp/JitesCbt/html/about/range.html" target="_blank" rel="noreferrer">IPA：試験内容・合格基準</a>
          </div>
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
          <p className="mt-3 text-sm text-slate-500">過去問の点数ではなく、次に直す弱点を明確にするところから。</p>
        </div>
      </article>
    </main>
  );
}
