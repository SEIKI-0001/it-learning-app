import type { Metadata } from "next";
import Link from "next/link";

const title = "ITパスポートの過去問は何年分やるべき？おすすめの順番と復習法【2026年版】";
const description =
  "ITパスポートの過去問は何年分やればいい？2026年受験者向けに、まず何年分から始めるか、古い問題の扱い方、復習の優先順位、AIを使った弱点対策まで解説します。";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "ITパスポート 過去問 何年分",
    "ITパスポート 過去問 何年",
    "ITパスポート 過去問 勉強法",
    "ITパスポート 過去問 おすすめ",
    "ITパスポート 2026",
    "ITパスポート AI 学習",
  ],
  alternates: { canonical: "/guide/it-passport-past-exams-how-many-years-2026" },
  openGraph: { title, description, type: "article" },
  twitter: { card: "summary_large_image", title, description },
};

const cta = "/onboarding?source=past-exams-how-many-years-2026";

const steps = [
  {
    title: "1. まず最新年度を1回分解く",
    body: "最初から古い年度を大量に解く必要はありません。まず2026年度など新しい公開問題を1回分解き、ストラテジ・マネジメント・テクノロジのどこで失点しているかを確認します。ここでは点数よりも『何が分からなかったか』を記録することが重要です。",
  },
  {
    title: "2. 次に直近3年分を優先する",
    body: "学習時間が限られているなら、まず直近3年分を優先するのがおすすめです。新しい用語や現在のシラバスに近いテーマを確認しやすく、同じ分野で繰り返し間違える弱点も見つけやすくなります。",
  },
  {
    title: "3. 3年分で弱点が残るなら5年分まで広げる",
    body: "直近3年分を解いても正答が安定しないテーマがある場合は、5年分程度まで広げて演習量を増やします。ネットワーク、セキュリティ、データベース、会計など、苦手分野だけ古い年度から追加して解く方法でも十分です。",
  },
  {
    title: "4. 古い問題は『全部覚える教材』にしない",
    body: "IPAは2009年度まで遡って過去問題を公開していますが、古い問題ほど現在の制度・用語・シラバスと差がある可能性があります。古い問題は知識量を増やすためではなく、考え方や定番テーマの反復用として使い、最新範囲の確認は現行シラバスを基準にします。",
  },
  {
    title: "5. 間違えた問題を『理由』で分類する",
    body: "過去問は正解数だけを記録すると学習効果が下がります。『用語を知らなかった』『2つの選択肢を区別できなかった』『計算手順を忘れた』『問題文を読み違えた』のように誤答理由を分類すると、次に何を復習すべきかが明確になります。",
  },
  {
    title: "6. AIは誤答のピンポイント解説に使う",
    body: "生成AIは、間違えたテーマを初心者向けに言い換えたり、似た用語を比較したりする用途に向いています。『公開鍵暗号と共通鍵暗号の違いを具体例で説明して』のように、一問の誤答から理解不足の原因を掘り下げる使い方が効果的です。制度や公式範囲はIPAの一次情報で確認してください。",
  },
  {
    title: "7. 最後は別年度で再判定する",
    body: "復習後に同じ問題だけを解くと、答えを覚えて正解しただけなのか判断できません。別年度の同テーマ問題を解き、初見でも正解できるかを確認します。正答率ではなく『弱点が再現しなくなったか』を仕上がりの基準にしてください。",
  },
];

