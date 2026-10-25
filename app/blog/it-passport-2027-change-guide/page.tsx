import type { Metadata } from "next";
import Link from "next/link";

const title = "ITパスポートは2027年度にどう変わる？2026年受験者が今やるべき勉強法";
const description =
  "ITパスポート試験は2027年度から内容変更が予定されています。2026年に受験する人への影響、現行試験の100問・120分・合格基準、今から始める学習法をわかりやすく解説します。";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "ITパスポート 2027 変更",
    "ITパスポート 2026 勉強法",
    "ITパスポート 試験制度 変更",
    "ITパスポート AI 勉強",
    "ITパスポート 独学",
  ],
  alternates: { canonical: "/blog/it-passport-2027-change-guide" },
  openGraph: { title, description, type: "article" },
  twitter: { card: "summary_large_image", title, description },
};

const cta = "/onboarding?source=2027-change-guide";

export default function Page() {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    datePublished: "2026-08-10",
    dateModified: "2026-08-10",
    mainEntityOfPage: "/blog/it-passport-2027-change-guide",
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "ITパスポート試験は2027年度から変わりますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "IPAは2027年度から新試験制度への移行を予定し、ITパスポート試験を「内容変更」としています。試験時間120分・出題数100問という概要も示されています。",
        },
      },
      {
        "@type": "Question",
        name: "2026年に受験する人は勉強方法を変える必要がありますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "2026年の受験では、受験時点の現行シラバスと公式情報を基準に学習することが重要です。2027年度向けの情報と混同せず、現行範囲の理解と問題演習を優先しましょう。",
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <p className="mb-4 text-sm font-semibold text-blue-700">2026年8月10日更新｜ITパスポート試験</p>
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">ITパスポートは2027年度にどう変わる？<br className="hidden sm:block" />2026年受験者が今やるべき勉強法</h1>
        <p className="mt-6 text-lg leading-8 text-slate-700">
          「2027年からITパスポートが変わるなら、今勉強して大丈夫？」と不安になる必要はありません。IPAは2027年度からの新試験制度でITパスポートを「内容変更」としていますが、2026年に受験するなら、まず現在の試験範囲に合わせて合格力を作ることが優先です。
        </p>

        <div className="mt-8 rounded-2xl bg-blue-700 p-6 text-white">
          <p className="text-xl font-bold">試験日から逆算して、今日やることを決める</p>
          <p className="mt-2 text-blue-50">it-learning-appなら、学習計画と問題演習をつなげて独学を進められます。</p>
          <Link href={`${cta}&position=hero`} className="mt-5 inline-block rounded-xl bg-white px-5 py-3 font-bold text-blue-700">無料で自分専用の学習計画を作る</Link>
        </div>

        <section className="mt-12 space-y-5">
          <h2 className="text-2xl font-bold">結論：2026年受験なら「制度変更待ち」をしない</h2>
          <p className="leading-8 text-slate-700">IPAは2027年度から新試験制度への移行を予定しています。公表されている概要では、ITパスポートは内容変更の対象ですが、試験時間は120分、出題数は100問とされています。新制度の詳細は今後の公式発表を確認する必要があります。</p>
          <p className="leading-8 text-slate-700">一方、現在のITパスポート試験も120分・100問のCBT方式です。総合評価点600点以上に加え、ストラテジ・マネジメント・テクノロジの各分野で300点以上が必要です。2026年に受験する人は、この現行基準に合わせて学習を進めるのが合理的です。</p>
          <p><a className="font-semibold text-blue-700 underline" href="https://www.ipa.go.jp/shiken/syllabus/henkou/2025/20260331.html" target="_blank" rel="noreferrer">IPA：2027年度からの新試験制度の概要</a></p>
          <p><a className="font-semibold text-blue-700 underline" href="https://www3.jitec.ipa.go.jp/JitesCbt/html/about/range.html" target="_blank" rel="noreferrer">IPA：現行ITパスポート試験の試験内容・出題範囲</a></p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">2026年受験者が今やるべき4ステップ</h2>
          <div className="mt-6 space-y-4">
            {[
              ["1. 受験日を決める", "「勉強が終わったら申し込む」ではなく、先に期限を作ります。残り日数が決まれば、1日に必要な学習量を逆算できます。"],
              ["2. 3分野を一度広く学ぶ", "ストラテジ・マネジメント・テクノロジを最初から完璧にしようとせず、まず全体像をつかみます。"],
              ["3. 問題を解いて弱点を見つける", "読んだ時間ではなく、問題に答えられるかで理解度を確認します。間違えた分野を次の学習対象にします。"],
              ["4. 弱点→再演習を繰り返す", "苦手を復習して再び問題を解き、理解できたかを確認します。この循環を試験日まで続けます。"],
            ].map(([h, p]) => (
              <div key={h} className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold">{h}</h3><p className="mt-2 leading-7 text-slate-700">{p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-blue-200 bg-blue-50 p-7">
          <h2 className="text-2xl font-bold">AIは「答えを覚える道具」ではなく「理解を早める道具」にする</h2>
          <p className="mt-4 leading-8 text-slate-700">生成AIは、難しい用語をかみ砕いて説明してもらう、間違えた理由を整理する、具体例を作ってもらう、といった用途に向いています。ただし試験範囲や制度の事実確認はIPAなどの一次情報を基準にしましょう。</p>
          <p className="mt-4 leading-8 text-slate-700">it-learning-appでは、AIだけに学習を任せるのではなく、計画・演習・理解度確認・復習を一つの学習サイクルとして進めることを重視しています。</p>
          <Link href={`${cta}&position=mid`} className="mt-5 inline-block rounded-xl bg-blue-700 px-5 py-3 font-bold text-white">無料で学習計画を作って始める</Link>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">2027年度の変更を待った方がいい人は？</h2>
          <p className="mt-4 leading-8 text-slate-700">資格取得そのものを急いでおらず、2027年度以降に受験したい明確な理由がある人は、新制度の詳細発表を追いながら準備する選択肢があります。しかし「仕事でITの基礎を身につけたい」「2026年中に資格を取りたい」のであれば、制度変更を理由に学習開始を遅らせるメリットは大きくありません。</p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">よくある質問</h2>
          <h3 className="mt-6 font-bold">Q. 2027年度から試験時間や問題数も変わりますか？</h3>
          <p className="mt-2 leading-7 text-slate-700">IPAが2026年3月31日に示した新制度概要では、ITパスポートは試験時間120分・出題数100問とされています。ただし新制度の詳細は今後の公式情報も確認してください。</p>
          <h3 className="mt-6 font-bold">Q. 今買った教材がすぐ無駄になりますか？</h3>
          <p className="mt-2 leading-7 text-slate-700">2026年に受験するなら、受験時点の現行シラバスに対応した教材で学習してください。2027年度以降に受験する場合は、正式な新シラバス公開後に差分を確認するのが安全です。</p>
        </section>

        <section className="mt-14 rounded-3xl bg-slate-900 p-8 text-white sm:p-10">
          <p className="text-sm font-semibold text-blue-300">IT PASSPORT × AI STUDY</p>
          <h2 className="mt-3 text-3xl font-bold">制度変更を調べ続けるより、まず今日の1問を。</h2>
          <p className="mt-4 leading-8 text-slate-300">試験日から逆算した学習計画を作り、問題を解きながら弱点を減らしていきましょう。</p>
          <Link href={`${cta}&position=bottom`} className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-bold text-slate-900">無料で自分専用の学習計画を作る</Link>
        </section>
      </article>
    </main>
  );
}
