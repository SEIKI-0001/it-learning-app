import Link from "next/link";
import { BLOG_POSTS, createBlogListingMetadata, IPA_RANGE_URL } from "@/data/blogPosts";
import BlogCta from "./_components/BlogCta";

export const metadata = createBlogListingMetadata();

const promotedPosts = [
  {
    slug: "it-passport-pass-readiness-check",
    href: "/lp/it-passport-pass-readiness-check",
    title: "【無料診断】ITパスポートに合格できる？10項目の合格準備度チェック",
    description:
      "学習計画、確認問題、用語復習、過去問、苦手分野の把握状況を1分で確認し、次に優先すべき勉強を整理します。",
    category: "NEW：無料合格診断",
    cta: "合格準備度を診断する",
  },
  {
    slug: "it-passport-study-coach",
    href: "/it-passport-study-coach",
    title: "ITパスポートAI学習コーチ｜試験日から今日やることを無料で整理",
    description:
      "試験日から逆算した計画、確認問題、単語復習、進捗管理を一つにつなぐit-learning-appの紹介サイトです。",
    category: "サービス紹介",
    cta: "AI学習コーチを見る",
  },
  {
    slug: "it-passport-two-weeks-study-plan-2026",
    title: "ITパスポートは2週間で間に合う？試験直前の勉強計画を初心者向けに解説",
    description:
      "残り14日で優先する学習、弱点の見つけ方、過去問レベル演習、直前復習を日程別に整理します。",
    category: "試験直前2週間",
    cta: "14日間の勉強計画を見る",
  },
  {
    slug: "it-passport-study-time-calculator",
    href: "/lp/it-passport-study-time-calculator",
    title: "ITパスポート勉強時間シミュレーター｜試験日から無料で学習計画を計算",
    description:
      "試験日、平日・休日の学習時間、現在の理解度から、確保できる総時間と1日あたりの目安を無料で計算します。",
    category: "無料シミュレーター",
    cta: "勉強時間を計算する",
  },
  {
    slug: "it-passport-free-study-tools-2026",
    title: "ITパスポート独学に役立つ無料ツール7選｜初心者向けの使い分けも解説",
    description:
      "公式情報、学習計画、用語整理、確認問題、復習、演習、AI学習支援を役割別に整理します。",
    category: "無料ツールまとめ",
    cta: "無料ツール7選を読む",
  },
  {
    slug: "it-passport-free-study-diagnosis",
    href: "/lp/it-passport-free-study-diagnosis",
    title: "ITパスポート無料学習診断｜試験日から今日やることをAIで整理",
    description:
      "試験日・学習時間・今の理解度から、今日やるべき学習メニューを作る無料診断LPです。",
    category: "無料学習診断",
    cta: "無料診断を始める",
  },
];

