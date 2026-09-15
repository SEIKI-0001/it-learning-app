import type { Metadata } from "next";
import Link from "next/link";

const title = "ITパスポートは無料で合格できる？無料学習・有料教材・AI学習を比較【2026年版】";
const description =
  "ITパスポートは無料教材だけで合格できる？IPA公開問題、参考書・講座、AI学習を費用・計画・弱点対策・質問対応で比較し、自分に合う勉強法を解説します。";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "ITパスポート 無料",
    "ITパスポート 無料 勉強",
    "ITパスポート 独学 無料",
    "ITパスポート 教材 比較",
    "ITパスポート AI 学習",
    "ITパスポート 勉強法 2026",
  ],
  alternates: { canonical: "/compare/it-passport-free-vs-paid-study-2026" },
  openGraph: { title, description, type: "article" },
  twitter: { card: "summary_large_image", title, description },
};

const cta = "/onboarding?source=free-vs-paid-study-2026";

const options = [
  {
    name: "無料学習",
    cost: "◎",
    plan: "△",
    weakness: "△",
    questions: "△",
    fit: "自分で学習順序を決められる人",
  },
  {
    name: "参考書・講座",
    cost: "△",
    plan: "○",
    weakness: "○",
    questions: "△〜○",
    fit: "体系立てて学びたい人",
  },
  {
    name: "AI学習支援",
    cost: "○",
    plan: "◎",
    weakness: "◎",
    questions: "◎",
    fit: "計画と弱点対策を効率化したい人",
  },
];

