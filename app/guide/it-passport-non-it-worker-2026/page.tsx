import type { Metadata } from "next";
import Link from "next/link";

const title = "非IT職でもITパスポートに受かる？社会人向け最短学習ガイド【2026年】";
const description = "非IT職・IT未経験の社会人でもITパスポートは狙える？最新の合格率データを踏まえ、仕事をしながら無駄なく学ぶための現在地測定・弱点学習・復習の進め方を解説します。";
const path = "/guide/it-passport-non-it-worker-2026";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["ITパスポート 非IT", "ITパスポート 社会人", "ITパスポート IT未経験", "ITパスポート 独学 社会人", "ITパスポート 勉強法", "ITパスポート AI 学習"],
  alternates: { canonical: path },
  openGraph: { title, description, type: "article", url: path },
  twitter: { card: "summary_large_image", title, description },
};

const cta = (placement: string) => `/onboarding?source=non-it-worker-2026&placement=${placement}`;

const faq = [
  { q: "非IT職でもITパスポートに合格できますか？", a: "十分に狙えます。令和7年度のIPA公表データでは、非IT系企業等に勤務する社会人の合格率は51.4%でした。IT経験の有無だけで合否が決まる試験ではありません。" },
  { q: "社会人は何から勉強すべきですか？", a: "最初から全範囲を同じ濃さで読むより、まず初見問題で現在地を測り、知らない範囲と間違えやすい範囲を特定してから学習量を配分する方法があります。" },
  { q: "生成AIはITパスポート学習に使えますか？", a: "用語の言い換え、似た概念の比較、誤答理由の整理には有効です。ただし出題範囲、問題演習、弱点や復習の管理と組み合わせて使うことが重要です。" },
];

const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="font-black text-blue-700">it-learning-app</span>
          <Link href={cta("header")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">無料で現在地を測る</Link>
        </div>
      </header>

      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16 md:py-24">
          <p className="font-bold text-blue-700">非IT職・IT未経験の社会人へ</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">IT未経験だから、<br />全部勉強する必要はない。</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600">ITパスポートはテクノロジだけの試験ではありません。経営・法務・マネジメントなど、仕事で既に触れている知識も出題されます。だから最初にやるべきことは、参考書の1ページ目ではなく「自分がもう知っている範囲」を見つけることです。</p>
          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <p className="text-sm font-bold text-blue-700">令和7年度 IPA公表データ</p>
            <p className="mt-2 text-3xl font-black">非IT系社会人の合格率 51.4%</p>
            <p className="mt-2 text-slate-600">IT実務経験がなくても、十分に合格を狙える試験です。</p>
          </div>
          <Link href={cta("hero")} className="mt-8 inline-block rounded-xl bg-blue-600 px-7 py-4 font-bold text-white">無料で自分の現在地を確認する →</Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-3xl font-black">社会人が最初から全範囲を読むと、時間を使いすぎる</h2>
        <p className="mt-4 max-w-3xl leading-8 text-slate-600">たとえば会社で契約、会計、マーケティング、プロジェクト管理、情報セキュリティ研修に触れていれば、それらはゼロからの学習ではありません。一方、ネットワークやデータベースなど馴染みのない領域には時間が必要です。重要なのは「IT未経験」という一つのラベルではなく、テーマごとの現在地です。</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[["知っている", "問題で確認し、解けるなら学習時間を圧縮する。"], ["曖昧", "必要な解説だけ読み、別問題で理解を確認する。"], ["知らない", "基礎から学び、問題演習と復習に時間を配分する。"]].map(([h,p]) => <div key={h} className="rounded-2xl border bg-white p-6"><h3 className="text-xl font-black text-blue-700">{h}</h3><p className="mt-3 leading-7 text-slate-600">{p}</p></div>)}
        </div>
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="text-3xl font-black">仕事をしながら進める4ステップ</h2>
          <div className="mt-8 space-y-4">
            {[["1", "初見問題で現在地を測る", "まず問題を解き、得意・不得意を可視化します。点数だけでなく、どのテーマで迷ったかを見ます。"], ["2", "弱点だけインプットする", "理解済みの章を繰り返し読むのではなく、誤答につながった知識へ時間を使います。"], ["3", "別問題で再測定する", "解説を読んで分かった状態と、自力で解ける状態は別です。別問題で定着を確認します。"], ["4", "次にやることを更新する", "残った弱点と試験日までの日数から、次の学習を決めます。"]].map(([n,h,p]) => <div key={n} className="flex gap-5 rounded-2xl border p-6"><span className="text-3xl font-black text-blue-600">{n}</span><div><h3 className="text-xl font-black">{h}</h3><p className="mt-2 leading-7 text-slate-600">{p}</p></div></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="rounded-3xl bg-slate-900 p-8 text-white md:p-10">
          <p className="font-bold text-blue-300">it-learning-app</p>
          <h2 className="mt-2 text-3xl font-black">「今日は何を勉強する？」を毎回考えない。</h2>
          <p className="mt-4 max-w-3xl leading-8 text-slate-300">it-learning-appは、問題結果から現在地を捉え、弱点・復習・再測定をつないで次の学習を決めることを目指したITパスポート学習支援アプリです。仕事で時間が限られる人ほど、勉強時間を増やす前に「何をやらないか」を決めることが重要です。</p>
          <Link href={cta("mid")} className="mt-6 inline-block rounded-xl bg-white px-7 py-4 font-bold text-slate-900">無料で弱点から学習を始める →</Link>
        </div>
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="text-3xl font-black">生成AIは「分からない」を短くするために使う</h2>
          <p className="mt-4 max-w-3xl leading-8 text-slate-600">知らないIT用語に出会ったら、生成AIに「営業職の例で説明して」「CRMとの違いを表にして」のように、自分の仕事へ置き換えて説明させると理解を助けられます。ただし、何を間違えたか、いつ復習するか、試験日までに何が足りないかは継続して管理する必要があります。AIで理解を助け、学習履歴で次の行動を決める。この役割分担が実践的です。</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16">
        <h2 className="text-3xl font-black">よくある質問</h2>
        <div className="mt-7 space-y-4">{faq.map(({q,a}) => <details key={q} className="rounded-2xl border bg-white p-5"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-3 leading-7 text-slate-600">{a}</p></details>)}</div>
        <div className="mt-12 rounded-3xl bg-blue-50 p-8 text-center">
          <h2 className="text-3xl font-black">まず、あなたが「もう知っていること」を測る。</h2>
          <p className="mt-3 text-slate-600">現在地から、必要な学習だけに絞ります。</p>
          <Link href={cta("bottom")} className="mt-6 inline-block rounded-xl bg-blue-600 px-7 py-4 font-bold text-white">無料で自分専用の学習計画を作る →</Link>
        </div>
      </section>
    </main>
  );
}