const comparisonRows = [
  {
    type: "汎用チャットAI",
    strength: "分からない用語をすぐ質問できる",
    caution: "試験日までの計画と復習管理は自分で作る必要がある",
  },
  {
    type: "過去問サイト",
    strength: "演習量を確保しやすい",
    caution: "初心者は正解・不正解だけを追いやすい",
  },
  {
    type: "単語帳アプリ",
    strength: "用語暗記と反復復習に強い",
    caution: "出題範囲全体の学習順は管理しにくい",
  },
  {
    type: "AI学習管理アプリ",
    strength: "今日やること・確認・復習をつなげやすい",
    caution: "単発の質問だけしたい人には機能が多く感じる場合がある",
  },
];

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/blog" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b75a6] text-sm font-black text-white">IP</span>
            <span className="text-sm font-black text-[#12384d] sm:text-base">ITパスポート学習ガイド</span>
          </Link>
          <Link href="/onboarding" className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white">無料で始める</Link>
        </div>
      </header>

      <section className="bg-white px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-bold text-[#1b75a6]">ITパスポート初心者向けコラム</p>
            <h1 className="mt-5 max-w-3xl text-[34px] font-black leading-[1.18] text-[#12384d] sm:text-6xl">勉強法に迷ったら、まずこの記事から。</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">IT未経験者がつまずきやすい「始め方」「続け方」「過去問の使い方」「アプリ選び」を、読み切りのコラムとして整理しました。</p>
          </div>
          <div className="rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
            <p className="text-lg font-black text-[#12384d]">コラムの読み方</p>
            <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              <li><span className="font-black text-[#1b75a6]">01 </span>何から始めるかを決める</li>
              <li><span className="font-black text-[#1b75a6]">02 </span>続かない原因を学習設計で見る</li>
              <li><span className="font-black text-[#1b75a6]">03 </span>教材・アプリの選び方を決める</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="overflow-hidden rounded-[26px] border border-[#cfe5f2] bg-white shadow-[0_18px_44px_rgba(22,94,131,0.10)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="p-6 sm:p-8 lg:p-10">
              <p className="inline-flex rounded-full bg-[#fff2cc] px-3 py-1 text-xs font-black text-[#9a6400]">本日のリード獲得企画：AI学習ツール比較LP</p>
              <h2 className="mt-5 text-3xl font-black leading-tight text-[#12384d] sm:text-5xl">ITパスポートのAI学習ツールは、問題数より「学習管理」で選ぶ。</h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">AIに質問できることと、合格まで学習が進むことは別です。独学初心者は、用語解説・暗記・過去問演習を点で使うより、試験日から逆算して今日やること、確認問題、復習タイミングまでつながる環境を選ぶほうが継続しやすくなります。</p>
              <dl className="mt-6 grid gap-4 text-sm leading-7 sm:grid-cols-3">
                <div className="rounded-[16px] bg-[#f7fbfe] p-4"><dt className="font-black text-[#12384d]">SEOキーワード</dt><dd className="mt-1 text-slate-700">ITパスポート AI / ITパスポート 学習アプリ / ITパスポート 独学</dd></div>
                <div className="rounded-[16px] bg-[#f7fbfe] p-4"><dt className="font-black text-[#12384d]">想定読者</dt><dd className="mt-1 text-slate-700">AIを使って効率よく勉強したいが、何を選べばよいか迷っている初心者</dd></div>
                <div className="rounded-[16px] bg-[#f7fbfe] p-4"><dt className="font-black text-[#12384d]">訴求軸</dt><dd className="mt-1 text-slate-700">問題を解くだけでなく、計画・理解度確認・復習までAIで支える</dd></div>
              </dl>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/onboarding" className="inline-flex justify-center rounded-full bg-[#f7a600] px-6 py-4 text-sm font-black text-white transition hover:bg-[#d98f00]">無料で今日の学習メニューを作る</Link>
                <a href={IPA_RANGE_URL} target="_blank" rel="noreferrer" className="inline-flex justify-center rounded-full border border-[#1b75a6] px-6 py-4 text-sm font-black text-[#1b75a6] transition hover:bg-[#e8f5fb]">IPA公式の出題範囲を確認</a>
              </div>
            </div>
            <aside className="bg-[#12384d] p-6 text-white sm:p-8 lg:p-10">
              <p className="text-lg font-black">メタディスクリプション案</p>
              <p className="mt-4 text-sm leading-7 text-[#e6f6fc]">ITパスポート対策でAI学習ツールを使うなら何を見るべきか。チャットAI、単語帳、過去問サイト、学習管理アプリを比較し、初心者が合格まで続けるための選び方を解説します。</p>
              <p className="mt-7 text-lg font-black">CTA</p>
              <p className="mt-4 text-sm leading-7 text-[#e6f6fc]">まずは試験日と使える時間を入力し、it-learning-appで今日の学習メニューを無料作成する。</p>
            </aside>
          </div>
          <div className="grid gap-4 border-t border-[#d7edf7] bg-[#f7fbfe] p-5 sm:grid-cols-2 lg:grid-cols-4">
            {comparisonRows.map((row) => (
              <article key={row.type} className="rounded-[18px] bg-white p-5 shadow-[0_10px_22px_rgba(22,94,131,0.06)]">
                <h3 className="text-lg font-black text-[#12384d]">{row.type}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-700"><span className="font-black text-[#1b75a6]">強み：</span>{row.strength}</p>
                <p className="mt-3 text-sm leading-7 text-slate-700"><span className="font-black text-[#9a6400]">注意点：</span>{row.caution}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-3">
        {promotedPosts.map((post, index) => (
          <article key={post.slug} className="flex flex-col rounded-[22px] border border-[#cfe5f2] bg-white p-6 shadow-[0_14px_34px_rgba(22,94,131,0.08)]">
            <span className={index === 0 ? "w-fit rounded-full bg-[#fff2cc] px-3 py-1 text-xs font-bold text-[#9a6400]" : "w-fit rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-bold text-[#1b75a6]"}>{post.category}</span>
            <h2 className="mt-4 text-2xl font-black leading-snug text-[#12384d]">{post.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700 sm:text-base">{post.description}</p>
            <Link href={post.href ?? `/blog/${post.slug}`} className="mt-6 inline-flex justify-center rounded-full bg-[#1b75a6] px-5 py-3 text-sm font-black text-white transition hover:bg-[#155f87]">{post.cta}</Link>
          </article>
        ))}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-5 lg:grid-cols-3">
          {BLOG_POSTS.map((post, index) => (
            <article key={post.slug} className="flex min-h-[410px] flex-col rounded-[20px] border border-[#cfe5f2] bg-white p-6 shadow-[0_12px_28px_rgba(22,94,131,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-2xl font-black text-[#1b75a6]">{String(index + 1).padStart(2, "0")}</span>
                <span className="rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-bold text-[#1b75a6]">{post.category}</span>
              </div>
              <h2 className="mt-5 text-2xl font-black leading-snug text-[#12384d]">{post.title}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700">{post.description}</p>
              <dl className="mt-6 space-y-4 border-t border-[#d7edf7] pt-5 text-sm">
                <div><dt className="font-black text-[#12384d]">この記事の対象</dt><dd className="mt-1 leading-6 text-slate-600">{post.audience}</dd></div>
                <div className="flex items-center justify-between rounded-[12px] bg-[#f7fbfe] px-4 py-3"><dt className="font-black text-[#12384d]">読了目安</dt><dd className="font-bold text-[#1b75a6]">{post.readTime}</dd></div>
              </dl>
              <Link href={`/blog/${post.slug}`} className="mt-auto inline-flex justify-center rounded-full bg-[#1b75a6] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#155f87]">記事を読む</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
        <BlogCta title="読み終えたら、今日の1テーマだけ試す" description="コラムで勉強法を確認したら、次は短い学習に移るのがいちばん早いです。試験日や学習時間に合わせて、今日やることを整理できます。" primaryLabel="今日の学習メニューを作る" primaryHref="/onboarding" />
      </section>
    </main>
  );
}