export default function Page() {
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "ITパスポートは無料教材だけでも合格できますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "可能性はあります。IPAは公開問題やシラバスを無料公開しています。ただし、教材費がゼロでも、学習計画、弱点の特定、復習管理は自分で行う必要があります。",
        },
      },
      {
        "@type": "Question",
        name: "有料教材を買うべきなのはどんな人ですか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "何から学ぶか迷う人、解説を体系的に読みたい人、自分だけでは学習を継続しにくい人には有料教材や学習支援サービスが有効です。価格ではなく不足している機能で選びましょう。",
        },
      },
      {
        "@type": "Question",
        name: "AIはITパスポート学習にどう使えますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "学習計画の作成、難しい用語の言い換え、誤答理由の整理、弱点に合わせた復習などに使えます。試験制度や出題範囲などの事実確認はIPAの一次情報を基準にしてください。",
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-bold">it-learning-app</Link>
          <Link href={`${cta}&position=header`} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-14 md:py-20">
        <p className="mb-4 text-sm font-semibold text-blue-700">2026年版｜ITパスポート教材比較</p>
        <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-5xl">
          ITパスポートは無料で合格できる？<br />無料学習・有料教材・AI学習を比較
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
          無料か有料かだけで教材を決めると、かえって時間を失うことがあります。重要なのは「知識」「問題演習」「計画」「弱点対策」のうち、自分に何が足りないかです。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`${cta}&position=hero`} className="rounded-xl bg-blue-700 px-6 py-3 font-bold text-white">
            無料で自分専用の学習計画を作る
          </Link>
          <a href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" target="_blank" rel="noreferrer" className="rounded-xl border bg-white px-6 py-3 font-semibold">
            IPA公式シラバスを確認
          </a>
        </div>
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto max-w-5xl overflow-x-auto px-5 py-12">
          <h2 className="mb-6 text-2xl font-bold">3つの学習方法を比較</h2>
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead><tr className="border-b"><th className="p-3">方法</th><th className="p-3">費用</th><th className="p-3">計画</th><th className="p-3">弱点対策</th><th className="p-3">質問</th><th className="p-3">向いている人</th></tr></thead>
            <tbody>{options.map((o) => <tr key={o.name} className="border-b"><th className="p-3">{o.name}</th><td className="p-3">{o.cost}</td><td className="p-3">{o.plan}</td><td className="p-3">{o.weakness}</td><td className="p-3">{o.questions}</td><td className="p-3">{o.fit}</td></tr>)}</tbody>
          </table>
          <p className="mt-4 text-sm text-slate-500">※評価は一般的な学習方法の特徴を整理した目安です。個別の商品・講座を評価するものではありません。</p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-5 py-14 leading-8">
        <h2 className="text-3xl font-bold">結論：無料でも始められる。ただし「管理」は別問題</h2>
        <p className="mt-5">IPAはITパスポートのシラバスや公開問題を公開しているため、試験範囲の確認と問題演習は無料でも始められます。2026年8月時点の現行シラバスはVer.6.5です。</p>
        <p className="mt-4">一方、無料教材を集めるだけでは「今日は何をやるか」「どこが弱いか」「いつ復習するか」は決まりません。独学で止まりやすいのは、教材不足より学習管理の不足です。</p>

        <h2 className="mt-12 text-3xl font-bold">無料学習が向いている人</h2>
        <p className="mt-5">自分で試験日から逆算し、シラバスを確認しながら教材を選び、間違えた問題を記録できる人なら、無料中心でも進めやすいでしょう。まず公式情報と公開問題から始めるのが安全です。</p>

        <h2 className="mt-12 text-3xl font-bold">有料教材の価値は「情報」だけではない</h2>
        <p className="mt-5">参考書や講座に払う費用は、情報そのものだけの対価ではありません。学ぶ順番が整理されている、解説が一貫している、教材探しの時間を減らせる、といった価値があります。何を勉強すべきか毎回迷うなら、時間を買う意味があります。</p>

        <h2 className="mt-12 text-3xl font-bold">AI学習は「教材」より「伴走役」として使う</h2>
        <p className="mt-5">AIの強みは、同じ説明を全員に見せることではなく、分からなかった箇所に合わせて説明を変えられる点です。「DNSを郵便に例えて」「この誤答はどの知識が不足している？」のように使えば、復習をピンポイントにできます。</p>
        <p className="mt-4">ただし生成AIの回答だけを試験制度の根拠にせず、シラバスや試験条件はIPA公式情報で確認するのが基本です。</p>

        <div className="my-12 rounded-2xl bg-blue-50 p-7">
          <h2 className="text-2xl font-bold">無料教材を探す前に、まず学習ルートを決める</h2>
          <p className="mt-3">it-learning-appでは、試験日や学習状況から「次に何を学ぶか」を整理し、問題演習を弱点復習につなげることを目指しています。教材を増やす前に、自分の学習計画を作ってみてください。</p>
          <Link href={`${cta}&position=mid`} className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-bold text-white">無料で自分専用の学習計画を作る</Link>
        </div>

        <h2 className="text-3xl font-bold">2026年受験者が確認しておきたいこと</h2>
        <p className="mt-5">現行ITパスポート試験は120分・100問で、ストラテジ、マネジメント、テクノロジの3分野から出題されます。総合評価点だけでなく分野別の基準もあるため、一つの得意分野だけで押し切る学習は避けるべきです。</p>
        <p className="mt-4">またIPAは2027年度から新試験制度への移行を予定しています。2026年中に受験するなら、未確定情報を追い続けるより現行シラバスを基準に学習を進める方が合理的です。</p>

        <h2 className="mt-12 text-3xl font-bold">迷ったら、この順番で始める</h2>
        <ol className="mt-5 list-decimal space-y-3 pl-6"><li>試験日を決める</li><li>IPAの現行シラバスで全体像を見る</li><li>基礎教材を1つに絞る</li><li>早めに問題を解いて弱点を見つける</li><li>弱点だけ解説・AI・教材へ戻る</li><li>別問題で理解できたか再確認する</li></ol>

        <div className="mt-14 rounded-2xl bg-slate-900 p-8 text-white">
          <h2 className="text-3xl font-bold">「何を使うか」より「次に何をやるか」を決めよう</h2>
          <p className="mt-4 text-slate-300">無料教材、有料教材、AIのどれを選んでも、合格まで学習を続けられなければ意味がありません。まず自分専用の学習計画から始めてください。</p>
          <Link href={`${cta}&position=bottom`} className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-bold text-slate-900">無料で学習計画を作る</Link>
        </div>

        <div className="mt-12 border-t pt-8 text-sm text-slate-500">
          <p>参考：IPA「試験要綱・シラバスについて」「ITパスポート試験（CBT方式）」</p>
          <p className="mt-2">情報確認日：2026年8月14日</p>
        </div>
      </article>
    </main>
  );
}
