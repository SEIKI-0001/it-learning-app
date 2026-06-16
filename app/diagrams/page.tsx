import Link from "next/link";
import type { TopicField } from "@/types/content";
import { FIELD_LABELS } from "@/types/content";
import { getDiagramsByField } from "@/lib/content";
import DiagramCard from "@/components/diagrams/DiagramCard";
import BottomNav from "@/components/BottomNav";

// 図解いちらん（ギャラリー）。3分野ごとに、作り込み済みの図解をまとめて見返せる。
// トピック学習の合間や、試験前の「図だけ総ざらい」に使える。状態を持たないので静的生成。
const FIELD_ORDER: TopicField[] = ["technology", "management", "strategy"];

export default function DiagramsPage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-6 text-white">
        <div className="mx-auto w-full max-w-md">
          <Link href="/topics" className="text-sm font-medium text-white/80">
            ← トピック一覧
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold">図解いちらん</h1>
          <p className="mt-1 text-sm text-white/90">
            つまずきやすいテーマを「図 → ひとこと → 重要ポイント」で総ざらいできます。
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-8 px-4 py-7">
        {FIELD_ORDER.map((field) => {
          const list = getDiagramsByField(field);
          if (list.length === 0) return null;
          return (
            <section key={field}>
              <h2 className="mb-3 text-lg font-extrabold text-gray-800">
                {FIELD_LABELS[field]}
              </h2>
              <ul className="space-y-4">
                {list.map((d) => (
                  <li key={d.id}>
                    <DiagramCard diagram={d} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <BottomNav />
    </main>
  );
}
