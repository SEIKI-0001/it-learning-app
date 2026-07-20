import type { Topic } from "@/types/content";
import type { ReferenceBook } from "@/types/referenceBook";
import { findReferenceLocation } from "@/lib/referenceBook";

// 「今日の参考書」ブロック。
// 今日のトピックに紐づく参考書の章・節があれば、その場所を案内する。
// 紐づけが無い（または参考書未登録）の場合は、Topic.referenceHints の
// 「探すキーワード」にフォールバックする。
export default function TodayReferenceGuide({
  topic,
  book,
}: {
  topic: Topic;
  book: ReferenceBook | null;
}) {
  const location = findReferenceLocation(book, topic.id);

  if (location) {
    const place = location.section
      ? `${location.chapter.title} ／ ${location.section.title}`
      : location.chapter.title;
    return (
      <section className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
          <span aria-hidden>📗</span>今日の参考書
        </p>
        <p className="mt-1.5 text-sm font-semibold text-amber-900">
          あなたの参考書：{place}
        </p>
        <p className="mt-1 text-xs text-amber-700">
          先にここを読んでから、アプリの図解で確認しましょう。
        </p>
      </section>
    );
  }

  // フォールバック: 参考書で探すキーワード。
  const keywords = Array.from(
    new Set(topic.referenceHints.flatMap((h) => h.keywords)),
  );
  if (keywords.length === 0) return null;

  return (
    <section className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
        <span aria-hidden>📗</span>参考書で探すキーワード
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {keywords.map((kw, i) => (
          <span
            key={i}
            className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
          >
            {kw}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-amber-700">
        章番号ではなく、索引でこの言葉を引いてから、アプリの図解で確認しましょう。
      </p>
    </section>
  );
}
