import { roundHours, type StudyTimeProjection } from "@/lib/onboardingProjection";

// 「試験日までに使える時間」と「合格の目安」を1本のバーで比べる。選び直すとその場で伸び縮みする。
export default function ProjectionMeter({ projection }: { projection: StudyTimeProjection }) {
  const { availableMinutes, requiredMinutes, level } = projection;
  if (availableMinutes === null) return null;
  // 目安の線をバーの 2/3 の位置に置き、使える時間がそれを越えるかで見せる。
  const scale = requiredMinutes * 1.5;
  const width = Math.min(100, (availableMinutes / scale) * 100);
  const goal = (requiredMinutes / scale) * 100;
  const color = level === "sprint" ? "#e0a12b" : "#1a9a66";
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-gray-600">試験日までの学習時間</span>
        <span className="font-bold tabular-nums text-gray-900">
          約{roundHours(availableMinutes)}時間
        </span>
      </div>
      <div className="ob-meter mt-2.5" aria-hidden>
        <span style={{ width: `${width}%`, background: color }} />
        <i className="ob-meter-goal" style={{ left: `${goal}%` }} />
      </div>
      <p className="mt-1.5 text-right text-xs text-gray-500">
        ｜ 合格の目安 約{roundHours(requiredMinutes)}時間
      </p>
    </div>
  );
}
