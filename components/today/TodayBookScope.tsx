import Link from "next/link";
import { cardClass } from "@/components/ui/Card";

// 参考書順（Book mode）で進めている日の「今日の範囲」。本のどの章・節を学ぶ日かを1行で見せる。
// アプリ順の日は表示しない（呼び出し側が label を渡さない）。

export default function TodayBookScope({ label }: { label: string }) {
  return (
    <section aria-label="今日の参考書の範囲" className={cardClass("px-4 py-3")}>
      <p className="text-xs text-gray-500">今日の範囲（参考書の順）</p>
      <p className="mt-0.5 text-sm font-medium text-gray-900">{label}</p>
      <Link href="/plan" className="mt-1 inline-block text-xs text-brand-700 underline underline-offset-2">
        本の計画を見る
      </Link>
    </section>
  );
}
