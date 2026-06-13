import { getLevelName } from "@/lib/game";

const LEVEL_EMOJI: Record<number, string> = {
  1: "🌱",
  2: "🛠️",
  3: "🧭",
  4: "🛡️",
  5: "⚔️",
};

export default function LevelBadge({
  level,
  size = "md",
}: {
  level: number;
  size?: "sm" | "md" | "lg";
}) {
  const emoji = LEVEL_EMOJI[level] ?? "🌱";
  const pad = size === "lg" ? "px-4 py-2" : size === "sm" ? "px-2 py-1" : "px-3 py-1.5";
  const text = size === "lg" ? "text-base" : "text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/90 font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-100 ${pad} ${text}`}
    >
      <span aria-hidden>{emoji}</span>
      <span>Lv.{level}</span>
      <span className="font-medium text-indigo-400">{getLevelName(level)}</span>
    </span>
  );
}
