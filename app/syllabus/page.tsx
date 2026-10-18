import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { getAllTopics } from "@/lib/content";
import { getLessonHref } from "@/lib/learningCatalog";
import BottomNav from "@/components/BottomNav";
import { SYLLABUS, validateSyllabus } from "@/lib/syllabus";

// ── ページ本体 ──────────────────────────────────────────────────────────────

export default function SyllabusPage() {
  const topics = getAllTopics();
  const validationErrors = validateSyllabus(SYLLABUS, topics);
  if (validationErrors.length > 0) {
    throw new Error(`シラバス検証に失敗しました: ${validationErrors.join(" / ")}`);
  }
  const topicMap = new Map(topics.map((t) => [t.id, t]));

  const allItems = SYLLABUS.flatMap((s) => s.categories.flatMap((c) => c.items));
  const coveredTotal = allItems.filter((i) => i.topicIds.length > 0).length;
  const total = allItems.length;
  const coveragePercent = Math.round((coveredTotal / total) * 100);

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/learn", label: "学ぶ" }}
        title="シラバス対応表"
        description="ITパスポートシラバス Ver.6.5 との対応状況を確認できます。"
      >
        {/* この画面で唯一の強調ブロック＝全体のカバー率 */}
        <div className="mt-4 rounded-xl bg-brand-50 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold text-brand-700">
              シラバス項目カバー率
            </span>
            <span className="text-xl font-semibold tabular-nums text-gray-900">
              {coveredTotal}
              <span className="ml-0.5 text-sm font-normal text-gray-500">
                /{total}項目
              </span>
            </span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-label="シラバス項目カバー率"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={coveragePercent}
          >
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-xs tabular-nums text-gray-600">
            {coveragePercent}% カバー
          </p>
        </div>

        <nav aria-label="分野へ移動" className="mt-3 flex flex-wrap gap-2">
          {SYLLABUS.map((section) => {
            const items = section.categories.flatMap((c) => c.items);
            const covered = items.filter((i) => i.topicIds.length > 0).length;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-brand-700"
              >
                {section.label}　{covered}/{items.length}
              </a>
            );
          })}
        </nav>
      </PageHeader>

      <div className="mx-auto w-full max-w-3xl space-y-10 px-4 py-8">
        <section className="rounded-xl border border-brand-100 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-800">はじめて受験する方へ</h2>
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-gray-600">
            <p>
              ITパスポート試験は、ストラテジ系・マネジメント系・テクノロジ系の
              3分野から出題されます。
            </p>
            <p>
              CBT方式で、試験会場のコンピュータ画面に表示される問題を読み、
              選択肢を選んで回答します。見直したい問題には印を付け、試験時間内に
              戻って確認できます。
            </p>
            <p>
              合格には、1000点満点中の総合評価点600点以上に加え、
              各分野別評価点300点以上が必要です。
            </p>
          </div>
          <Link
            href="/learn"
            className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
          >
            学ぶ画面から3分野の学習を始める
          </Link>
        </section>

        {SYLLABUS.map((section) => {
          const sectionItems = section.categories.flatMap((c) => c.items);
          const sectionCovered = sectionItems.filter((i) => i.topicIds.length > 0).length;
          return (
            <section key={section.id} id={section.id}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">{section.label}</h2>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-600">
                  {sectionCovered}/{sectionItems.length}
                </span>
              </div>

              <div className="space-y-3">
                {section.categories.map((cat) => (
                  <div
                    key={cat.label}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                  >
                    <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                      <h3 className="text-sm font-bold text-gray-700">{cat.label}</h3>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {cat.items.map((item) => {
                        const covered = item.topicIds.length > 0;
                        return (
                          <li key={item.label} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <p
                                className={`text-sm leading-snug ${
                                  covered ? "font-medium text-gray-800" : "text-gray-500"
                                }`}
                              >
                                {item.label}
                              </p>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  covered
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {covered ? "対応済" : "未対応"}
                              </span>
                            </div>
                            {covered && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {item.topicIds.map((id) => {
                                  const topic = topicMap.get(id);
                                  if (!topic) return null;
                                  return (
                                    <Link
                                      key={id}
                                      href={getLessonHref(id, { from: "learn", activity: "learn", anchor: "lesson-content" })}
                                      className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                                    >
                                      {topic.title}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-center text-xs text-gray-500">
          ITパスポートシラバス Ver.6.5 をもとに作成。対応項目は、トピック・確認問題・解説・復習問題まで自動検証しています。
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
