// ストリーク（連続学習日数）の炎。日数が伸びるほど炎が育つ（色・大きさ・光）。
// 1-2日: 小さな火種 / 3-6日: 育ちはじめ / 7-13日: 大きな炎(光) /
// 14-29日: 蒼い炎 / 30日〜: 紫の炎(シーン)。CSSのみで表現する。

function flameStage(days: number): {
  pill: string;
  flame: string;
  extra: string;
  title: string;
} {
  if (days >= 30)
    return {
      pill: "bg-purple-100 text-purple-700 ring-purple-200",
      flame: "text-2xl",
      extra: " animate-sheen",
      title: "紫の炎（30日〜）",
    };
  if (days >= 14)
    return {
      pill: "bg-sky-100 text-sky-700 ring-sky-200",
      flame: "text-2xl",
      extra: "",
      title: "蒼い炎（14日〜）",
    };
  if (days >= 7)
    return {
      pill: "bg-orange-100 text-orange-700 ring-orange-200",
      flame: "text-xl",
      extra: " animate-glow-ring",
      title: "大きな炎（7日〜）",
    };
  if (days >= 3)
    return {
      pill: "bg-orange-50 text-orange-600 ring-orange-200",
      flame: "text-lg",
      extra: "",
      title: "育ちはじめの炎（3日〜）",
    };
  if (days >= 1)
    return {
      pill: "bg-amber-50 text-amber-600 ring-amber-200",
      flame: "text-base",
      extra: "",
      title: "小さな火種",
    };
  return {
    pill: "bg-gray-100 text-gray-500 ring-gray-200",
    flame: "text-base",
    extra: "",
    title: "今日から点火",
  };
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ring-1 ${s.pill}${s.extra} ${className}`}
    >
      <span className={s.flame} aria-hidden>
        🔥
      </span>
      <span className="text-sm font-bold">{days}日連続</span>
    </span>
  );
}
