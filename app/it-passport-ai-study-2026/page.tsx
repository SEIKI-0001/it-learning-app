import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/it-passport-ai-study-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const source = "ai-study-guide-2026";
const cta = (position: string) => `/onboarding?source=${source}&position=${position}`;

export const metadata: Metadata = {
  title: "ITパスポートをAIで勉強する方法｜ChatGPTだけで十分？【2026年】",
  description:
    "ITパスポート学習でAIをどう使うと効率的かを解説。ChatGPTでの質問、誤答分析、類題作成の使い分けと、AI学習アプリで弱点管理・復習までつなげる方法を紹介します。",
  keywords: [
    "ITパスポート AI 勉強",
    "ITパスポート ChatGPT",
    "ITパスポート AI 学習",
    "ITパスポート 勉強法",
    "ITパスポート AI アプリ",
    "ITパスポート 弱点分析",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポートをAIで勉強する方法｜ChatGPTだけで十分？",
    description: "AIを答え合わせではなく、理解・弱点分析・復習に使う実践ガイド。",
    type: "website",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポートをAIで勉強する方法",
    description: "ChatGPTとAI学習アプリの使い分けを解説。",
  },
};

const useCases = [
  {
    title: "1. 分からない用語を、自分のレベルで説明してもらう",
    text: "参考書の説明が難しいときは、AIに『高校生にも分かる言葉で』『具体例を1つ入れて』と条件を付けて説明させます。理解できなければ、同じ論点を別の角度から聞き直せます。",
    prompt: "例：RTOとRPOの違いを、災害復旧の具体例を使って比較して。",
  },
  {
    title: "2. 間違えた理由を言語化する",
    text: "正解だけを確認するのではなく、自分が選んだ選択肢と考え方をAIへ渡し、『どこで判断を誤ったか』を説明させます。知識不足なのか、似た用語の混同なのかを切り分けやすくなります。",
    prompt: "例：私はBを選びました。Bを選びやすい誤解と、正解Cとの違いを説明して。",
  },
  {
    title: "3. 似た概念を比較表にする",
    text: "ITパスポートでは、似た意味の用語を区別できるかが重要です。単語を1つずつ覚えるより、違い・目的・具体例を横並びにして整理すると記憶に残りやすくなります。",
    prompt: "例：CRM、SFA、ERPを『目的・利用者・具体例』の3列で比較して。",
  },
  {
    title: "4. 条件を変えた類題で再テストする",
    text: "同じ問題を繰り返すと、答えそのものを覚えてしまうことがあります。理解確認には、同じ論点で状況や選択肢を変えた問題を作らせ、説明なしで解いてみる方法が有効です。",
    prompt: "例：この論点を確認する4択問題を1問作って。答えは私が回答するまで出さないで。",
  },
];

const pitfalls = [
  ["AIに答えだけ聞く", "その場では速いものの、次の問題で再現できる理解につながりにくい。"],
  ["AIの説明を無条件で信じる", "生成AIは誤った説明をする可能性があるため、重要事項は公式シラバスや信頼できる教材で確認する。"],
  ["毎回ゼロから質問する", "会話は便利でも、弱点や復習期限を自分で管理しないと学習全体が断片化しやすい。"],
  ["問題生成だけを増やす", "問題数より、どの論点が未定着なのかを把握して再学習する方が重要。"],
];

