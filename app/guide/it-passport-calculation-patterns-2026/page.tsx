import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-calculation-patterns-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const ctaBase = "/onboarding?source=calculation-patterns-2026";
const title = "ITパスポートの計算問題7パターン｜苦手な人向けの解き方まとめ【2026年版】";
const description = "ITパスポートの計算問題が苦手な人向けに、割合・期待値・損益分岐点・稼働率・通信時間・2進数など、押さえたい7パターンを整理。暗記ではなく解き方の型で対策します。";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "ITパスポート 計算問題",
    "ITパスポート 計算 苦手",
    "ITパスポート 計算問題 解き方",
    "ITパスポート 損益分岐点",
    "ITパスポート 稼働率",
    "ITパスポート 2進数",
  ],
  alternates: { canonical: pageUrl },
  openGraph: { title, description, type: "article", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title, description },
};

const patterns = [
  {
    no: "01",
    title: "割合・増減率",
    formula: "割合 ＝ 比べる量 ÷ もとにする量",
    example: "売上が80万円から100万円になった場合、増加率は (100−80)÷80＝25%。",
    tip: "『何を基準に割るか』を先に決めると、式を逆にしにくくなります。",
  },
  {
    no: "02",
    title: "期待値",
    formula: "期待値 ＝ 各結果 × その確率 の合計",
    example: "利益100万円の確率が0.6、利益20万円の確率が0.4なら、100×0.6＋20×0.4＝68万円。",
    tip: "結果と確率をペアにして掛け、最後に全部足します。",
  },
  {
    no: "03",
    title: "損益分岐点",
    formula: "損益分岐点売上高 ＝ 固定費 ÷ (1−変動費率)",
    example: "固定費300万円、変動費率60%なら、300÷(1−0.6)＝750万円。",
    tip: "固定費・変動費・売上高の関係を図にしてから式へ入れると理解しやすくなります。",
  },
  {
    no: "04",
    title: "システム稼働率",
    formula: "直列：A×B ／ 並列：1−(1−A)(1−B)",
    example: "稼働率0.9の装置2台を直列につなぐと0.9×0.9＝0.81。",
    tip: "直列は『両方動く必要がある』、並列は『両方止まる確率を1から引く』と覚えます。",
  },
  {
    no: "05",
    title: "通信時間・データ量",
    formula: "通信時間 ＝ データ量(bit) ÷ 通信速度(bit/s)",
    example: "Byteで与えられたデータ量は、必要に応じて8倍してbitへそろえてから計算します。",
    tip: "最初に単位をそろえることが最重要。bit / Byte、秒 / 分を混在させないようにします。",
  },
  {
    no: "06",
    title: "2進数・16進数",
    formula: "2進数4桁 ＝ 16進数1桁",
    example: "2進数 1010 は、10進数で10、16進数では A。",
    tip: "2の0乗、1乗、2乗、3乗＝1、2、4、8を使えるようにすると変換が速くなります。",
  },
  {
    no: "07",
    title: "平均・加重平均",
    formula: "加重平均 ＝ (値×重み の合計) ÷ 重みの合計",
    example: "人数や件数が異なるグループをまとめるときは、単純平均ではなく重みを考えます。",
    tip: "問題文に『人数』『個数』『比率』がある場合は、それが重みになっていないか確認します。",
  },
];

const faq = [
  ["計算問題が苦手でもITパスポートに合格できますか？", "計算だけに学習時間を偏らせる必要はありません。ただし、苦手だから全て捨てるのではなく、よく使う式と解き方の型を押さえ、問題演習で再現できる状態にするのが効率的です。"],
  ["公式は全部暗記した方がいいですか？", "式だけを暗記するより、『何を求める問題か』『どの数値を使うか』『単位はそろっているか』をセットで練習する方が実戦向きです。"],
  ["2026年はどのシラバスで勉強すればいいですか？", "2026年8月時点でIPAが掲載しているITパスポート試験の現行シラバスはVer.6.5です。受験前にはIPAの最新情報も確認してください。"],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Article", headline: title, description, url: pageUrl, inLanguage: "ja", datePublished: "2026-08-16", dateModified: "2026-08-16" },
    { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ],
};

