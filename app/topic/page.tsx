import Link from "next/link";
import { FIELD_LABELS } from "@/types/content";
import { getTaxonomy, getTopicsByField } from "@/lib/content";

// トピック一覧ページ（表示のみ / Server Component）。
// 分野 → 中分類 → トピックの順に並べ、詳細ページへの入口にする。
// 動作確認とナビゲーションが目的のシンプルな一覧。

export default function TopicIndexPage() {
  const taxonomy = getTaxonomy();

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-6 text-white">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-extrabold">学習トピック</h1>
          <p className="mt-1 text-sm text-white/90">
            ITパスポートの標準トピックを、図解つきで学べます。
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md space-y-8 px-4 py-7">
        {taxonomy.map((group) => {
          const topics = getTopicsByField(group.field);
          if (topics.length === 0) return null;
          return (
            <section key={group.field}>
              <h2 className="mb-3 text-lg font-extrabold text-gray-800">
                {FIELD_LABELS[group.field]}
              </h2>
              <ul className="space-y-2.5">
                {topics.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/topic/${t.id}`}
                      className="block rounded-2xl border border-gray-200 bg-white px-4 py-3.5 transition active:scale-[0.99]"
                    >
                      <p className="text-xs font-semibold text-indigo-500">
                        {t.category}
                      </p>
                      <p className="mt-0.5 text-base font-bold text-gray-800">
                        {t.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">{t.summary}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        ⏱️ 目安 {t.estimatedMinutes}分
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