export default function Page() {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    datePublished: "2026-08-13",
    dateModified: "2026-08-13",
    mainEntityOfPage: "/guide/it-passport-past-exams-how-many-years-2026",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "ITパスポートの過去問は何年分やればいいですか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "まず直近3年分を優先し、弱点が残る場合は5年分程度まで広げる方法がおすすめです。年数そのものより、誤答理由を確認して別年度で再び解ける状態にすることが重要です。",
        },
      },
      {
        "@type": "Question",
        name: "ITパスポートの古い過去問も解くべきですか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "定番テーマの演習には使えますが、古い問題ほど現在のシラバスと差がある可能性があります。最新範囲の確認は現行シラバスを基準にし、古い問題は補助演習として使うのがおすすめです。",
        },
      },
      {
        "@type": "Question",
        name: "過去問は何周すればいいですか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "周回数よりも、間違えた理由を説明できるか、別年度の同じテーマを初見で解けるかを基準にしてください。同じ問題を繰り返して答えだけ覚える状態は避けましょう。",
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <p className="mb-4 text-sm font-semibold text-blue-700">2026年8月13日更新｜過去問の使い方</p>
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
          ITパスポートの過去問は何年分やるべき？
          <span className="mt-2 block text-2xl text-slate-600 sm:text-3xl">おすすめの順番と復習法【2026年版】</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-700">
          「過去問は3年分でいい？」「10年分やった方が安心？」と迷う人は多いですが、重要なのは年数を増やすことではありません。最新年度から現在地を測り、弱点がなくなるまで必要な分だけ過去問を追加する方が効率的です。
        </p>

        <div className="mt-8 rounded-3xl bg-slate-900 p-7 text-white sm:p-8">
          <p className="text-sm font-semibold text-sky-300">過去問を「解いた数」で終わらせない。</p>
          <p className="mt-2 text-2xl font-bold">誤答から、次にやるべき学習を決める</p>
          <p className="mt-3 leading-7 text-slate-300">
            it-learning-appなら、試験日と学習状況をもとに、問題演習から弱点復習までの学習計画を整理できます。
          </p>
          <Link href={`${cta}&position=hero`} className="mt-5 inline-block rounded-xl bg-white px-5 py-3 font-bold text-slate-900">
            無料で自分専用の学習計画を作る
          </Link>
        </div>

        <section className="mt-12 rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-xl font-bold">結論：まず直近3年分。必要なら5年分まで広げる</h2>
          <p className="mt-4 leading-8 text-slate-700">
            初学者なら、最初から10年分を解くより「最新1年分で現在地確認 → 直近3年分で弱点発見 → 弱点が残る場合だけ5年分まで追加」という順番がおすすめです。IPAは2026年度・2025年度・2024年度を含む過去問題と解答例を公開しています。
          </p>
          <a
            className="mt-3 inline-block font-semibold text-blue-700 underline"
            href="https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/questions.html"
            target="_blank"
            rel="noreferrer"
          >
            IPA公式：ITパスポート過去問題を確認する
          </a>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">過去問はこの7ステップで使う</h2>
          <div className="mt-6 space-y-5">
            {steps.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-3 leading-8 text-slate-700">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">学習状況別：何年分やるかの目安</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {[
              ["学習開始直後", "最新1年分", "点数を気にせず、3分野の弱点を把握する"],
              ["基礎学習中", "直近3年分", "頻出テーマと繰り返す誤答を確認する"],
              ["弱点が多い", "3〜5年分", "苦手分野だけ追加演習する"],
              ["試験直前", "別年度1回分", "120分を意識して初見対応力を確認する"],
            ].map(([state, years, purpose]) => (
              <div key={state} className="grid gap-2 border-b border-slate-200 p-5 last:border-b-0 sm:grid-cols-[120px_120px_1fr]">
                <p className="font-bold">{state}</p>
                <p className="font-semibold text-blue-700">{years}</p>
                <p className="text-sm leading-6 text-slate-600">{purpose}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            ※上記は学習方法の目安であり、合格を保証する年数ではありません。現在の理解度や試験までの期間に応じて調整してください。
          </p>
        </section>

        <section className="mt-12 rounded-3xl border border-emerald-200 bg-emerald-50 p-7 sm:p-8">
          <p className="text-sm font-bold text-emerald-700">「何年分やるか」より重要なこと</p>
          <h2 className="mt-2 text-2xl font-bold">間違いが減る学習ループを作る</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {["過去問を解く", "誤答理由を分類", "弱点だけ復習", "別問題で再判定"].map((item, index) => (
              <div key={item} className="rounded-xl bg-white p-4 text-center shadow-sm">
                <p className="text-xs font-bold text-emerald-700">STEP {index + 1}</p>
                <p className="mt-1 font-bold">{item}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 leading-8 text-slate-700">
            この4つを繰り返せば、過去問の消化数ではなく「本番で使える理解」が増えていきます。it-learning-appは、この弱点ベースの学習を毎日の計画につなげるための学習支援アプリです。
          </p>
          <Link href={`${cta}&position=mid`} className="mt-5 inline-block rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">
            無料で弱点ベースの学習計画を作る
          </Link>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">古い過去問を解くときの注意点</h2>
          <p className="mt-4 leading-8 text-slate-700">
            IPAの公開ページには2009年度までの問題があります。演習量を増やせる一方で、IT分野は制度・技術・用語が変化します。古い問題で見慣れない制度や用語が出た場合、丸暗記する前に現行シラバスに含まれる内容か確認してください。
          </p>
          <p className="mt-4 leading-8 text-slate-700">
            特に試験直前は、古い問題を大量に追加するより、直近年度で間違えたテーマを復習して、別年度で再確認する方が優先度は高くなります。
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">よくある質問</h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold">Q. 過去問だけで合格できますか？</h3>
              <p className="mt-2 leading-7 text-slate-700">過去問は重要ですが、問題を解いて分からなかったテーマを教材や解説へ戻って理解する工程も必要です。過去問は知識確認と弱点発見の中心に置くのがおすすめです。</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold">Q. 同じ過去問を何周もしてもいい？</h3>
              <p className="mt-2 leading-7 text-slate-700">復習には有効ですが、答えを暗記しているだけかを区別するため、最後は別年度の問題で確認してください。</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold">Q. 2026年度の公開問題はありますか？</h3>
              <p className="mt-2 leading-7 text-slate-700">はい。IPAは令和8年度（2026年度）のITパスポート公開問題と解答例を掲載しています。</p>
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-3xl bg-slate-900 p-7 text-white sm:p-9">
          <p className="text-sm font-bold text-sky-300">過去問を解いた後の「次」を自動で整理</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">自分専用のITパスポート学習計画を作る</h2>
          <p className="mt-4 leading-8 text-slate-300">
            試験日、学習可能時間、理解度をもとに、今日やるべき学習を整理。過去問で見つかった弱点を放置せず、復習と再演習につなげます。
          </p>
          <Link href={`${cta}&position=bottom`} className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-bold text-slate-900">
            無料で自分専用の学習計画を作る
          </Link>
        </section>
      </article>
    </main>
  );
}
