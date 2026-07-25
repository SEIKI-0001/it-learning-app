import type { Topic } from "@/types/content";
import type { ReferenceBook } from "@/types/referenceBook";
import { findReferenceLocation } from "@/lib/referenceBook";
import Icon from "@/components/ui/Icon";

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
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
          <Icon name="book-open" className="h-3.5 w-3.5" />今日の参考書
        </p>
        <p className="mt-1.5 text-sm font-semibold text-gray-900">
          あなたの参考書：{place}
        </p>
        <p className="mt-1 text-xs text-gray-600">
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
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
        <Icon name="book-open" className="h-3.5 w-3.5" />参考書で探すキーワード
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {keywords.map((kw, i) => (
          <span
            key={i}
            className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
          >
            {kw}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-600">
        章番号ではなく、索引でこの言葉を引いてから、アプリの図解で確認しましょう。
      </p>
    </section>
  );
}
