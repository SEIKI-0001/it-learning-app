import Link from "next/link";
import { notFound } from "next/navigation";
import type { Topic } from "@/types/content";
import { FIELD_LABELS, IMPORTANCE_LABELS } from "@/types/content";
import { getAllTopics, getTopic } from "@/lib/content";
import { hasCheckPack } from "@/lib/checkPack";
import TopicContent, {
  TopicReviewSections,
} from "@/components/learn/TopicContent";
import BottomNav from "@/components/BottomNav";

// トピック詳細。理解カード → 確認問題 → 解説 → 復習 → 参考書キーワード → 過去問分野 の順。
// 既存トピックはビルド時に静的生成する。
export function generateStaticParams() {
  return getAllTopics().map((t) => ({ id: t.id }));
}

const DIFFICULTY_LABEL: Record<Topic["difficulty"], string> = {
  1: "やさしい",
  2: "ふつう",
  3: "ややむずかしい",
};

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const topic = getTopic(id);
  if (!topic) notFound();

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-5 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <Link href="/topics" className="text-sm font-medium text-white/80">
            ← トピック一覧
          </Link>
          <p className="mt-2 text-xs font-semibold text-white/80">
            {FIELD_LABELS[topic.field]}・{topic.category}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold">{topic.title}</h1>
          <p className="mt-2 text-sm text-white/90">{topic.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/20 px-2.5 py-1 font-semibold">
              ⏱️ 目安 {topic.estimatedMinutes}分
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-1 font-semibold">
              重要度：{IMPORTANCE_LABELS[topic.importance]}
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-1 font-semibold">
              難易度：{DIFFICULTY_LABEL[topic.difficulty]}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md md:max-w-2xl space-y-8 px-4 py-7">
        <TopicContent topic={topic} />

        {/* 確認パック導線（対象トピックのみ）。基礎＋用語＋過去問レベルで本番対応まで確認する。 */}
        {hasCheckPack(topic.id) && (
          <Link
            href={`/check-pack/${topic.id}`}
            className="block rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 p-4 text-white shadow-sm transition active:scale-[0.99]"
          >
            <p className="text-sm font-extrabold">✅ 確認パックを受ける</p>
            <p className="mt-0.5 text-xs text-white/90">
              基礎確認 → 関連用語 → 過去問レベルで「本番対応OK」まで確かめる
            </p>
          </Link>
        )}

        <TopicReviewSections topic={topic} />
      </div>

      <BottomNav />
    </main>
  );
}
