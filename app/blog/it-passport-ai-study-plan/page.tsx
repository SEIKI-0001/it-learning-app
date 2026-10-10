import type { Metadata } from "next";
import Link from "next/link";

const title =
  "ITパスポートの勉強計画はAIに任せるべき？初心者向けに使い方と注意点を解説";
const description =
  "ITパスポート対策でAIを使うメリットと注意点を初心者向けに整理。試験日から逆算した学習計画、復習、確認問題の使い方を解説します。";
const canonical =
  "https://it-learning-app.vercel.app/blog/it-passport-ai-study-plan";

export const metadata: Metadata = {
  title: `${title} | ITパスポート学習コーチ`,
  description,
  alternates: { canonical },
  keywords: [
    "ITパスポート",
    "AI",
    "勉強計画",
    "学習アプリ",
    "初心者",
    "独学",
  ],
  openGraph: {
    title,
    description,
    type: "article",
    url: canonical,
    siteName: "ITパスポート学習コーチ",
    locale: "ja_JP",
    publishedTime: "2026-07-06",
    modifiedTime: "2026-07-06",
  },
};

const toc = [
  { id: "summary", label: "結論：AIに任せるべき範囲" },
  { id: "why-hard", label: "初心者が勉強計画で失敗しやすい理由" },
  { id: "ai-use", label: "AIを使うと何が楽になるか" },
  { id: "caution", label: "AI学習で注意すべきこと" },
  { id: "app", label: "it-learning-appでできること" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: title,
  description,
  datePublished: "2026-07-06",
  dateModified: "2026-07-06",
  author: { "@type": "Organization", name: "ITパスポート学習コーチ編集部" },
  publisher: { "@type": "Organization", name: "ITパスポート学習コーチ" },
  mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  url: canonical,
};

export default function ItPassportAiStudyPlanPage() {
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
            <span className="text-sm font-black tracking-normal text-[#12384d] sm:text-base">
              ITパスポート学習ガイド
            </span>
          </Link>
          <Link href="/onboarding" className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white">
            無料で学習メニューを作る
          </Link>
        </div>
      </header>

      <section className="bg-white px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
          <div>
            <p className="inline-flex rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-bold text-[#1b75a6]">
              AI学習計画
            </p>
            <h1 className="mt-4 max-w-4xl text-[32px] font-black leading-[1.25] tracking-normal text-[#12384d] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
              ITパスポートは、範囲が広い試験です。初心者が独学でつまずく原因は、能力不足ではなく、今日やること・復習すること・過去問に入るタイミングが曖昧なまま進めてしまうことにあります。
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
              <span>公開日：2026-07-06</span>
              <span>読了目安：8分</span>
              <span>対象：IT未経験・独学者</span>
            </div>
          </div>

          <aside className="rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
            <p className="text-sm font-black text-[#12384d]">この記事のSEO設計</p>
            <dl className="mt-4 space-y-4 text-sm leading-7 text-slate-700">
              <div>
                <dt className="font-black text-[#12384d]">主キーワード</dt>
                <dd>ITパスポート AI 勉強計画</dd>
              </div>
              <div>
                <dt className="font-black text-[#12384d]">想定読者</dt>
                <dd>参考書を買ったが、何から進めるか決めきれない初心者</dd>
              </div>
              <div>
                <dt className="font-black text-[#12384d]">訴求軸</dt>
                <dd>AIで学習計画・復習・理解度確認を軽くする</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,760px)_300px] lg:items-start">
        <article className="min-w-0 rounded-[22px] bg-white p-5 shadow-[0_14px_34px_rgba(22,94,131,0.08)] sm:p-8">
          <section className="rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
            <div className="flex items-center gap-3">
              <span className="h-7 w-1.5 rounded-full bg-[#f7a600]" />
              <p className="text-lg font-black text-[#12384d]">この記事のまとめ</p>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700 sm:text-base">
              <li>・AIに任せるべきなのは、勉強そのものではなく計画・復習・優先順位の整理。</li>
              <li>・ITパスポートは3分野100問の試験なので、範囲を小さく区切る設計が重要。</li>
              <li>・it-learning-appは、今日やること、理解度確認、単語帳、進捗可視化をまとめて扱う。</li>
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

          <div className="mt-9 space-y-7 text-base text-slate-700 sm:text-[17px] [&_a]:font-bold [&_a]:text-[#1b75a6] [&_a]:underline [&_a]:underline-offset-4 [&_h2]:relative [&_h2]:mt-12 [&_h2]:border-l-[7px] [&_h2]:border-[#1b75a6] [&_h2]:bg-[#eef8fd] [&_h2]:px-4 [&_h2]:py-3 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:leading-snug [&_h2]:tracking-normal [&_h2]:text-[#12384d] [&_h3]:border-b [&_h3]:border-[#cfe5f2] [&_h3]:pb-2 [&_h3]:text-xl [&_h3]:font-black [&_h3]:leading-snug [&_h3]:text-[#12384d] [&_li]:leading-8 [&_p]:leading-8">
            <h2 id="summary">結論：AIに任せるべき範囲</h2>
            <p>
              ITパスポートの勉強でAIに任せるべきなのは、答えを丸暗記することではありません。任せるべきなのは、試験日までに何を、どの順番で、どれくらい復習するかを整理する部分です。
            </p>
            <p>
              公式情報では、ITパスポート試験は120分、100問、四肢択一式で実施され、ストラテジ系・マネジメント系・テクノロジ系の3分野から出題されます。合格には総合評価点600点以上に加えて、各分野でも基準点を下回らないことが必要です。
              <a href="https://www3.jitec.ipa.go.jp/JitesCbt/html/about/range.html" target="_blank" rel="noreferrer">IPA公式の試験内容・出題範囲</a>
            </p>
            <p>
              つまり、1分野だけを得意にしても不十分です。AIを使う価値は、広い範囲を小さく分け、今日やることを迷わない状態にするところにあります。
            </p>

            <h2 id="why-hard">初心者が勉強計画で失敗しやすい理由</h2>
            <p>
              IT未経験者が最初につまずきやすいのは、参考書の内容そのものよりも、学習の進め方です。1章を読んだあとに何を確認すればいいのか、用語をどの粒度で覚えるべきか、過去問にいつ入るべきかが見えにくいからです。
            </p>
            <p>
              さらに、ITパスポートは年間を通じてCBT方式で随時実施されるため、自分で試験日を決めやすい一方、締切感が弱くなりやすい試験でもあります。公式サイトでも統計情報が継続的に公開されており、試験としての利用者層は広がっています。
              <a href="https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/statistics.html" target="_blank" rel="noreferrer">IPA公式の統計情報</a>
            </p>
            <p>
              だからこそ、独学では「いつまでに何を終えるか」よりも、「今日何をやれば前に進んだと言えるか」を明確にすることが重要です。
            </p>

            <h2 id="ai-use">AIを使うと何が楽になるか</h2>
            <p>
              AI学習のメリットは、学習者が毎回細かく考えなくても、次の行動を決めやすくなることです。たとえば、試験日、平日に使える時間、休日に使える時間、苦手分野をもとに、今日の学習メニューを絞り込めます。
            </p>
            <h3>1. 試験日から逆算できる</h3>
            <p>
              試験まで30日なのか、90日なのかで進め方は変わります。AIを使えば、残り日数に応じて、インプット、確認問題、復習、過去問レベル演習の比率を変えやすくなります。
            </p>
            <h3>2. 復習の抜け漏れを減らせる</h3>
            <p>
              初心者ほど、分かったつもりの用語が増えます。単語帳や確認問題の結果を使って、復習すべき用語を出し直す仕組みがあると、記憶に頼った管理を減らせます。
            </p>
            <h3>3. 勉強量より理解度で進められる</h3>
            <p>
              「30分読んだ」だけでは、理解できたかは分かりません。短い確認問題や過去問レベルの問題を挟むことで、次に進むべきか、もう一度戻るべきかを判断しやすくなります。
            </p>

            <h2 id="caution">AI学習で注意すべきこと</h2>
            <p>
              AIを使えば自動的に合格できるわけではありません。注意すべきなのは、AIの説明を読んで分かった気になることです。ITパスポートは選択式の試験ですが、実際には用語の意味だけでなく、場面に合う選択肢を選ぶ力が必要です。
            </p>
            <p>
              そのため、AIの説明を受けたあとには、必ず確認問題を解く必要があります。説明、確認、復習、再確認のサイクルがないAI活用は、検索の延長で終わりやすいです。
            </p>
            <p>
              また、公式の出題範囲やシラバスは更新されることがあります。学習サービスを使う場合でも、試験範囲や合格基準はIPA公式情報で確認するのが安全です。
            </p>

            <h2 id="app">it-learning-appでできること</h2>
            <p>
              it-learning-appは、ITパスポートの独学者が迷いやすい「今日やること」「復習すること」「理解できたかどうか」をまとめて扱う学習支援アプリです。
            </p>
            <ul>
              <li>試験日から逆算して、今日の学習メニューを提示</li>
              <li>ストラテジ・マネジメント・テクノロジの進捗を可視化</li>
              <li>確認問題で理解度をチェック</li>
              <li>単語帳で用語の復習を管理</li>
              <li>遅れたときも、次に何をするかを立て直しやすい</li>
            </ul>
            <p>
              参考書や過去問サイトを否定するものではありません。むしろ、それらを使う前後で「何をやるべきか」を整理するための学習コーチとして使う設計です。
            </p>
            <p>
              勉強法を探す時間が長くなっているなら、まずは今日の1テーマだけ決めてください。続ける仕組みは、そのあとで十分作れます。
            </p>
          </div>

          <section className="mt-12 rounded-[22px] bg-[#12384d] p-6 text-white sm:p-8">
            <p className="text-sm font-black text-[#f7d36b]">無料で試せます</p>
            <h2 className="mt-3 text-2xl font-black leading-snug sm:text-3xl">
              ITパスポート学習を、今日の1テーマから始める
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-100 sm:text-base">
              試験日や使える時間に合わせて、今日やることを整理します。参考書を開く前に、まずは学習メニューを作ってください。
            </p>
            <Link href="/onboarding" className="mt-6 inline-flex rounded-full bg-[#f7a600] px-6 py-3 text-sm font-black text-white transition hover:opacity-90 active:scale-[0.99]">
              AIで今日の学習メニューを作る
            </Link>
          </section>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <section className="rounded-[18px] border border-[#cfe5f2] bg-white p-5 shadow-[0_10px_24px_rgba(22,94,131,0.07)]">
            <p className="text-base font-black text-[#12384d]">タイトル案</p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
              <li>・ITパスポートの勉強計画はAIに任せるべき？</li>
              <li>・ITパスポート独学にAI学習アプリは使える？</li>
              <li>・ITパスポート初心者向けAI勉強法</li>
            </ul>
          </section>
          <section className="rounded-[18px] border border-[#cfe5f2] bg-white p-5 shadow-[0_10px_24px_rgba(22,94,131,0.07)]">
            <p className="text-base font-black text-[#12384d]">メタディスクリプション</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{description}</p>
          </section>
          <section className="rounded-[18px] border border-[#cfe5f2] bg-white p-5 shadow-[0_10px_24px_rgba(22,94,131,0.07)]">
            <p className="text-base font-black text-[#12384d]">公式情報</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">試験時間、出題範囲、合格基準はIPA公式ページで確認できます。</p>
            <a href="https://www3.jitec.ipa.go.jp/JitesCbt/html/about/range.html" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-bold text-[#1b75a6] underline underline-offset-4">
              IPA公式ページを見る
            </a>
          </section>
        </aside>
      </div>

      <footer className="border-t border-[#cfe5f2] bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-[#12384d]">ITパスポート学習ガイド</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/blog" className="hover:text-[#1b75a6]">コラム一覧</Link>
            <Link href="/onboarding" className="hover:text-[#1b75a6]">学習を始める</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
