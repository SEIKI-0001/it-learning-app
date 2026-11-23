import type { Metadata } from "next";
import Link from "next/link";

const title =
  "ITパスポートは2週間で間に合う？試験直前の勉強計画を初心者向けに解説";
const description =
  "ITパスポート試験まで残り2週間の初心者向けに、優先順位、14日間の学習計画、過去問の使い方、直前期に避けたい勉強法を解説します。AIで今日の学習内容を整理する方法も紹介。";
const canonical =
  "https://it-learning-app.vercel.app/blog/it-passport-two-weeks-study-plan-2026";
const published = "2026-07-14";

export const metadata: Metadata = {
  title: `${title} | ITパスポート学習コーチ`,
  description,
  alternates: { canonical },
  keywords: [
    "ITパスポート 2週間",
    "ITパスポート 間に合う",
    "ITパスポート 直前",
    "ITパスポート 勉強計画",
    "ITパスポート 独学",
    "ITパスポート AI",
  ],
  openGraph: {
    title,
    description,
    type: "article",
    url: canonical,
    siteName: "ITパスポート学習コーチ",
    locale: "ja_JP",
    publishedTime: published,
    modifiedTime: published,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: title,
  description,
  datePublished: published,
  dateModified: published,
  author: {
    "@type": "Organization",
    name: "ITパスポート学習コーチ編集部",
  },
  publisher: {
    "@type": "Organization",
    name: "ITパスポート学習コーチ",
  },
  mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  url: canonical,
};

const schedule = [
  {
    days: "1〜2日目",
    focus: "現在地を確認する",
    action:
      "分野別の確認問題を少量解き、ストラテジ・マネジメント・テクノロジのどこで失点しているかを把握します。点数ではなく、知らない用語と説明できないテーマを洗い出します。",
  },
  {
    days: "3〜6日目",
    focus: "弱点分野を集中して学ぶ",
    action:
      "参考書を最初から読み直さず、弱点テーマだけを学び直します。1テーマごとに短い確認問題を解き、理解できたかをその日のうちに判定します。",
  },
  {
    days: "7日目",
    focus: "中間チェックをする",
    action:
      "複数分野が混ざった問題を解き、前半6日間の学習が得点につながっているかを確認します。改善が見られない分野は、残り1週間の最優先対象にします。",
  },
  {
    days: "8〜11日目",
    focus: "過去問レベルで使える知識にする",
    action:
      "本試験に近い問題で演習し、誤答を『知識不足』『読み違い』『選択肢の比較不足』に分類します。誤答理由ごとに復習内容を変えます。",
  },
  {
    days: "12〜13日目",
    focus: "苦手だけを再確認する",
    action:
      "新しい教材には手を出さず、間違えた問題、覚えにくい略語、説明できないテーマだけに絞って復習します。",
  },
  {
    days: "14日目",
    focus: "最終確認と試験準備",
    action:
      "短い確認にとどめ、睡眠と当日の準備を優先します。直前に大量の問題を解いて不安を増やさないことも重要です。",
  },
];

const priorities = [
  {
    title: "1. 全範囲を完璧にしようとしない",
    body: "2週間では、すべてを同じ深さで学ぶより、得点につながりやすい基礎と自分の弱点に時間を集中させるほうが現実的です。",
  },
  {
    title: "2. 読む時間より確認する時間を増やす",
    body: "参考書を読んだだけでは、理解できたか判断できません。短い確認問題を挟み、説明できないテーマを復習対象にします。",
  },
  {
    title: "3. 毎日やることを前日に決めない",
    body: "直前期は迷う時間が損失になります。残り日数と弱点から、その日の学習内容を自動的に決められる状態を作ります。",
  },
];

export default function ItPassportTwoWeeksStudyPlanPage() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/blog" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b75a6] text-sm font-black text-white">
              IP
            </span>
            <span className="text-sm font-black text-[#12384d] sm:text-base">
              ITパスポート学習ガイド
            </span>
          </Link>
          <Link
            href="/onboarding"
            className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white"
          >
            無料で学習計画を作る
          </Link>
        </div>
      </header>

      <section className="bg-white px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div>
            <p className="inline-flex rounded-full bg-[#fff2cc] px-3 py-1 text-xs font-bold text-[#9a6400]">
              試験直前の勉強法
            </p>
            <h1 className="mt-5 max-w-4xl text-[32px] font-black leading-[1.22] text-[#12384d] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
              2週間で合格を保証することはできません。ただし、残り時間を全範囲の読み直しに使うのではなく、現在地の確認、弱点学習、過去問レベル演習、直前復習の順に絞れば、得点を伸ばせる余地はあります。
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
              <span>公開日：2026-07-14</span>
              <span>読了目安：8分</span>
              <span>対象：試験まで残り約2週間の初心者</span>
            </div>
          </div>

          <aside className="rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
            <p className="text-sm font-black text-[#12384d]">リード獲得設計</p>
            <dl className="mt-4 space-y-4 text-sm leading-7 text-slate-700">
              <div>
                <dt className="font-black text-[#12384d]">SEOキーワード</dt>
                <dd>ITパスポート 2週間 / 直前 / 間に合う / 勉強計画</dd>
              </div>
              <div>
                <dt className="font-black text-[#12384d]">想定読者</dt>
                <dd>受験日が近いのに、何を優先すべきか決められない独学初心者</dd>
              </div>
              <div>
                <dt className="font-black text-[#12384d]">訴求軸</dt>
                <dd>残り日数と弱点から、今日やることを絞る</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,760px)_300px] lg:items-start">
        <article className="min-w-0 rounded-[22px] bg-white p-5 shadow-[0_14px_34px_rgba(22,94,131,0.08)] sm:p-8">
          <section className="rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
            <p className="text-lg font-black text-[#12384d]">この記事の結論</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700 sm:text-base">
              <li>・最初の2日で弱点を特定し、全範囲の読み直しを避ける。</li>
              <li>・学習直後に確認問題を解き、分かったつもりを減らす。</li>
              <li>・最後の3日間は新しい知識より、誤答と苦手の復習を優先する。</li>
            </ul>
          </section>

          <div className="mt-9 space-y-7 text-base leading-8 text-slate-700 sm:text-[17px] [&_h2]:mt-12 [&_h2]:border-l-[7px] [&_h2]:border-[#1b75a6] [&_h2]:bg-[#eef8fd] [&_h2]:px-4 [&_h2]:py-3 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:leading-snug [&_h2]:text-[#12384d] [&_h3]:text-xl [&_h3]:font-black [&_h3]:text-[#12384d]">
            <h2>ITパスポートは2週間で間に合うのか</h2>
            <p>
              答えは、現在の知識量と1日に使える時間によって変わります。IT用語に触れた経験がある人と、初めて学ぶ人では必要な学習量が異なるためです。
            </p>
            <p>
              ただし、残り2週間で最も避けたいのは、焦って教材を増やすことです。短期間では「何をやらないか」を決め、弱点の改善に集中する必要があります。
            </p>

            <h2>直前2週間で優先すべき3つのこと</h2>
            <div className="grid gap-4">
              {priorities.map((priority) => (
                <section
                  key={priority.title}
                  className="rounded-[16px] border border-[#d7edf7] p-5"
                >
                  <h3>{priority.title}</h3>
                  <p className="mt-3">{priority.body}</p>
                </section>
              ))}
            </div>

            <div className="rounded-[20px] bg-[#12384d] p-6 text-white sm:p-7">
              <p className="text-sm font-bold text-[#bfe8f8]">直前期の最短ルート</p>
              <p className="mt-3 text-2xl font-black leading-snug">
                試験日と学習時間を入力し、今日やる弱点学習を先に決める。
              </p>
              <p className="mt-4 text-sm leading-7 text-[#e6f6fc]">
                it-learning-appでは、残り日数と使える時間をもとに、今日の学習内容を整理できます。
              </p>
              <Link
                href="/onboarding"
                className="mt-6 inline-flex w-full justify-center rounded-full bg-[#f7a600] px-6 py-4 text-sm font-black text-white transition hover:bg-[#d98f00] sm:w-auto"
              >
                無料で2週間の学習計画を作る
              </Link>
            </div>

            <h2>14日間の学習スケジュール例</h2>
            <p>
              次の計画は、短期間で優先順位を付けるための基本形です。学習時間が少ない日は、問題数を減らしても「確認と復習」を省かないようにします。
            </p>
            <div className="space-y-4">
              {schedule.map((item) => (
                <section
                  key={item.days}
                  className="rounded-[18px] border border-[#cfe5f2] bg-[#fbfdff] p-5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3>{item.days}</h3>
                    <span className="w-fit rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-black text-[#1b75a6]">
                      {item.focus}
                    </span>
                  </div>
                  <p className="mt-3">{item.action}</p>
                </section>
              ))}
            </div>

            <h2>2週間しかないときに避けたい勉強法</h2>
            <h3>参考書を最初から丁寧に読み直す</h3>
            <p>
              すでに知っている範囲にも時間を使うため、弱点改善が遅れます。確認問題で現在地を調べ、必要な章だけに戻るほうが効率的です。
            </p>
            <h3>問題数だけを増やす</h3>
            <p>
              誤答理由を確認せずに大量演習をしても、同じ間違いを繰り返します。問題を解いた後に、なぜ間違えたかを分類してください。
            </p>
            <h3>毎日の計画を細かく作り直す</h3>
            <p>
              直前期に複雑な進捗入力を続けるのは負担になります。学習結果は確認問題で把握し、次にやることだけを更新する設計が適しています。
            </p>

            <h2>AIを使うなら「質問」より「学習管理」に使う</h2>
            <p>
              生成AIは用語説明に便利ですが、単発で質問するだけでは、試験日までの優先順位や復習タイミングは管理されません。直前期では、残り日数、使える時間、確認問題の結果をつなげて、次の行動を決める使い方が重要です。
            </p>
            <p>
              it-learning-appは、試験日から逆算した計画、今日やる内容、理解度確認、復習対象を一つの流れとして扱います。何を勉強するか迷う時間を減らし、学習そのものに時間を使うための支援ツールです。
            </p>

            <h2>まとめ</h2>
            <p>
              ITパスポート試験まで2週間しかない場合、全範囲を完璧にするのではなく、弱点の特定、短い確認、過去問レベル演習、誤答復習を順番に進める必要があります。
            </p>
            <p>
              最も重要なのは、毎日「次に何をやるか」を迷わないことです。残り期間に合わせた計画を作り、学習結果に応じて優先順位を更新してください。
            </p>
          </div>

          <section className="mt-12 rounded-[24px] bg-[#12384d] p-6 text-white sm:p-9">
            <p className="text-sm font-bold text-[#bfe8f8]">試験日が近い人向け</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">
              残り2週間の「今日やること」を無料で整理する
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#e6f6fc] sm:text-base">
              試験日、平日・休日に使える時間、現在の理解度を入力すると、it-learning-appが学習の優先順位を整理します。
            </p>
            <Link
              href="/onboarding"
              className="mt-6 inline-flex w-full justify-center rounded-full bg-[#f7a600] px-6 py-4 text-sm font-black text-white transition hover:bg-[#d98f00] sm:w-auto"
            >
              無料で学習計画を作る
            </Link>
          </section>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-5">
          <section className="rounded-[18px] border border-[#cfe5f2] bg-white p-5">
            <p className="font-black text-[#12384d]">タイトル案</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{title}</p>
          </section>
          <section className="rounded-[18px] border border-[#cfe5f2] bg-white p-5">
            <p className="font-black text-[#12384d]">メタディスクリプション</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{description}</p>
          </section>
          <section className="rounded-[18px] border border-[#cfe5f2] bg-white p-5">
            <p className="font-black text-[#12384d]">CTA</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              残り日数と使える時間から、今日の学習内容を無料で作成する。
            </p>
            <Link
              href="/onboarding"
              className="mt-4 inline-flex w-full justify-center rounded-full bg-[#1b75a6] px-5 py-3 text-sm font-black text-white"
            >
              学習計画を作る
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
