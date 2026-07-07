import type { Metadata } from "next";
import Link from "next/link";

const title =
  "ITパスポート独学ロードマップ｜初心者が30日・60日・90日で合格を目指す勉強計画";
const description =
  "ITパスポートを独学で受ける初心者向けに、30日・60日・90日の勉強ロードマップ、参考書・単語帳・過去問の使い方、AI学習支援アプリの活用方法を解説します。";
const canonical =
  "https://it-learning-app.vercel.app/blog/it-passport-independent-study-roadmap-2026";
const published = "2026-07-08";

export const metadata: Metadata = {
  title: `${title} | ITパスポート学習コーチ`,
  description,
  alternates: { canonical },
  keywords: [
    "ITパスポート 独学",
    "ITパスポート 勉強計画",
    "ITパスポート 勉強スケジュール",
    "ITパスポート 初心者",
    "ITパスポート ロードマップ",
    "ITパスポート AI 学習",
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
  author: { "@type": "Organization", name: "ITパスポート学習コーチ編集部" },
  publisher: { "@type": "Organization", name: "ITパスポート学習コーチ" },
  mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  url: canonical,
};

const roadmaps = [
  {
    label: "30日プラン",
    target: "短期集中で合格ラインを狙う人",
    steps: ["1〜7日目：全体像を一気に把握", "8〜18日目：頻出用語と確認問題", "19〜27日目：過去問レベル演習", "28〜30日目：弱点だけ復習"],
  },
  {
    label: "60日プラン",
    target: "平日30〜60分で無理なく進めたい人",
    steps: ["1〜20日目：参考書1周目", "21〜35日目：単語帳と章末問題", "36〜52日目：過去問レベル演習", "53〜60日目：苦手分野の再確認"],
  },
  {
    label: "90日プラン",
    target: "IT未経験で基礎から固めたい人",
    steps: ["1〜30日目：ストラテジ・マネジメントの基礎", "31〜55日目：テクノロジ系の理解", "56〜75日目：確認問題と単語復習", "76〜90日目：総合演習と直前対策"],
  },
];

const toc = [
  { id: "seo", label: "この記事のSEO設計" },
  { id: "why", label: "独学で失敗しやすい理由" },
  { id: "roadmap", label: "30日・60日・90日ロードマップ" },
  { id: "ai", label: "AI学習支援を使うべき場面" },
  { id: "cta", label: "it-learning-appで始める" },
];

export default function ItPassportIndependentStudyRoadmapPage() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/blog" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b75a6] text-sm font-black text-white">IP</span>
            <span className="text-sm font-black text-[#12384d] sm:text-base">ITパスポート学習ガイド</span>
          </Link>
          <Link href="/onboarding" className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white">無料で計画を作る</Link>
        </div>
      </header>

      <section className="bg-white px-4 py-9 sm:px-6 sm:py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div>
            <p className="inline-flex rounded-full bg-[#fff2cc] px-3 py-1 text-xs font-bold text-[#9a6400]">独学ロードマップ</p>
            <h1 className="mt-5 max-w-4xl text-[32px] font-black leading-[1.22] text-[#12384d] sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
              ITパスポートは独学でも十分に合格を狙える試験です。ただし、初心者がつまずく原因は「教材が悪い」よりも、試験日までの進め方が曖昧なことにあります。この記事では、残り日数別に何を進めるべきかを整理します。
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
              <span>公開日：2026-07-08</span>
              <span>読了目安：9分</span>
              <span>対象：IT未経験・独学者</span>
            </div>
          </div>

          <aside className="rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
            <p className="text-sm font-black text-[#12384d]">リード獲得設計</p>
            <dl className="mt-4 space-y-4 text-sm leading-7 text-slate-700">
              <div>
                <dt className="font-black text-[#12384d]">SEOキーワード</dt>
                <dd>ITパスポート 独学 / 勉強計画 / 勉強スケジュール</dd>
              </div>
              <div>
                <dt className="font-black text-[#12384d]">想定読者</dt>
                <dd>参考書を買ったが、毎日何をすればよいか決められない初心者</dd>
              </div>
              <div>
                <dt className="font-black text-[#12384d]">訴求軸</dt>
                <dd>計画・復習・確認問題をAIで軽くし、独学の迷いを減らす</dd>
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
              <li>・30日なら「広く読む」より、頻出テーマと演習に寄せる。</li>
              <li>・60日なら、参考書1周・確認問題・過去問レベル演習の順で進める。</li>
              <li>・90日なら、IT未経験でも基礎理解から積み上げやすい。</li>
              <li>・it-learning-appは、今日やることと復習対象を整理し、独学の判断負担を減らす。</li>
            </ul>
          </section>

          <nav aria-label="目次" className="mt-7 rounded-[18px] border border-[#cfe5f2] bg-white">
            <p className="border-b border-[#cfe5f2] px-5 py-4 text-lg font-black text-[#12384d]">もくじ</p>
            <ol className="divide-y divide-[#e2f0f7]">
              {toc.map((item, index) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="grid grid-cols-[52px_1fr] items-center gap-3 px-5 py-4 text-sm font-bold text-slate-700 hover:bg-[#f7fbfe] hover:text-[#1b75a6]">
                    <span className="text-lg font-black text-[#1b75a6]">{String(index + 1).padStart(2, "0")}</span>
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-9 space-y-7 text-base text-slate-700 sm:text-[17px] [&_a]:font-bold [&_a]:text-[#1b75a6] [&_a]:underline [&_a]:underline-offset-4 [&_h2]:relative [&_h2]:mt-12 [&_h2]:border-l-[7px] [&_h2]:border-[#1b75a6] [&_h2]:bg-[#eef8fd] [&_h2]:px-4 [&_h2]:py-3 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:leading-snug [&_h2]:text-[#12384d] [&_h3]:border-b [&_h3]:border-[#cfe5f2] [&_h3]:pb-2 [&_h3]:text-xl [&_h3]:font-black [&_h3]:leading-snug [&_h3]:text-[#12384d] [&_li]:leading-8 [&_p]:leading-8">
            <h2 id="seo">この記事のSEO設計</h2>
            <p>
              この記事は「ITパスポート 独学」「ITパスポート 勉強計画」「ITパスポート 勉強スケジュール」で検索するユーザーを対象にしています。検索者は教材比較より一段進み、実際にどう進めるかを知りたい段階です。
            </p>
            <p>
              そのため、単なる一般論ではなく、30日・60日・90日の残り期間別にロードマップを提示し、最後に it-learning-app の学習計画機能へ誘導します。
            </p>

            <h2 id="why">独学で失敗しやすい理由</h2>
            <p>
              ITパスポートの独学で多い失敗は、参考書を最初から丁寧に読みすぎることです。丁寧に読むこと自体は悪くありませんが、試験範囲が広いため、1章ごとの理解確認や復習がないと、読み終える頃には前半を忘れてしまいます。
            </p>
            <p>
              もうひとつの失敗は、過去問に入るタイミングが早すぎることです。知らない用語ばかりの状態で過去問を解くと、正解・不正解だけを追う学習になり、なぜ間違えたかが残りません。
            </p>
            <p>
              独学では、教材の質だけでなく「今日やること」「復習すること」「次に進んでよいか」を判断する仕組みが必要です。
            </p>

            <h2 id="roadmap">30日・60日・90日ロードマップ</h2>
            <p>
              試験日までの残り期間によって、最適な進め方は変わります。以下は初心者向けの目安です。
            </p>

            <div className="grid gap-4">
              {roadmaps.map((plan) => (
                <section key={plan.label} className="rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
                  <h3>{plan.label}</h3>
                  <p className="mt-3 text-sm font-bold text-[#1b75a6]">対象：{plan.target}</p>
                  <ol className="mt-4 space-y-2 text-sm leading-7 text-slate-700 sm:text-base">
                    {plan.steps.map((step) => (
                      <li key={step}>・{step}</li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>

            <h3>30日プランの考え方</h3>
            <p>
              30日しかない場合、全分野を完璧に理解しようとすると時間が足りません。まず試験範囲の全体像を押さえ、頻出用語、確認問題、過去問レベル演習に早めに入ります。復習対象は、間違えた問題と曖昧な用語に絞ります。
            </p>

            <h3>60日プランの考え方</h3>
            <p>
              60日ある場合は、独学でも安定しやすい期間です。前半で参考書を1周し、後半で確認問題と過去問レベル演習を増やします。ページ数ではなく、理解できたテーマ数で進捗を見るのがポイントです。
            </p>

            <h3>90日プランの考え方</h3>
            <p>
              90日ある場合は、IT未経験者でも基礎から積み上げられます。ただし、期間が長いほど中だるみしやすいため、週ごとの到達点を決める必要があります。単語帳や短い確認問題で、忘れる前提の復習設計を作りましょう。
            </p>

            <h2 id="ai">AI学習支援を使うべき場面</h2>
            <p>
              AIを使うべきなのは、問題の答えを丸暗記する場面ではありません。独学者が毎回迷いやすい、計画、復習、優先順位の判断に使うべきです。
            </p>
            <ul>
              <li>試験日までの残り日数から、今日やるテーマを決める。</li>
              <li>確認問題の結果から、復習すべきテーマを見つける。</li>
              <li>単語帳で忘れやすい用語を繰り返す。</li>
              <li>学習が遅れたとき、計画を組み直す。</li>
            </ul>
            <p>
              it-learning-app は、この「独学の判断負担」を下げることを目的にしたITパスポート学習支援アプリです。単に問題を並べるのではなく、今日やること、確認問題、単語帳、進捗可視化をまとめて扱います。
            </p>

            <h2 id="cta">it-learning-appで始める</h2>
            <p>
              ITパスポート対策で重要なのは、最初から完璧な計画を作ることではありません。今日やることが明確で、終わったあとに理解度を確認でき、必要な復習に戻れることです。
            </p>
            <p>
              参考書を買ったまま止まっている人、過去問に入るタイミングが分からない人、毎日の学習メニューを自分で決めるのが負担な人は、it-learning-appで試験日から逆算した学習メニューを作ってみてください。
            </p>
          </div>

          <section className="mt-10 rounded-[22px] bg-[#12384d] p-6 text-white sm:p-8" id="lead">
            <p className="text-sm font-black text-[#f7d36b]">無料で学習計画を作成</p>
            <h2 className="mt-3 text-2xl font-black leading-snug sm:text-3xl">独学の迷いを減らして、今日やる1テーマから始める</h2>
            <p className="mt-4 leading-8 text-white/90">
              it-learning-appなら、試験日と学習時間に合わせて、今日やること・確認問題・復習対象を整理できます。まずは短い学習メニューを作り、続けられるかを試してください。
            </p>
            <Link href="/onboarding" className="mt-6 inline-flex rounded-full bg-[#f7a600] px-6 py-3 text-sm font-black text-white transition hover:bg-[#df9500]">
              無料で今日の学習メニューを作る
            </Link>
          </section>
        </article>

        <aside className="sticky top-6 hidden rounded-[18px] border border-[#cfe5f2] bg-white p-5 shadow-[0_12px_28px_rgba(22,94,131,0.08)] lg:block">
          <p className="text-sm font-black text-[#12384d]">この記事で狙う検索意図</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            <li>・独学で何から始めるか知りたい</li>
            <li>・試験日までのスケジュールが欲しい</li>
            <li>・AI学習支援アプリを試したい</li>
          </ul>
          <Link href="/onboarding" className="mt-5 inline-flex w-full justify-center rounded-full bg-[#1b75a6] px-5 py-3 text-sm font-black text-white">
            学習計画を作る
          </Link>
        </aside>
      </div>
    </main>
  );
}
