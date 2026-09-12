import Link from "next/link";
import {
  IPA_RANGE_URL,
  type BlogSlug,
  createArticleJsonLd,
  getBlogPost,
  getRelatedPosts,
} from "@/data/blogPosts";
import BlogCta from "./BlogCta";

type TocItem = {
  id: string;
  label: string;
};

type BlogArticleLayoutProps = {
  slug: BlogSlug;
  toc: TocItem[];
  children: React.ReactNode;
};

export default function BlogArticleLayout({
  slug,
  toc,
  children,
}: BlogArticleLayoutProps) {
  const post = getBlogPost(slug);
  const relatedPosts = getRelatedPosts(slug);
  const jsonLd = createArticleJsonLd(slug);

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
          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/blog" className="hover:text-[#1b75a6]">
              コラム一覧
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-white px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            <Link href="/blog" className="text-[#1b75a6] underline underline-offset-4">
              コラム一覧
            </Link>
            <span>/</span>
            <span>{post.category}</span>
          </div>

          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div>
              <p className="inline-flex rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-bold text-[#1b75a6]">
                {post.category}
              </p>
              <h1 className="mt-4 max-w-3xl text-[32px] font-black leading-[1.25] tracking-normal text-[#12384d] sm:text-5xl">
                {post.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
                {post.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                <span>更新日：{post.dateModified}</span>
                <span>読了目安：{post.readTime}</span>
              </div>
            </div>

            <aside className="rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
              <p className="text-sm font-black text-[#12384d]">この記事で分かること</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>・ITパスポート学習で最初に迷いやすい点</li>
                <li>・初心者が取りやすい学習順</li>
                <li>・次に何をすればよいか</li>
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,760px)_300px] lg:items-start">
        <article className="min-w-0 rounded-[22px] bg-white p-5 shadow-[0_14px_34px_rgba(22,94,131,0.08)] sm:p-8">
          <section className="rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
            <div className="flex items-center gap-3">
              <span className="h-7 w-1.5 rounded-full bg-[#f7a600]" />
              <p className="text-lg font-black text-[#12384d]">
                コラムについてのまとめ
              </p>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700 sm:text-base">
              {post.takeaways.map((takeaway) => (
                <li key={takeaway} className="flex gap-3">
                  <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[#1b75a6]" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </section>

          <nav
            aria-label="目次"
            className="mt-7 rounded-[18px] border border-[#cfe5f2] bg-white"
          >
            <p className="border-b border-[#cfe5f2] px-5 py-4 text-lg font-black text-[#12384d]">
              もくじ
            </p>
            <ol className="divide-y divide-[#e2f0f7]">
              {toc.map((item, index) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="grid grid-cols-[52px_1fr] items-center gap-3 px-5 py-4 text-sm font-bold text-slate-700 hover:bg-[#f7fbfe] hover:text-[#1b75a6]"
                  >
                    <span className="text-lg font-black text-[#1b75a6]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-9 space-y-7 text-base text-slate-700 sm:text-[17px] [&_a]:font-bold [&_a]:text-[#1b75a6] [&_a]:underline [&_a]:underline-offset-4 [&_h2]:relative [&_h2]:mt-12 [&_h2]:border-l-[7px] [&_h2]:border-[#1b75a6] [&_h2]:bg-[#eef8fd] [&_h2]:px-4 [&_h2]:py-3 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:leading-snug [&_h2]:tracking-normal [&_h2]:text-[#12384d] [&_h3]:border-b [&_h3]:border-[#cfe5f2] [&_h3]:pb-2 [&_h3]:text-xl [&_h3]:font-black [&_h3]:leading-snug [&_h3]:text-[#12384d] [&_li]:leading-8 [&_p]:leading-8">
            {children}
          </div>

          <div className="mt-12">
            <BlogCta
              title="ITパスポート学習を、今日の1テーマから始める"
              description="記事で勉強法を確認したら、次は実際に1テーマだけ進めてみましょう。試験日や使える時間に合わせて、今日やることを整理できます。"
              primaryLabel={post.ctaLabel}
              primaryHref={post.ctaHref}
            />
          </div>

          <section className="mt-12">
            <h2 className="border-l-[7px] border-[#1b75a6] bg-[#eef8fd] px-4 py-3 text-2xl font-black text-[#12384d]">
              関連記事
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="group rounded-[16px] border border-[#cfe5f2] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(22,94,131,0.10)] active:scale-[0.99]"
                >
                  <p className="text-xs font-bold text-[#1b75a6]">
                    {related.category}
                  </p>
                  <h3 className="mt-2 text-base font-black leading-snug text-[#12384d] group-hover:underline group-hover:underline-offset-4">
                    {related.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {related.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <section className="rounded-[18px] border border-[#cfe5f2] bg-white p-5 shadow-[0_10px_24px_rgba(22,94,131,0.07)]">
            <p className="text-base font-black text-[#12384d]">この記事の対象</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{post.audience}</p>
          </section>

          <section className="rounded-[18px] border border-[#cfe5f2] bg-white p-5 shadow-[0_10px_24px_rgba(22,94,131,0.07)]">
            <p className="text-base font-black text-[#12384d]">公式情報</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              試験時間、出題範囲、合格基準はIPA公式ページで確認できます。
            </p>
            <a
              href={IPA_RANGE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-bold text-[#1b75a6] underline underline-offset-4"
            >
              IPA公式ページを見る
            </a>
          </section>
        </aside>
      </div>

      <footer className="border-t border-[#cfe5f2] bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-[#12384d]">ITパスポート学習ガイド</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/blog" className="hover:text-[#1b75a6]">
              コラム一覧
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
