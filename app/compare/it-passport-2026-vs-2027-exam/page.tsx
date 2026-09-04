import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ITパスポートは2026年中に受ける？2027年まで待つ？違いを比較",
  description:
    "ITパスポートを2026年中に受験するか、2027年の新試験制度まで待つかを比較。試験休止予定、シラバス変更、学習計画の観点から、今受けるべき人・待つ選択肢がある人を整理します。",
  keywords: [
    "ITパスポート 2027",
    "ITパスポート 2026",
    "ITパスポート 試験 変更",
    "ITパスポート いつ受ける",
    "ITパスポート 新試験制度",
    "ITパスポート 勉強法",
  ],
  alternates: { canonical: "/compare/it-passport-2026-vs-2027-exam" },
  openGraph: {
    title: "ITパスポートは2026年中に受ける？2027年まで待つ？",
    description: "2026年受験と2027年新試験制度を比較。今から勉強する人の判断基準を整理します。",
    type: "article",
    url: "/compare/it-passport-2026-vs-2027-exam",
  },
  twitter: { card: "summary_large_image", title: "ITパスポート 2026年受験 vs 2027年受験", description: "どちらを選ぶべきか、現時点の公式情報から比較。" },
};

const cta = "/onboarding?source=2026-vs-2027-exam";

const rows = [
  ["試験制度", "現行制度", "新試験制度を開始予定"],
  ["学習範囲", "現行シラバスで対策可能", "新制度のシラバスを確認して対策"],
  ["受験時期", "2026年12月27日までの開催日", "システムリプレース後。再開時期はIPAの最新案内を確認"],
  ["向いている人", "すでに受験意思があり、年内に学習時間を確保できる人", "急いで資格取得する必要がなく、新制度の詳細確定を待てる人"],
];

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "ITパスポートは2026年中に受ける？2027年まで待つ？違いを比較",
    datePublished: "2026-08-23",
    dateModified: "2026-08-23",
    description: metadata.description,
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-bold">it-learning-app</Link>
          <Link href={`${cta}&position=header`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">無料で学習計画を作る</Link>
        </div>
      </header>

      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-5 py-14 md:py-20">
          <p className="mb-3 text-sm font-bold text-blue-700">2026年8月23日時点のIPA公表情報をもとに比較</p>
          <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">ITパスポートは2026年中に受ける？<br />2027年まで待つ？</h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">2027年度から新試験制度が予定されています。一方、2026年12月28日以降はシステムリプレースに伴う試験休止が予定されています。「制度が変わるなら待つべき？」と迷う人向けに、判断材料を整理します。</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`${cta}&position=hero`} className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white">受験日から学習計画を作る</Link>
            <a href="https://www.ipa.go.jp/shiken/2026/cbt-202605-jisshi.html" className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold" target="_blank" rel="noreferrer">IPAの最新案内を確認</a>
          </div>
        </div>
      </section>

      <article className="mx-auto max-w-4xl space-y-14 px-5 py-14">
        <section>
          <h2 className="text-2xl font-bold">結論：年内に合格したい理由があるなら、2026年受験を先に検討</h2>
          <p className="mt-4 leading-8 text-slate-700">「新制度になるから2027年まで待った方が有利」とは限りません。2026年中に資格が必要、就職・転職・社内評価に使いたい、すでに勉強を始めている、といった人は、現行制度で受験できる期間を活用する方が合理的です。一方、取得時期に制約がなく、新制度の詳細を確認してから学びたい人には待つ選択肢もあります。</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">2026年受験と2027年受験を比較</h2>
          <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-100"><tr><th className="p-4">比較項目</th><th className="p-4">2026年中</th><th className="p-4">2027年度</th></tr></thead>
              <tbody>{rows.map((r) => <tr key={r[0]} className="border-t"><th className="p-4 font-bold">{r[0]}</th><td className="p-4 leading-6">{r[1]}</td><td className="p-4 leading-6">{r[2]}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-500">※2027年度の詳細・再開時期は変更される可能性があります。必ずIPAの最新情報を確認してください。</p>
        </section>

        <section className="rounded-2xl bg-blue-50 p-7">
          <h2 className="text-2xl font-bold">2026年は「12月27日」が重要</h2>
          <p className="mt-4 leading-8">IPAは、システムリプレースに伴い2026年12月28日以降のITパスポート試験を一時休止する予定です。また、2026年9月27日までの新規申込みでは申込日から3か月先の同日まで、9月28日以降の新規申込みでは2026年12月27日までの開催日から選択する予定と案内しています。会場によっては12月27日より前に休止する場合もあります。</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">2026年中に受けるなら、今やることは3つ</h2>
          <ol className="mt-6 space-y-5">
            <li className="rounded-xl border bg-white p-5"><strong>1. 受験候補日を決める</strong><p className="mt-2 text-slate-600">「勉強が終わったら申し込む」ではなく、会場の開催状況を確認して期限を置きます。</p></li>
            <li className="rounded-xl border bg-white p-5"><strong>2. 3分野の現在地を測る</strong><p className="mt-2 text-slate-600">ストラテジ・マネジメント・テクノロジを一度解き、正答だけでなく迷った問題も弱点候補として残します。</p></li>
            <li className="rounded-xl border bg-white p-5"><strong>3. 残り日数を弱点へ配分する</strong><p className="mt-2 text-slate-600">全範囲を均等に繰り返すのではなく、間違えた論点を優先し、別問題で再確認します。</p></li>
          </ol>
        </section>

        <section className="rounded-2xl bg-slate-900 p-8 text-white">
          <h2 className="text-2xl font-bold">「いつ受けるか」が決まれば、今日やることも決まる</h2>
          <p className="mt-4 leading-8 text-slate-300">it-learning-appでは、受験日や学習状況を起点に学習を進められます。制度変更を調べ続けるより、2026年中に受けると決めたら、残り期間を具体的な学習へ変えましょう。</p>
          <Link href={`${cta}&position=mid`} className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-bold text-slate-900">無料で自分専用の学習計画を作る</Link>
        </section>

        <section>
          <h2 className="text-2xl font-bold">よくある質問</h2>
          <div className="mt-6 space-y-6">
            <div><h3 className="font-bold">2027年度まで待った方が試験は簡単になりますか？</h3><p className="mt-2 leading-7 text-slate-600">現時点で「簡単になる」と判断できる根拠はありません。新制度の内容はIPAの最新公表情報で確認してください。</p></div>
            <div><h3 className="font-bold">2026年12月28日以降も受験できますか？</h3><p className="mt-2 leading-7 text-slate-600">IPAは同日以降の試験を一時休止予定と案内しています。会場によってはそれ以前に休止する場合もあります。</p></div>
            <div><h3 className="font-bold">今から年内受験に間に合いますか？</h3><p className="mt-2 leading-7 text-slate-600">必要期間は現在の知識と確保できる学習時間で変わります。まず受験候補日と現在地を決め、残り日数から逆算してください。</p></div>
          </div>
        </section>

        <section className="border-t pt-10 text-center">
          <h2 className="text-2xl font-bold">年内受験を目指すなら、今日から逆算</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">受験日・学習時間・弱点から、次に取り組む内容を整理します。</p>
          <Link href={`${cta}&position=bottom`} className="mt-6 inline-block rounded-xl bg-blue-600 px-7 py-3 font-bold text-white">無料で学習計画を作る</Link>
        </section>
      </article>
    </main>
  );
}
