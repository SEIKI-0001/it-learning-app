import type { MochitAnimation, MochitState } from "@/components/mochit/Mochit";
import {
  primaryImprovementLabel,
  readinessResultLabel,
} from "@/lib/examReadiness/presentation";
import type { ExamReadinessResult } from "@/types/examReadiness";

export type MochitPresentation = { state: MochitState; animation: MochitAnimation; message: string; action?: { href: string; label: string } };

export function getMochitResultPresentation(args: { checkpointCleared: boolean; correct: number; total: number }): MochitPresentation {
  if (args.checkpointCleared) return { state: "cheering", animation: "celebrate", message: "チェックポイント達成！次の学びへ進もう" };
  if (args.total > 0 && args.correct === args.total) return { state: "happy", animation: "bounce", message: "いいね。知識がつながってきた！" };
  return { state: "thinking", animation: "tilt", message: "惜しい。考え方を一緒に整理しよう" };
}

export function getMochitProgressPresentation(args: { readiness: ExamReadinessResult | null; currentCheckpointId: string; reviewCount: number; planAdjustmentProposal: boolean; lastPlayedAt?: string }): MochitPresentation {
  if (args.planAdjustmentProposal) return { state: "thinking", animation: "tilt", message: "少し遅れているよ。今日は最優先の1件に集中しよう", action: { href: "/today", label: "今日の学習を見る" } };
  if (args.reviewCount >= 3) return { state: "thinking", animation: "tilt", message: `復習が${args.reviewCount}件あるよ。まずは3件だけ進めよう`, action: { href: "/review", label: "復習を見る" } };
  if (!args.readiness) return { state: "normal", animation: "idle", message: "合格準備度は測定中だよ。まずは1問から始めよう", action: { href: "/today", label: "今日の学習を見る" } };

  const improvement = primaryImprovementLabel(
    args.readiness.primaryImprovement,
    args.readiness,
  );
  const summary = `合格準備度 ${readinessResultLabel(args.readiness)}`;
  const next = improvement ? `次は${improvement}` : "最後の確認を続けよう";

  if (args.readiness.band === "stable" || args.readiness.band === "ready") {
    return { state: "happy", animation: "bounce", message: `${summary}。${next}`, action: { href: "/plan", label: "計画を見る" } };
  }
  if (args.readiness.band === "measuring") {
    return { state: "normal", animation: "idle", message: `${summary}。${next}`, action: { href: "/today", label: "今日の学習を見る" } };
  }
  return { state: "normal", animation: "idle", message: `${summary}。${next}`, action: { href: "/today", label: "今日の学習を見る" } };
}
