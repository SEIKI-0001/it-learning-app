import type { Metadata } from "next";
import Link from "next/link";

const title = "ITパスポート勉強はChatGPTだけで十分？学習アプリとの違いを比較【2026年】";
const description = "ITパスポート対策にChatGPTなどの生成AIはどこまで使える？質問・解説・弱点管理・復習・進捗管理を学習アプリと比較し、効率的な使い分けを解説します。";
const path = "/compare/it-passport-chatgpt-vs-study-app-2026";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["ITパスポート ChatGPT", "ITパスポート AI 勉強", "ITパスポート AI アプリ", "ITパスポート 学習アプリ", "ITパスポート 勉強法", "ITパスポート 独学"],
  alternates: { canonical: path },
  openGraph: { title, description, type: "article", url: path },
  twitter: { card: "summary_large_image", title, description },
};

const cta = (placement: string) => `/onboarding?source=chatgpt-vs-study-app-2026&placement=${placement}`;

const rows = [
  ["分からない用語を質問する", "◎", "○"],
  ["自分向けに言い換えてもらう", "◎", "○"],
  ["問題演習を蓄積する", "△", "◎"],
  ["弱点を継続的に把握する", "△", "◎"],
  ["復習タイミングを管理する", "△", "◎"],
  ["試験日までの進捗を見る", "△", "◎"],
  ["次に何を学ぶか決める", "○", "◎"],
];

const faq = [
  { q: "ChatGPTだけでITパスポートに合格できますか？", a: "生成AIは理解支援に有効ですが、合格には出題範囲に沿った問題演習と弱点・復習の管理が必要です。生成AIだけに依存せず、公式シラバスや過去問題、学習管理手段と組み合わせる方が安全です。" },
  { q: "生成AIは何に使うと効果的ですか？", a: "分からない用語の言い換え、似た概念の比較、誤答理由の言語化など、理解の摩擦を下げる用途に向いています。" },
  { q: "学習アプリを使うメリットは？", a: "解答履歴を継続して蓄積し、弱点、復習、進捗、次の学習を一つの流れとして管理しやすい点です。" },
];

const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="font-black text-blue-700">it-learning-app</span>
          <Link href={cta("header")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">無料で学習を始める</Link>
        </div>
      </header>

      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16 md:py-24">
          <p className="font-bold text-blue-700">ITパスポート × AI学習</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">ITパスポート勉強は<br />ChatGPTだけで十分？</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600">生成AIは「分からない」をその場で解消するのが得意です。一方、試験勉強では、何を間違えたか、いつ復習するか、合格まであと何が足りないかを継続して管理する必要があります。重要なのはAIか学習アプリかの二択ではなく、役割を分けることです。</p>
          <Link href={cta("hero")} className="mt-8 inline-block rounded-xl bg-blue-600 px-7 py-4 font-bold text-white">無料で現在地から学習を始める →</Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-3xl font-black">結論：AIは「理解」、学習アプリは「学習の制御」に使う</h2>
        <p className="mt-4 max-w-3xl leading-8 text-slate-600">たとえば「CRMとSFAの違いが分からない」とき、生成AIなら自分が理解できる表現まで何度でも聞き直せます。しかし翌週、その概念を本当に覚えているかを自動で確認するには、回答履歴と復習設計が必要です。</p>
        <div className="mt-8 overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[620px] border-collapse">
            <thead><tr className="bg-slate-100"><th className="p-4 text-left">やりたいこと</th><th className="p-4">生成AI</th><th className="p-4">学習アプリ</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row[0]} className="border-t">{row.map((cell, i) => <td key={cell} className={`p-4 ${i === 0 ? "font-medium" : "text-center font-bold"}`}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="text-3xl font-black">生成AIが特に強い3つの使い方</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[["1", "言い換える", "『中学生にも分かるように』『具体例を使って』と理解できるまで説明を変えられます。"], ["2", "比較する", "似た用語を表や具体例で比較すると、丸暗記より違いを理解しやすくなります。"], ["3", "誤答を分析する", "なぜ自分がその選択肢を選んだのかを書けば、思考のどこで間違えたか整理できます。"]].map(([n,h,p]) => <div key={n} className="rounded-2xl border p-6"><span className="text-3xl font-black text-blue-600">{n}</span><h3 className="mt-3 text-xl font-black">{h}</h3><p className="mt-3 leading-7 text-slate-600">{p}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-3xl font-black">逆に、会話だけでは抜けやすいもの</h2>
        <div className="mt-7 space-y-4">
          {["過去に解いた問題と正誤履歴を一貫して管理する", "3分野のどこに弱点が残っているかを見る", "忘れた頃に復習問題を出す", "試験日までの残り時間から優先順位を変える", "学習後に別問題で本当に定着したか測り直す"].map((x) => <div key={x} className="rounded-xl border bg-white p-5 font-bold">✓ {x}</div>)}
        </div>
      </section>

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <p className="font-bold text-blue-300">it-learning-app</p>
          <h2 className="mt-2 text-3xl font-black">「何を質問するか」の前に、「次に何を学ぶか」を決める。</h2>
          <p className="mt-4 max-w-3xl leading-8 text-slate-300">it-learning-appは、問題結果から現在地を測り、弱点、復習、再測定をつなげて次の学習を決めることを目指しています。分からない部分はAIで深掘りし、学習全体の進行は履歴から管理する。この組み合わせなら、AIとの会話がその場限りで終わりません。</p>
          <Link href={cta("mid")} className="mt-7 inline-block rounded-xl bg-white px-7 py-4 font-bold text-blue-700">無料で自分の弱点を確認する →</Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16">
        <h2 className="text-3xl font-black">おすすめの使い分け</h2>
        <ol className="mt-7 space-y-4">
          {["学習アプリで問題を解き、現在地を測る", "間違えた理由が理解できない箇所だけ生成AIに聞く", "必要な範囲だけ学び直す", "別問題で再測定する", "残った弱点から次の学習を決める"].map((x,i) => <li key={x} className="flex gap-4 rounded-xl border bg-white p-5"><span className="font-black text-blue-600">{i+1}</span><span>{x}</span></li>)}
        </ol>

        <h2 className="mt-16 text-3xl font-black">よくある質問</h2>
        <div className="mt-7 space-y-4">{faq.map(({q,a}) => <details key={q} className="rounded-2xl border bg-white p-5"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-3 leading-7 text-slate-600">{a}</p></details>)}</div>

        <div className="mt-12 rounded-3xl bg-blue-50 p-8 text-center">
          <h2 className="text-3xl font-black">AIに聞く前に、まず自分の弱点を知る。</h2>
          <p className="mt-3 text-slate-600">問題結果から、今の自分に必要な学習を絞ります。</p>
          <Link href={cta("bottom")} className="mt-6 inline-block rounded-xl bg-blue-600 px-7 py-4 font-bold text-white">無料で自分専用の学習計画を作る →</Link>
        </div>
      </section>
    </main>
  );
}
