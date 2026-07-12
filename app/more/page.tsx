import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import BillingSection from "@/components/billing/BillingSection";
import PageHeader from "@/components/ui/PageHeader";

const GROUPS = [
  {
    title: "計画・実力確認",
    links: [
      { href: "/plan", emoji: "🗺️", title: "学習計画", description: "ロードマップと今週の目標" },
      { href: "/mock-exam", emoji: "🧪", title: "100問模試", description: "本番形式で実力を確認" },
      { href: "/report", emoji: "📝", title: "週次レポート", description: "今週の振り返り" },
    ],
  },
  {
    title: "学習ツール",
    links: [
      { href: "/glossary", emoji: "📇", title: "単語帳", description: "頻出用語を覚える" },
      { href: "/ai-grading", emoji: "✍️", title: "AI採点", description: "説明できる理解を試す" },
      { href: "/syllabus", emoji: "📋", title: "シラバス対応表", description: "学習範囲を確認" },
    ],
  },
  {
    title: "成長・設定",
    links: [
      { href: "/badges", emoji: "🏅", title: "バッジ", description: "達成条件と獲得状況" },
      { href: "/rank", emoji: "✨", title: "ランク", description: "XPと成長の記録" },
      { href: "/avatar", emoji: "🌱", title: "モチット", description: "成長とバッジを見る" },
      { href: "/settings", emoji: "⚙️", title: "設定", description: "試験日・学習時間など" },
    ],
  },
] as const;

export default function MorePage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        eyebrow="学習を支える機能"
        title="その他"
        widthClass="max-w-md md:max-w-2xl"
      />

      <div className="mx-auto w-full max-w-md space-y-7 px-4 py-6 md:max-w-2xl">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="mb-2 text-sm font-extrabold text-gray-700">{group.title}</h2>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5 last:border-b-0 transition active:bg-gray-50"
                >
                  <span className="text-2xl" aria-hidden>{link.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-gray-800">{link.title}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">{link.description}</span>
                  </span>
                  <span className="text-lg font-bold text-gray-300" aria-hidden>›</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <BillingSection />
      </div>

      <BottomNav />
    </main>
  );
}
