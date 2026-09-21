import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IMPORTANCE_LABELS, type Topic } from "@/types/content";
import BottomNav from "@/components/BottomNav";
import TopicContent, { TopicReviewSections } from "@/components/learn/TopicContent";
import TopicCompletionQuiz from "@/components/learn/TopicCompletionQuiz";
import LessonReferenceGuide from "@/components/learn/LessonReferenceGuide";
import LessonStatusBadge from "@/components/learn/LessonStatusBadge";
import { hasCheckPack } from "@/lib/checkPack";
import { getTopic } from "@/lib/content";
import Icon from "@/components/ui/Icon";
import {
  getAdjacentLessons,
  getAllThemes,
  getLessonHref,
  getLessonLocation,
  getLessonsForTheme,
} from "@/lib/learningCatalog";

const DIFFICULTY_LABEL: Record<Topic["difficulty"], string> = {
  1: "やさしい",
  2: "ふつう",
  3: "ややむずかしい",
};

function readSingle(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// label はレッスン完了後のボタン用（従来どおり）、shortLabel は見出し1行目の
// 戻る導線用。1行目は横並びに詰めるので、そこでは短い方を使う。
function returnLinkFor(
  from: string | undefined,
  theme: { title: string },
  themeHref: string,
): { href: string; label: string; shortLabel: string } {
  if (from === "today") {
    return { href: "/today", label: "今日のページへ戻る", shortLabel: "今日" };
  }
  if (from === "review") {
    return { href: "/review", label: "復習一覧へ戻る", shortLabel: "復習" };
  }
  return { href: themeHref, label: "テーマに戻る", shortLabel: theme.title };
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
  const returnLink = returnLinkFor(readSingle(query.from), theme, themeHref);

  // 見出し1行目に出す現在位置（この章の中で何レッスン目か）。
  const themeLessons = getLessonsForTheme(theme);
  const lessonNumber = themeLessons.findIndex((lesson) => lesson.id === topic.id) + 1;
  // 戻り先がテーマ以外（today / review）のときだけ、章名を別に出す。
  const showThemeCrumb = returnLink.href !== themeHref;

  return (
    <main className="min-h-screen pb-24">
      {/* 見出しは「現在位置(小) → タイトル → 補助情報(小)」の3行に絞り、
          開いた直後に解説本文の冒頭が見える高さに収める。 */}
      <header className="pt-3 md:pt-5">
        <div className="mx-auto w-full max-w-3xl px-3 md:px-4">
          <div className="rounded-[14px] bg-brand-50 px-[18px] py-3.5 md:rounded-2xl md:px-7 md:py-4">
            {/* 1行目: 戻る導線・現在位置・学習状態 */}
            <nav
              aria-label="現在位置"
              className="flex items-center gap-1.5 text-xs text-gray-600"
            >
              <Link
                href={returnLink.href}
                className="-ml-1 flex max-w-[10rem] shrink-0 items-center gap-0.5 transition hover:text-gray-900"
              >
                <Icon name="chevron-left" aria-hidden className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{returnLink.shortLabel}</span>
              </Link>
              {showThemeCrumb && (
                <>
                  <span aria-hidden className="shrink-0 text-gray-400">・</span>
                  <Link href={themeHref} className="truncate transition hover:text-gray-900">
                    {theme.title}
                  </Link>
                </>
              )}
              <span aria-hidden className="hidden shrink-0 text-gray-400 sm:block">・</span>
              <span className="hidden truncate sm:block">{section.title}</span>
              {lessonNumber > 0 && (
                <>
                  <span aria-hidden className="shrink-0 text-gray-400">・</span>
                  <span className="shrink-0 tabular-nums">
                    {lessonNumber}/{themeLessons.length}
                  </span>
                </>
              )}
              <LessonStatusBadge lessonId={topic.id} />
            </nav>

            {/* 2行目: ページ内で最も視認性を高くする見出し */}
            <h1 className="mt-1.5 text-2xl font-medium leading-snug tracking-[-0.04em] text-gray-900 md:text-[28px]">
              {topic.title}
            </h1>

            {/* 3行目: 補助情報。タイトルより目立たせない */}
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-gray-600">
              {topic.summary}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-500">
              <span>約{topic.estimatedMinutes}分</span>
              <span aria-hidden className="text-gray-400">・</span>
              <span>確認問題{topic.checkQuestions.length}問</span>
              <span aria-hidden className="text-gray-400">・</span>
              <span>重要度{IMPORTANCE_LABELS[topic.importance]}</span>
              <span aria-hidden className="text-gray-400">・</span>
              <span>{DIFFICULTY_LABEL[topic.difficulty]}</span>
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-10 px-4 pb-7 pt-5">
        <section id="lesson-content" className="scroll-mt-24" aria-label="レッスン本文">
          <LessonReferenceGuide
            topic={{ id: topic.id, title: topic.title, referenceHints: topic.referenceHints }}
          />
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
              className="block rounded-xl bg-brand-50 p-4 transition hover:bg-brand-100 active:scale-[0.99]"
            >
              <p className="text-xs font-semibold text-brand-700">仕上げ</p>
              <p className="mt-1 text-[15px] font-semibold leading-snug text-gray-900">確認パックを受ける</p>
              <p className="mt-1 text-sm text-gray-600">基礎確認から過去問レベルまで解いて、本番対応OKを目指します。</p>
            </Link>
          </section>
        )}

        <section id="lesson-review" className="scroll-mt-24" aria-label="復習">
          <TopicReviewSections topic={topic} />
        </section>

        <nav aria-label="レッスン間の移動" className="grid gap-3 border-t border-gray-200 pt-6 sm:grid-cols-3">
          {adjacent.previous ? (
            <Link
              href={getLessonHref(adjacent.previous.id, { from: "learn", activity: "learn", anchor: "lesson-content" })}
              className="rounded-xl border border-gray-200 bg-white p-4 text-sm font-bold text-gray-700 hover:border-brand-200 hover:text-brand-700"
            >
              <span className="flex items-center gap-0.5 text-xs text-gray-500">
                <Icon name="chevron-left" className="h-3.5 w-3.5" />
                前のレッスン
              </span>
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
