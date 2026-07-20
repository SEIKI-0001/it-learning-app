import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FIELD_LABELS, IMPORTANCE_LABELS, type Topic } from "@/types/content";
import BottomNav from "@/components/BottomNav";
import TopicContent, { TopicReviewSections } from "@/components/learn/TopicContent";
import TopicCompletionQuiz from "@/components/learn/TopicCompletionQuiz";
import { hasCheckPack } from "@/lib/checkPack";
import { getTopic } from "@/lib/content";
import {
  getAdjacentLessons,
  getAllThemes,
  getLessonHref,
  getLessonLocation,
} from "@/lib/learningCatalog";

const DIFFICULTY_LABEL: Record<Topic["difficulty"], string> = {
  1: "やさしい",
  2: "ふつう",
  3: "ややむずかしい",
};

function readSingle(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function returnLinkFor(
  from: string | undefined,
  themeHref: string,
): { href: string; label: string } {
  if (from === "today") return { href: "/today", label: "今日のページへ戻る" };
  if (from === "review") return { href: "/review", label: "復習一覧へ戻る" };
  return { href: themeHref, label: "テーマに戻る" };
}

export function generateStaticParams() {
  return getAllThemes().flatMap((theme) =>
    theme.sections.flatMap((section) =>
      section.lessonIds.map((lessonId) => ({
        themeSlug: theme.slug,
        sectionSlug: section.slug,
        lessonId,
      })),
    ),
  );
}

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ themeSlug: string; sectionSlug: string; lessonId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { themeSlug, sectionSlug, lessonId } = await params;
  const query = await searchParams;
  const topic = getTopic(lessonId);
  if (!topic) notFound();

  const location = getLessonLocation(lessonId);
  if (!location) notFound();
  const { theme, section } = location;
  if (theme.slug !== themeSlug || section.slug !== sectionSlug) {
    redirect(getLessonHref(lessonId));
  }

  const themeHref = `/learn/${theme.slug}`;
  const adjacent = getAdjacentLessons(lessonId);
  const returnLink = returnLinkFor(readSingle(query.from), themeHref);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="border-b border-gray-200 bg-white px-4 py-5">
        <div className="mx-auto w-full max-w-3xl">
          <nav aria-label="パンくず" className="flex flex-wrap gap-x-1 text-sm font-semibold text-gray-500">
            <Link href="/learn" className="hover:text-brand-600">学ぶ</Link>
            <span aria-hidden>＞</span>
            <Link href={themeHref} className="hover:text-brand-600">{theme.title}</Link>
            <span aria-hidden>＞</span>
            <span>{section.title}</span>
          </nav>
          <p className="mt-5 text-xs font-bold text-brand-600">
            {FIELD_LABELS[topic.field]}・第{theme.chapterNumber}章
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">{topic.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{topic.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-gray-600">
            <span className="rounded-full bg-gray-100 px-3 py-1.5">目安 {topic.estimatedMinutes}分</span>
            <span className="rounded-full bg-gray-100 px-3 py-1.5">重要度：{IMPORTANCE_LABELS[topic.importance]}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1.5">難易度：{DIFFICULTY_LABEL[topic.difficulty]}</span>
          </div>

          {/* このレッスンの流れ。理解→確認→仕上げの順で進むことを最初に示す */}
          <nav aria-label="レッスンの流れ" className="mt-4 flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <a href="#lesson-content" className="rounded-full bg-brand-50 px-3 py-1.5 text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100">
              1. 解説で理解する
            </a>
            <span aria-hidden className="text-gray-300">→</span>
            <a href="#lesson-quiz" className="rounded-full bg-brand-50 px-3 py-1.5 text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100">
              2. 確認問題で確かめる
            </a>
            <span aria-hidden className="text-gray-300">→</span>
            <a
              href={hasCheckPack(topic.id) ? "#lesson-check-pack" : "#lesson-review"}
              className="rounded-full bg-brand-50 px-3 py-1.5 text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100"
            >
              3. {hasCheckPack(topic.id) ? "過去問レベルで仕上げる" : "復習ポイントを押さえる"}
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-10 px-4 py-7">
        <section id="lesson-content" className="scroll-mt-24" aria-label="レッスン本文">
          <TopicContent topic={topic} showCheckQuestions={false} />
        </section>

        <section id="lesson-quiz" className="scroll-mt-24" aria-label="確認問題">
          <TopicCompletionQuiz
            topic={{
              id: topic.id,
              field: topic.field,
              tags: topic.tags,
              checkQuestions: topic.checkQuestions,
            }}
            completionLabel="このレッスンを完了する"
            returnHref={returnLink.href}
            returnLabel={returnLink.label}
            nextLessonHref={
              adjacent.next
                ? getLessonHref(adjacent.next.id, { from: "learn", activity: "learn", anchor: "lesson-content" })
                : undefined
            }
            nextLessonLabel={adjacent.next ? `次のレッスン：${adjacent.next.title}` : undefined}
          />
        </section>

        {hasCheckPack(topic.id) && (
          <section id="lesson-check-pack" className="scroll-mt-24">
            <Link
              href={`/check-pack/${topic.id}`}
              className="block rounded-xl bg-brand-700 p-5 text-white shadow-sm transition hover:shadow-md active:scale-[0.99]"
            >
              <p className="text-base font-bold">仕上げ：確認パックを受ける</p>
              <p className="mt-1 text-sm text-white/90">基礎確認から過去問レベルまで解いて、本番対応OKを目指します。</p>
            </Link>
          </section>
        )}

        <section id="lesson-review" className="scroll-mt-24" aria-label="復習と参考情報">
          <TopicReviewSections topic={topic} />
        </section>

        <nav aria-label="レッスン間の移動" className="grid gap-3 border-t border-gray-200 pt-6 sm:grid-cols-3">
          {adjacent.previous ? (
            <Link
              href={getLessonHref(adjacent.previous.id, { from: "learn", activity: "learn", anchor: "lesson-content" })}
              className="rounded-xl border border-gray-200 bg-white p-4 text-sm font-bold text-gray-700 hover:border-brand-200 hover:text-brand-700"
            >
              <span className="block text-xs text-gray-400">← 前のレッスン</span>
              <span className="mt-1 block">{adjacent.previous.title}</span>
            </Link>
          ) : <div className="hidden sm:block" />}
          <Link
            href={themeHref}
            className="rounded-xl border border-gray-200 bg-white p-4 text-center text-sm font-bold text-gray-700 hover:border-brand-200 hover:text-brand-700"
          >
            テーマに戻る
          </Link>
          {adjacent.next ? (
            <Link
              href={getLessonHref(adjacent.next.id, { from: "learn", activity: "learn", anchor: "lesson-content" })}
              className="rounded-xl border border-gray-200 bg-white p-4 text-right text-sm font-bold text-gray-700 hover:border-brand-200 hover:text-brand-700"
            >
              <span className="block text-xs text-gray-400">次のレッスン →</span>
              <span className="mt-1 block">{adjacent.next.title}</span>
            </Link>
          ) : null}
        </nav>
      </div>
      <BottomNav />
    </main>
  );
}
