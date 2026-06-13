import { stages } from "@/data/stages";
import type { UserProgress } from "@/types";
import StageCard, { type StageStatus } from "@/components/StageCard";

// 7日間のステージを縦に並べたマップ。
// クリア済み=clear / 挑戦中=current / 未解放=locked を進捗から判定する。
export default function ProgressMap({ progress }: { progress: UserProgress }) {
  function statusOf(dayNo: number): StageStatus {
    if (progress.completedDays.includes(dayNo)) return "clear";
    if (dayNo === progress.currentDay) return "current";
    return "locked";
  }

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => (
        <div key={stage.dayNo} className="relative">
          {/* ステージ間をつなぐ道（線） */}
          {i < stages.length - 1 && (
            <div
              className="absolute left-9 top-full z-0 h-3 w-0.5 bg-indigo-200"
              aria-hidden
            />
          )}
          <StageCard stage={stage} status={statusOf(stage.dayNo)} />
        </div>
      ))}
    </div>
  );
}