const faq = [
  {
    q: "ChatGPTだけでITパスポート対策はできますか？",
    a: "説明、比較、誤答分析、類題作成には有効です。ただし試験範囲の管理、学習履歴、復習タイミング、本番形式の演習まで含めると、教材や学習管理ツールを併用した方が抜け漏れを防ぎやすくなります。",
  },
  {
    q: "AIが作った問題だけ解けば合格できますか？",
    a: "おすすめしません。AI生成問題には品質のばらつきがあり得ます。公式の出題範囲を基準にし、過去問や検証済み問題を軸に、AIは理解補助や類題作成へ使うのが安全です。",
  },
  {
    q: "AI学習で一番効果が出やすい使い方は？",
    a: "間違えた直後の『なぜ間違えたか』の言語化と、別問題での再確認です。正解を知るだけで終わらず、弱点を特定して次の学習へつなげることが重要です。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "ITパスポートをAIで勉強する方法｜ChatGPTだけで十分？【2026年】",
      description: metadata.description,
      url: pageUrl,
      inLanguage: "ja-JP",
      datePublished: "2026-09-02",
      dateModified: "2026-09-02",
      publisher: { "@type": "Organization", name: "it-learning-app" },
    },
    {
      "@type": "SoftwareApplication",
      name: "it-learning-app",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description: "ITパスポート学習の現在地・弱点・復習を整理し、次に学ぶ内容を提案する学習支援Webアプリ。",
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

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-bold text-blue-700">it-learning-app</Link>
          <Link href={cta("header")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-5xl px-5 py-12">
        <p className="text-sm font-bold text-blue-700">2026年9月2日更新｜AI学習ガイド</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight md:text-5xl">
          ITパスポートを<span className="text-blue-700">AIで勉強する方法</span><br />ChatGPTだけで十分？
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
          AIを使えば、分からない用語をすぐ質問し、間違えた理由を整理し、類題まで作れます。ただし、AIに答えを聞くだけでは学習は効率化しません。重要なのは、AIを「理解 → 弱点発見 → 復習 → 再テスト」の流れに組み込むことです。
        </p>

        <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <p className="font-bold">先に結論</p>
          <p className="mt-2 leading-7">
            ChatGPTなどの生成AIは「その場の質問」に強く、学習アプリは「何を、いつ、どれだけ復習するか」の管理に強みがあります。どちらか一方ではなく、役割を分けると使いやすくなります。
          </p>
        </div>

        <Link href={cta("hero")} className="mt-8 block rounded-xl bg-blue-600 px-6 py-4 text-center text-lg font-bold text-white">
          AIで弱点を整理して、自分専用の学習計画を作る →
        </Link>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">ITパスポート学習でAIが役立つ4つの場面</h2>
          <p className="mt-3 leading-7 text-slate-600">
            AIの価値は、検索の代わりだけではありません。理解が止まった瞬間や、間違いの原因が分からない瞬間に使うと効果を出しやすくなります。
          </p>
          <div className="mt-6 space-y-5">
            {useCases.map((x) => (
              <div key={x.title} className="rounded-2xl border bg-white p-6 md:p-7">
                <h3 className="text-lg font-bold">{x.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{x.text}</p>
                <div className="mt-4 rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-700">{x.prompt}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">ChatGPTとAI学習アプリは何が違う？</h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-slate-100">
                <tr><th className="p-4">役割</th><th className="p-4">ChatGPTなどの生成AI</th><th className="p-4">AI学習アプリ</th></tr>
              </thead>
              <tbody className="divide-y">
                <tr><td className="p-4 font-bold">質問・説明</td><td className="p-4 text-slate-600">得意</td><td className="p-4 text-slate-600">教材設計による</td></tr>
                <tr><td className="p-4 font-bold">用語比較</td><td className="p-4 text-slate-600">自由に条件指定できる</td><td className="p-4 text-slate-600">機能があれば利用可能</td></tr>
                <tr><td className="p-4 font-bold">弱点の蓄積</td><td className="p-4 text-slate-600">自分で管理が必要</td><td className="p-4 text-slate-600">解答履歴から管理しやすい</td></tr>
                <tr><td className="p-4 font-bold">復習タイミング</td><td className="p-4 text-slate-600">自分で指示・記録する</td><td className="p-4 text-slate-600">学習履歴から提示しやすい</td></tr>
                <tr><td className="p-4 font-bold">試験日から逆算</td><td className="p-4 text-slate-600">条件を毎回伝える必要がある</td><td className="p-4 text-slate-600">学習計画として継続管理しやすい</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14 rounded-2xl bg-slate-900 p-8 text-white">
          <p className="text-sm font-bold text-blue-300">AIを使っても伸びない人の共通点</p>
          <h2 className="mt-2 text-2xl font-bold">「質問できる」だけでは、次に何を勉強するかは決まらない</h2>
          <p className="mt-4 leading-8 text-slate-200">
            生成AIとの会話は便利ですが、昨日間違えた論点、今日復習すべきテーマ、試験日までに不足している分野を毎回自分で整理すると負荷が残ります。it-learning-appでは、学習データを使って「次に何をするか」を整理することを重視しています。
          </p>
          <Link href={cta("mid")} className="mt-6 block rounded-xl bg-white px-6 py-4 text-center font-bold text-slate-900">
            無料で弱点から次の学習を決める →
          </Link>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">AI学習で避けたい4つの使い方</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {pitfalls.map(([title, text]) => (
              <div key={title} className="rounded-2xl border bg-white p-6">
                <h3 className="font-bold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">おすすめのAI学習ループ</h2>
          <ol className="mt-6 space-y-4">
            {[
              ["1. まず問題を解く", "AIに先に答えを聞かず、自分の理解で回答します。"],
              ["2. 誤答・迷った問題を拾う", "不正解だけでなく、偶然当たった問題も弱点候補にします。"],
              ["3. AIで原因を言語化する", "知識不足、混同、問題文の読み違いなど、間違い方を切り分けます。"],
              ["4. 必要な範囲だけ復習する", "参考書や信頼できる教材へ戻り、弱点論点を確認します。"],
              ["5. 別問題で再テストする", "同じ答えを暗記していないか、条件を変えた問題で確認します。"],
              ["6. 未定着なら学習計画へ戻す", "一度で覚えられない論点は、後日の復習対象として残します。"],
            ].map(([h, p]) => (
              <li key={h} className="rounded-xl border bg-white p-5">
                <h3 className="font-bold">{h}</h3>
                <p className="mt-2 text-slate-600">{p}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">よくある質問</h2>
          <div className="mt-6 space-y-4">
            {faq.map((x) => (
              <div key={x.q} className="rounded-xl border bg-white p-6">
                <h3 className="font-bold">Q. {x.q}</h3>
                <p className="mt-3 leading-7 text-slate-600">{x.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-3xl bg-blue-600 p-8 text-center text-white">
          <p className="text-sm font-bold text-blue-100">AIを「質問相手」から「学習ループ」へ</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">今日やるべき勉強を、弱点から決める。</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-blue-100">
            it-learning-appは、問題演習の結果から現在地と弱点を整理し、復習・再測定までをつなげるITパスポート学習支援アプリです。AIを使うなら、単発の質問で終わらせず、合格までの学習計画に組み込みましょう。
          </p>
          <Link href={cta("bottom")} className="mt-6 inline-block rounded-xl bg-white px-7 py-4 font-bold text-blue-700">
            無料で自分専用の学習計画を作る →
          </Link>
        </section>

        <footer className="mt-12 border-t pt-6 text-sm leading-6 text-slate-500">
          <p>※生成AIの回答には誤りが含まれる可能性があります。試験範囲・用語・制度に関する重要事項は、IPA公式情報や信頼できる教材で確認してください。</p>
        </footer>
      </article>
    </main>
  );
}
