import type { ProgressSummary } from "@/types/study";

const labels: Record<ProgressSummary["status"], string> = {
  not_started: "設定待ち",
  on_track: "順調",
  behind: "巻き返し優先",
  final_review: "直前復習"
};

export function StatusPill({ status }: { status: ProgressSummary["status"] }) {
  const className = status === "behind" ? "pill pill-danger" : status === "final_review" ? "pill pill-blue" : "pill";
  return <span className={className}>{labels[status]}</span>;
}
