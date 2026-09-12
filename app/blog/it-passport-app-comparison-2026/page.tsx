import type { Metadata } from "next";
import Link from "next/link";

const title = "ITパスポート勉強アプリはどう選ぶ？独学初心者向けに5タイプを比較";
const description = "ITパスポート対策アプリの選び方を、過去問型・動画型・参考書型・AI学習管理型などに分けて比較。初心者が継続しやすい学習環境を整理します。";
const canonical = "https://it-learning-app.vercel.app/blog/it-passport-app-comparison-2026";

export const metadata: Metadata = {
  title: `${title} | ITパスポート学習コーチ`,
  description,
  alternates: { canonical },
  keywords: ["ITパスポート アプリ おすすめ", "ITパスポート 勉強アプリ", "ITパスポート 独学", "ITパスポート 初心者", "ITパスポート AI"],
  openGraph: {
    title,
    description,
    type: "article",
    url: canonical,
    siteName: "ITパスポート学習コーチ",
    locale: "ja_JP",
    publishedTime: "2026-07-07",
    modifiedTime: "2026-07-07",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: title,
  description,
  datePublished: "2026-07-07",
  dateModified: "2026-07-07",
  author: { "@type": "Organization", name: "ITパスポート学習コーチ編集部" },
  publisher: { "@type": "Organization", name: "ITパスポート学習コーチ" },
  mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  url: canonical,
};

const rows = [
  ["過去問演習型", "試験形式に慣れたい人", "問題量を確保しやすい", "初心者は解説を読んでも理解がつながりにくい"],
  ["動画講座型", "最初に全体像をつかみたい人", "流れを理解しやすい", "見ただけで終わりやすく、復習管理は別途必要"],
  ["参考書中心型", "紙でじっくり学びたい人", "体系的に学びやすい", "今日やる範囲や復習タイミングは自分で決める必要がある"],
  ["単語帳・暗記型", "用語を短時間で反復したい人", "スキマ時間に使いやすい", "問題文での使われ方まで理解しにくい"],
  ["AI学習管理型", "独学で迷いやすい初心者", "計画、確認問題、復習、進捗を一体で扱える", "学習行動そのものは必要"],
];

export default function ItPassportAppComparisonPage() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/blog" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b75a6] text-sm font-black text-white">IP</span>
            <span className="text-sm font-black text-[#12384d] sm:text-base">ITパスポート学習ガイド</span>
          </Link>
          <Link href="/onboarding" className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white">無料で学習メニューを作る</Link>
        </div>
      </header>

      <section className="bg-white px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div>
            <p className="inline-flex rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-bold text-[#1b75a6]">比較記事・アプリ選び</p>
            <h1 className="mt-4 max-w-4xl text-[32px] font-black leading-[1.24] text-[#12384d] sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
              ITパスポート対策では、無料の過去問サイト、動画講座、参考書、単語帳アプリなど選択肢が多くあります。ただ、初心者が見るべきなのは「問題数」だけではありません。重要なのは、試験日まで迷わず続けられる学習設計です。
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
              <span>公開日：2026-07-07</span><span>読了目安：7分</span><span>対象：IT未経験・独学者</span>
            </div>
          </div>
          <aside className="rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
            <p className="text-sm font-black text-[#12384d]">SEO設計</p>
            <dl className="mt-4 space-y-4 text-sm leading-7 text-slate-700">
              <div><dt className="font-black text-[#12384d]">主キーワード</dt><dd>ITパスポート アプリ おすすめ</dd></div>
              <div><dt className="font-black text-[#12384d]">想定読者</dt><dd>どのアプリ・教材を選ぶべきか迷っている初心者</dd></div>
              <div><dt className="font-black text-[#12384d]">訴求軸</dt><dd>問題演習だけでなく、計画・復習・継続まで支援するAI学習管理</dd></div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,760px)_300px] lg:items-start">
          <article className="rounded-[22px] bg-white p-5 shadow-[0_14px_34px_rgba(22,94,131,0.08)] sm:p-8">
            <section className="rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
              <p className="text-lg font-black text-[#12384d]">結論</p>
              <p className="mt-4 leading-8 text-slate-700">ITパスポート初心者には、過去問演習だけのアプリよりも、学習計画・理解度確認・復習管理まで一体で扱えるサービスが向いています。参考書を買ったものの止まりがちな人は、AI学習管理型を軸に選ぶと失敗しにくくなります。</p>
            </section>

            <div className="mt-9 space-y-8 text-base text-slate-700 sm:text-[17px] [&_a]:font-bold [&_a]:text-[#1b75a6] [&_a]:underline [&_h2]:mt-10 [&_h2]:border-l-[7px] [&_h2]:border-[#1b75a6] [&_h2]:bg-[#eef8fd] [&_h2]:px-4 [&_h2]:py-3 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-[#12384d] [&_li]:leading-8 [&_p]:leading-8">
              <section>
                <h2>比較すべきポイント</h2>
                <p>ITパスポート試験は、ストラテジ系・マネジメント系・テクノロジ系の3分野から出題されます。公式情報では、試験時間は120分、出題数は100問、四肢択一式です。範囲が広いため、どの分野をどの順番で押さえるかが重要になります。<a href="https://www3.jitec.ipa.go.jp/JitesCbt/html/about/range.html" target="_blank" rel="noreferrer">IPA公式の試験内容・出題範囲</a></p>
                <ul className="mt-5 space-y-3 rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
                  <li>✓ 試験日から逆算して、今日やることが明確になるか</li>
                  <li>✓ 読んだ直後に確認問題で理解度を測れるか</li>
                  <li>✓ 用語暗記、確認問題、過去問レベル演習が分断されていないか</li>
                  <li>✓ 予定が崩れたときに戻りやすい設計になっているか</li>
                </ul>
              </section>

              <section>
                <h2>主要5タイプの比較</h2>
                <div className="mt-5 overflow-hidden rounded-[18px] border border-[#cfe5f2]">
                  {rows.map(([type, fit, strength, weakness]) => (
                    <div key={type} className="grid gap-2 border-t border-[#d7edf7] bg-white p-4 text-sm leading-7 lg:grid-cols-[140px_1fr_1fr_1fr]">
                      <div className="font-black text-[#12384d]">{type}</div>
                      <div>{fit}</div><div>{strength}</div><div>{weakness}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2>過去問型だけで始めると失敗しやすい理由</h2>
                <p>過去問演習は重要です。ただし、最初から過去問だけに寄せると、知らない用語が多すぎて解説を読んでも理解が積み上がらないことがあります。過去問は「知識を作る場所」ではなく、「理解できていない箇所を見つける場所」と考える方が安全です。</p>
              </section>

              <section>
                <h2>it-learning-appの位置づけ</h2>
                <p>it-learning-appは、問題を解くだけのアプリではなく、ITパスポート初心者が独学で迷いやすい部分を支援する学習コーチ型のサービスです。学習計画、今日のメニュー、確認問題、単語帳、進捗可視化を組み合わせて、次にやることを明確にします。</p>
              </section>

              <section className="rounded-[22px] border-2 border-[#f7a600] bg-[#fff8e8] p-6">
                <h2 className="!mt-0 !border-[#f7a600] !bg-white">無料で学習メニューを作る</h2>
                <p>ITパスポート対策で迷っているなら、まずは試験日と学習ペースをもとに、今日やる内容を作ってみてください。参考書、確認問題、単語帳、復習を分断せず、合格までの流れを整理できます。</p>
                <Link href="/onboarding" className="mt-5 inline-flex rounded-full bg-[#f7a600] px-6 py-3 text-sm font-black text-white">it-learning-appで今日の学習メニューを作る</Link>
              </section>
            </div>
          </article>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <div className="rounded-[18px] border border-[#cfe5f2] bg-white p-5 shadow-[0_10px_26px_rgba(22,94,131,0.08)]">
              <p className="text-sm font-black text-[#12384d]">この記事で狙う検索意図</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                <li>・ITパスポートのアプリ選びで迷っている</li>
                <li>・無料/有料よりも続く方法を知りたい</li>
                <li>・AIを使った勉強法に興味がある</li>
              </ul>
            </div>
            <div className="rounded-[18px] border border-[#f7a600] bg-white p-5 shadow-[0_10px_26px_rgba(22,94,131,0.08)]">
              <p className="text-lg font-black text-[#12384d]">問題集選びの前に、計画を作る</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">独学で止まる原因は、教材不足よりも「次に何をやるか」が曖昧なことです。</p>
              <Link href="/onboarding" className="mt-4 inline-flex w-full justify-center rounded-full bg-[#1b75a6] px-5 py-3 text-sm font-black text-white">無料で始める</Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
