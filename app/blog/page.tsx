import Link from "next/link";
import { BLOG_POSTS, createBlogListingMetadata } from "@/data/blogPosts";
import BlogCta from "./_components/BlogCta";

export const metadata = createBlogListingMetadata();

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
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
          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/blog" className="hover:text-[#1b75a6]">
              コラム一覧
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-white px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-bold text-[#1b75a6]">
              ITパスポート初心者向けコラム
            </p>
            <h1 className="mt-5 max-w-3xl text-[34px] font-black leading-[1.18] tracking-normal text-[#12384d] sm:text-6xl">
              勉強法に迷ったら、まずこの記事から。
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">
              IT未経験者がつまずきやすい「始め方」「続け方」「過去問の使い方」を、読み切りのコラムとして整理しました。
              サービス紹介ではなく、試験対策そのものを理解するための記事です。
            </p>
          </div>

          <div className="rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
            <p className="text-lg font-black text-[#12384d]">
              コラムの読み方
            </p>
            <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              <li>
                <span className="font-black text-[#1b75a6]">01 </span>
                何から始めるかを決める
              </li>
              <li>
                <span className="font-black text-[#1b75a6]">02 </span>
                続かない原因を学習設計で見る
              </li>
              <li>
                <span className="font-black text-[#1b75a6]">03 </span>
                過去問を使うタイミングを決める
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-5 lg:grid-cols-3">
          {BLOG_POSTS.map((post, index) => (
            <article
              key={post.slug}
              className="flex min-h-[410px] flex-col rounded-[20px] border border-[#cfe5f2] bg-white p-6 shadow-[0_12px_28px_rgba(22,94,131,0.08)]"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-2xl font-black text-[#1b75a6]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-bold text-[#1b75a6]">
                  {post.category}
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-black leading-snug tracking-normal text-[#12384d]">
                {post.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-700">
                {post.description}
              </p>
              <dl className="mt-6 space-y-4 border-t border-[#d7edf7] pt-5 text-sm">
                <div>
                  <dt className="font-black text-[#12384d]">この記事の対象</dt>
                  <dd className="mt-1 leading-6 text-slate-600">{post.audience}</dd>
                </div>
                <div className="flex items-center justify-between rounded-[12px] bg-[#f7fbfe] px-4 py-3">
                  <dt className="font-black text-[#12384d]">読了目安</dt>
                  <dd className="font-bold text-[#1b75a6]">{post.readTime}</dd>
                </div>
              </dl>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-auto inline-flex justify-center rounded-full bg-[#1b75a6] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#155f87] active:scale-[0.99]"
              >
                記事を読む
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
        <BlogCta
          title="読み終えたら、今日の1テーマだけ試す"
          description="コラムで勉強法を確認したら、次は短い学習に移るのがいちばん早いです。試験日や学習時間に合わせて、今日やることを整理できます。"
          primaryLabel="今日の学習メニューを作る"
          primaryHref="/onboarding"
        />
      </section>
    </main>
  );
}
