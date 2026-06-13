import { calculateLevel, getLevelRange } from "@/lib/game";

export default function ExpBar({ exp }: { exp: number }) {
  const level = calculateLevel(exp);
  const { min, next } = getLevelRange(level);
  const span = Math.max(1, next - min);
  const progress = Math.min(100, Math.round(((exp - min) / span) * 100));
  const isMax = level >= 5;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-indigo-100">
        <span>EXP</span>
        <span>{isMax ? `${exp}（MAX）` : `${exp} / ${next}`}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/25">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 transition-all duration-500"
          style={{ width: `${isMax ? 100 : progress}%` }}
        />
      </div>
    </div>
  );
}
