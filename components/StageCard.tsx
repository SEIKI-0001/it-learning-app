import type { Stage } from "@/data/stages";

export type StageStatus = "clear" | "current" | "locked";

export default function StageCard({
  stage,
  status,
}: {
  stage: Stage;
  status: StageStatus;
}) {
  const locked = status === "locked";
  const current = status === "current";
  const clear = status === "clear";

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl p-4 shadow-sm transition",
        locked ? "bg-gray-100 text-gray-400" : "text-white",
        current ? "ring-4 ring-amber-300 ring-offset-2" : "",
      ].join(" ")}
    >
      {/* 背景グラデーション（ロック時はグレー） */}
      {!locked && (
        <div
          className={`absolute inset-0 -z-10 bg-gradient-to-br ${stage.accent}`}
          aria-hidden
        />
      )}

      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
            locked ? "bg-gray-200" : "bg-white/20"
          }`}
        >
          {locked ? "🔒" : stage.emoji}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                locked ? "bg-gray-200 text-gray-500" : "bg-white/25"
              }`}
            >
              Day {stage.dayNo}
            </span>
            {clear && (
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-extrabold text-green-600">
                ✓ CLEAR
              </span>
            )}
            {current && (
              <span className="animate-pop-in rounded-full bg-amber-300 px-2 py-0.5 text-xs font-extrabold text-amber-900">
                ★ いまここ
              </span>
            )}
          </div>

          <h3 className="mt-1 truncate text-base font-extrabold">
            {stage.stageName}
          </h3>
          <p
            className={`mt-0.5 text-xs leading-relaxed ${
              locked ? "text-gray-400" : "text-white/90"
            }`}
          >
            {locked ? "前の日をクリアすると解放されます" : stage.blurb}
          </p>
        </div>
      </div>
    </div>
  );
}
