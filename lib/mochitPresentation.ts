import type { MochitAnimation, MochitState } from "@/components/mochit/Mochit";

export type MochitPresentation = { state: MochitState; animation: MochitAnimation; message: string; action?: { href: string; label: string } };

export function getMochitResultPresentation(args: { checkpointCleared: boolean; correct: number; total: number }): MochitPresentation {
  if (args.checkpointCleared) return { state: "cheering", animation: "celebrate", message: "チェックポイント達成！次の学びへ進もう" };
  if (args.total > 0 && args.correct === args.total) return { state: "happy", animation: "bounce", message: "いいね。知識がつながってきた！" };
  return { state: "thinking", animation: "tilt", message: "惜しい。考え方を一緒に整理しよう" };
}

export function getMochitProgressPresentation(args: { readinessScore: number; currentCheckpointId: string; reviewCount: number; planAdjustmentProposal: boolean; lastPlayedAt?: string }): MochitPresentation {
  if (args.planAdjustmentProposal) return { state: "thinking", animation: "tilt", message: "少し遅れているよ。今日は最優先の1件に集中しよう", action: { href: "/today", label: "今日の学習を見る" } };
  if (args.reviewCount >= 3) return { state: "thinking", animation: "tilt", message: `復習が${args.reviewCount}件あるよ。まずは3件だけ進めよう`, action: { href: "/review", label: "復習を見る" } };
  if (args.readinessScore >= 100) return { state: "happy", animation: "bounce", message: "合格準備は整ったよ。最後の確認をして本番へ進もう", action: { href: "/plan", label: "計画を見る" } };
  if (args.readinessScore >= 80) return { state: "happy", animation: "bounce", message: "合格が見えてきたね。苦手分野を仕上げよう", action: { href: "/review", label: "復習を見る" } };
  if (args.readinessScore <= 0) return { state: "normal", animation: "idle", message: "ここから一緒に合格率を上げていこう。まずは1問から始めよう", action: { href: "/today", label: "今日の学習を見る" } };
  return { state: "normal", animation: "idle", message: "順調に進んでいるよ。この調子で今日の学習を続けよう", action: { href: "/today", label: "今日の学習を見る" } };
}
