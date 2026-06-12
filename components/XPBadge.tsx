'use client';

interface XPBadgeProps {
  xp: number;
}

export default function XPBadge({ xp }: XPBadgeProps) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 font-bold px-3 py-1 rounded-full text-sm border border-yellow-200">
      <span>⚡</span>
      <span>{xp.toLocaleString()} XP</span>
    </div>
  );
}
