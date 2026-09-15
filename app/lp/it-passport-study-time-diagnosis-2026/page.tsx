import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/lp/it-passport-study-time-diagnosis-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const cta = "/onboarding?source=study-time-diagnosis-2026";

const title = "ITパスポートの勉強時間は何時間？あなた向け学習量の決め方【2026年版】";
const description = "ITパスポートに必要な勉強時間は一律ではありません。IT経験、試験までの日数、苦手分野から自分に必要な学習量を決める方法を解説。無料で自分専用の学習計画も作れます。";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["ITパスポート 勉強時間", "ITパスポート 何時間", "ITパスポート 勉強期間", "ITパスポート 初心者 勉強時間", "ITパスポート 学習計画", "ITパスポート AI 学習"],
  alternates: { canonical: pageUrl },
  openGraph: { title, description, type: "website", url: pageUrl, siteName: "it-learning-app", locale: "ja_JP" },
  twitter: { card: "summary_large_image", title, description },
};

const patterns = [
  { label: "IT用語にほぼ触れたことがない", action: "まず3分野を一通り学び、早めに問題演習へ。最初から時間数を固定せず、誤答が多い分野へ時間を再配分します。" },
  { label: "仕事や学校でITの基礎に触れている", action: "知っている範囲の読み直しを減らし、問題演習で知識の穴を特定。ストラテジ・マネジメントも忘れず確認します。" },
  { label: "すでに一度勉強した・受験経験がある", action: "教材の最初からやり直すより、100問規模の演習から開始。間違えたテーマを中心に復習します。" },
];

export default function Page() {
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "ITパスポート合格には何時間勉強すればいいですか？", acceptedAnswer: { "@type": "Answer", text: "必要時間はIT経験、現在の理解度、試験日までの期間で変わるため、一律の時間では決まりません。最初に問題演習で現在地を確認し、弱点に応じて学習時間を配分する方法が合理的です。" } },
      { "@type": "Question", name: "IT未経験でもITパスポートを受験できますか？", acceptedAnswer: { "@type": "Answer", text: "ITパスポートは技術系だけでなく事務系の社会人や文系学生なども対象とする試験です。ストラテジ、マネジメント、テクノロジの3分野を幅広く学習します。" } },
      { "@type": "Question", name: "ITパスポートの試験時間と問題数は？", acceptedAnswer: { "@type": "Answer", text: "現行試験は120分・100問の四肢択一式です。総合評価点600点以上に加え、3分野それぞれ300点以上が必要です。" } },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-bold">it-learning-app</Link>
          <Link href={`${cta}&position=header`} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">無料で学習計画を作る</Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-16 text-center">
        <p className="mb-4 text-sm font-bold text-blue-700">ITパスポート学習時間ガイド 2026</p>
        <h1 className="text-4xl font-black leading-tight md:text-5xl">「何時間やれば合格？」より、<br />あなたに必要な学習量を決めよう。</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">ネット上の「○○時間」という数字だけで予定を作ると、知っている範囲に時間を使いすぎたり、苦手分野が残ったりします。必要なのは、現在地と試験日から逆算した学習計画です。</p>
        <Link href={`${cta}&position=hero`} className="mt-8 inline-block rounded-xl bg-blue-700 px-8 py-4 font-bold text-white">無料で自分専用の学習計画を作る</Link>
        <p className="mt-3 text-xs text-slate-500">試験日と学習できる時間から、今日やることを整理</p>
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto max-w-4xl px-5 py-12">
          <h2 className="text-2xl font-black">ITパスポートの勉強時間に「全員共通の正解」はない</h2>
          <p className="mt-5 leading-8 text-slate-700">ITパスポートは120分で100問が出題され、ストラテジ・マネジメント・テクノロジの3分野から幅広く問われます。合格には総合評価点600点以上だけでなく、各分野300点以上が必要です。そのため、得意なテクノロジだけを伸ばすなど、一部の分野に学習時間を偏らせる方法は安全とはいえません。</p>
          <p className="mt-4 leading-8 text-slate-700">一方で、すでに知っている内容を全員が同じ時間だけ勉強する必要もありません。まず問題を解き、「知らない」「混同する」「読み違える」を見つけ、その弱点に時間を使う方が学習量を合理化できます。</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-2xl font-black">あなたはどのスタート地点？</h2>
        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {patterns.map((item) => <div key={item.label} className="rounded-2xl border bg-white p-6"><h3 className="font-bold">{item.label}</h3><p className="mt-4 text-sm leading-7 text-slate-600">{item.action}</p></div>)}
        </div>
      </section>

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-5 py-14">
          <h2 className="text-3xl font-black">時間数ではなく、4つの数字で計画する</h2>
          <ol className="mt-8 space-y-5 text-slate-200">
            <li><strong className="text-white">1. 試験までの日数</strong> — いつ受けるかを先に決めます。</li>
            <li><strong className="text-white">2. 平日・休日に使える時間</strong> — 理想ではなく実際に確保できる時間で考えます。</li>
            <li><strong className="text-white">3. 3分野の理解度</strong> — 問題演習で現在地を確認します。</li>
            <li><strong className="text-white">4. 誤答の変化</strong> — 学習後に同じ弱点が減っているかで計画を更新します。</li>
          </ol>
          <div className="mt-10 rounded-2xl bg-white p-7 text-slate-900">
            <h3 className="text-xl font-black">この計算を毎回自分でやらなくていい。</h3>
            <p className="mt-3 leading-7 text-slate-600">it-learning-appは、試験日と学習可能時間をもとに「今日何をやるか」を整理し、問題演習と復習を学習の流れにつなげます。</p>
            <Link href={`${cta}&position=mid`} className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-bold text-white">自分の学習計画を無料で作る</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-2xl font-black">2026年受験で確認しておきたいこと</h2>
        <p className="mt-5 leading-8 text-slate-700">IPAが公開している現行ITパスポート試験シラバスはVer.6.5です。また、2026年12月28日以降はシステムリプレースに伴う試験休止が予定されています。受験時期を決める際は、必ずIPAの最新案内も確認してください。</p>
        <p className="mt-4 text-sm text-slate-500">※必要な勉強時間や合格を保証するものではありません。学習状況に応じて計画を調整してください。</p>
      </section>

      <section className="bg-blue-50">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h2 className="text-3xl font-black">今日から、合格までの道筋を見える形に。</h2>
          <p className="mt-4 leading-7 text-slate-600">試験日と使える時間を入力して、自分向けの学習計画から始めましょう。</p>
          <Link href={`${cta}&position=bottom`} className="mt-7 inline-block rounded-xl bg-blue-700 px-8 py-4 font-bold text-white">無料で学習計画を作る</Link>
        </div>
      </section>
    </main>
  );
}
