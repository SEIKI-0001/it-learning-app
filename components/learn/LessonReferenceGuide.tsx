"use client";

import type { Topic } from "@/types/content";
import { hasUsableReferenceBook } from "@/lib/referenceBook";
import { useReferenceBook } from "@/lib/useReferenceBook";
import TodayReferenceGuide from "@/components/learn/TodayReferenceGuide";

// レッスンページの「このトピックを参考書のどこで読むか」。
// /today と同じ TodayReferenceGuide（同じ解決ロジック）を使う。
// 参考書が未登録なら出さない（キーワードはページ下部の「参考書で探すキーワード」が担う）。
export default function LessonReferenceGuide({
  topic,
}: {
  topic: Pick<Topic, "id" | "title" | "referenceHints">;
}) {
  const { book } = useReferenceBook();
  if (!book || !hasUsableReferenceBook(book)) return null;
  return (
    <div className="mb-6">
      <TodayReferenceGuide
        topics={[topic]}
        book={book}
        showTopicTitles={false}
        label="参考書で読む場所"
      />
    </div>
  );
}
