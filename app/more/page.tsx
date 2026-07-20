import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import BillingSection from "@/components/billing/BillingSection";
import PageHeader from "@/components/ui/PageHeader";
import Icon, { type IconName } from "@/components/ui/Icon";
import LogoutLink from "@/components/auth/LogoutLink";

const GROUPS: readonly {
  title: string;
  links: readonly { href: string; icon: IconName; title: string; description: string }[];
}[] = [
  {
    title: "計画・実力確認",
    links: [
      { href: "/plan", icon: "map", title: "学習計画", description: "ロードマップと今週の目標" },
      { href: "/mock-exam", icon: "check", title: "100問模試", description: "本番形式で実力を確認" },
      { href: "/report", icon: "chart", title: "週次レポート", description: "今週の振り返り" },
    ],
  },
  {
    title: "学習ツール",
    links: [
      { href: "/glossary", icon: "layers", title: "単語帳", description: "頻出用語を覚える" },
      { href: "/ai-grading", icon: "pen", title: "AI採点", description: "説明できる理解を試す" },
      { href: "/syllabus", icon: "list", title: "シラバス対応表", description: "学習範囲を確認" },
    ],
  },
  {
    title: "成長・設定",
    links: [
      { href: "/badges", icon: "award", title: "バッジ", description: "達成条件と獲得状況" },
      { href: "/rank", icon: "star", title: "ランク", description: "XPと成長の記録" },
      { href: "/avatar", icon: "sprout", title: "モチット", description: "成長とバッジを見る" },
      { href: "/settings", icon: "settings", title: "設定", description: "試験日・学習時間など" },
    ],
  },
] as const;

export default function MorePage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        title="その他"
        description="計画の見直しや実力確認など、学習を支える機能をまとめています。"
        widthClass="max-w-md md:max-w-2xl"
      />

      <div className="mx-auto w-full max-w-md space-y-7 px-4 py-6 md:max-w-2xl">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="mb-2 text-xs font-semibold text-gray-500">{group.title}</h2>
            <div className="overflow-hidden rounded-xl bg-white border border-gray-200">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5 last:border-b-0 transition active:bg-gray-50"
                >
                  <Icon name={link.icon} className="h-5 w-5 shrink-0 text-gray-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900">{link.title}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">{link.description}</span>
                  </span>
                  <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-gray-300" />
                </Link>
              ))}
            </div>
          </section>
        ))}

        <BillingSection />

        <section className="pt-2 text-center">
          <LogoutLink className="text-xs text-gray-500 underline underline-offset-4" />
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