function CTA({ position, compact = false }: { position: string; compact?: boolean }) {
  return (
    <Link
      href={`${ctaBase}&position=${position}`}
      className={`inline-flex items-center justify-center rounded-xl bg-slate-900 font-bold text-white transition hover:bg-slate-700 ${compact ? "px-5 py-3 text-sm" : "px-7 py-4"}`}
    >
      無料で自分専用の学習計画を作る →
    </Link>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-black tracking-tight">it-learning-app</Link>
          <CTA position="header" compact />
        </div>
      </header>

      <article>
        <section className="bg-slate-50">
          <div className="mx-auto max-w-5xl px-5 py-16 md:py-24">
            <p className="text-sm font-bold text-slate-500">2026年版｜ITパスポート計算問題まとめ</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
              計算問題は、<br />「公式の丸暗記」より7つの型で覚える。
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600">
              ITパスポートの計算問題で止まってしまう人向けに、割合、期待値、損益分岐点、稼働率、通信時間、2進数などを整理しました。全部を得意にするのではなく、問題を見た瞬間に「どの型か」を判断できる状態を目指します。
            </p>
            <div className="mt-8"><CTA position="hero" /></div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-14">
          <h2 className="text-3xl font-black">計算問題で最初にやるべきこと</h2>
          <p className="mt-5 leading-8 text-slate-700">
            計算が苦手な人ほど、問題ごとに新しい解き方を覚えようとして混乱しがちです。先に「問題の型」を少数にまとめ、①何を求めるか、②使う数値は何か、③単位はそろっているか、の3点を確認してから式へ入ると整理しやすくなります。
          </p>
          <p className="mt-4 leading-8 text-slate-700">
            IPAが掲載している現行ITパスポート試験シラバスは2026年8月時点でVer.6.5です。IPAは2026年度の公開問題・解答例も公開しているため、型を覚えた後は実際の公開問題で使えるか確認しましょう。
          </p>
        </section>

        <section className="bg-slate-50">
          <div className="mx-auto max-w-4xl px-5 py-14">
            <h2 className="text-3xl font-black">押さえたい計算問題7パターン</h2>
            <div className="mt-8 space-y-5">
              {patterns.map((p) => (
                <section key={p.no} className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-sm font-black text-slate-400">{p.no}</span>
                    <div>
                      <h3 className="text-xl font-black">{p.title}</h3>
                      <p className="mt-3 rounded-lg bg-slate-100 px-4 py-3 font-bold">{p.formula}</p>
                      <p className="mt-4 leading-7 text-slate-700">例：{p.example}</p>
                      <p className="mt-2 leading-7 text-slate-600">ポイント：{p.tip}</p>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-14">
          <h2 className="text-3xl font-black">AIは「答えを出す道具」ではなく「つまずきを特定する道具」にする</h2>
          <p className="mt-5 leading-8 text-slate-700">
            計算問題でAIを使うなら、正解だけを聞くより「自分の途中式のどこが間違っているか」「同じ型の数字を変えた問題を1問作って」と頼む方が復習に向いています。解説を読んだ直後に類題を解き、再現できるか確認してください。
          </p>
          <div className="mt-8 rounded-2xl bg-slate-900 p-7 text-white md:p-9">
            <p className="text-sm font-bold text-slate-300">it-learning-app</p>
            <h3 className="mt-2 text-2xl font-black">計算問題だけに時間を使いすぎない。</h3>
            <p className="mt-3 max-w-2xl leading-7 text-slate-300">試験日、学習可能時間、苦手分野から全体の学習計画を作り、計算問題をどこまで優先するかも整理できます。</p>
            <div className="mt-6"><CTA position="mid" /></div>
          </div>
        </section>

        <section className="bg-slate-50">
          <div className="mx-auto max-w-4xl px-5 py-14">
            <h2 className="text-3xl font-black">おすすめの復習手順</h2>
            <ol className="mt-7 space-y-4 text-slate-700">
              <li><strong>1. まず自力で解く：</strong>式が浮かばなくても、何を求める問題かだけ言語化する。</li>
              <li><strong>2. 誤答を分類する：</strong>公式忘れ、単位ミス、式の立て方、計算ミスのどれかを記録する。</li>
              <li><strong>3. 同じ型をもう1問：</strong>解説を読んで終わらず、数字が変わっても解けるか確認する。</li>
              <li><strong>4. 数日後に再挑戦：</strong>答えを覚えていない状態で解ければ、型が身についた可能性が高い。</li>
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-14">
          <h2 className="text-3xl font-black">よくある質問</h2>
          <div className="mt-7 space-y-4">
            {faq.map(([q, a]) => (
              <details key={q} className="rounded-xl border border-slate-200 p-5">
                <summary className="cursor-pointer font-bold">{q}</summary>
                <p className="mt-3 leading-7 text-slate-600">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-sm leading-6 text-slate-500">
            参考：IPA「試験要綱・シラバスについて」「ITパスポート試験 過去問題（問題冊子・解答例）」。試験範囲や制度は変更される場合があるため、受験前にIPAの最新情報を確認してください。
          </p>
        </section>

        <section className="bg-slate-900 text-white">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center md:py-20">
            <h2 className="text-3xl font-black md:text-4xl">苦手を見つけたら、次は「いつ復習するか」を決めよう。</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-300">it-learning-appで試験日と学習時間を入力し、自分専用の学習計画を作成できます。</p>
            <div className="mt-8"><CTA position="bottom" /></div>
          </div>
        </section>
      </article>
    </main>
  );
}
