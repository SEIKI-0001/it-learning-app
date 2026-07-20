// ストリーク（連続学習日数）の表示。日数が伸びるほど炎の色が深まる。
// 1-2日: 火種(柿) / 7日〜: 濃い柿 / 14日〜: 蒼 / 30日〜: 深藍。
// 状態表示なのでピル型を使う。装飾アニメーションは付けない。

import Icon from "@/components/ui/Icon";

function flameStage(days: number): { flame: string; title: string } {
  if (days >= 30) return { flame: "text-brand-800", title: "深藍の炎（30日〜）" };
  if (days >= 14) return { flame: "text-brand-600", title: "蒼い炎（14日〜）" };
  if (days >= 7) return { flame: "text-accent-700", title: "大きな炎（7日〜）" };
  if (days >= 1) return { flame: "text-accent-600", title: "小さな火種" };
  return { flame: "text-gray-400", title: "今日から点火" };
}

export default function StreakFlame({
  days,
  className = "",
}: {
  days: number;
  className?: string;
}) {
  const s = flameStage(days);
  return (
    <span
      title={s.title}
      className={`inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-gray-700 ${className}`}
    >
      <Icon name="flame" className={`h-4 w-4 ${s.flame}`} />
      <span className="text-xs font-semibold tabular-nums">{days}日連続</span>
    </span>
  );
}
