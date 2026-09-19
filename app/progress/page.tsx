"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import { mergeAppState } from "@/lib/mergeAppState";
import { saveAppState } from "@/lib/storage";
import {
  fetchProgressBootstrap,
  getUserId,
  loadCachedProgressBootstrap,
  type ProgressBootstrapCache,
} from "@/lib/userSession";
import { getAllTopics } from "@/lib/content";
import { hasUsableReferenceBook, referenceBookProgress } from "@/lib/referenceBook";
import { useReferenceBook } from "@/lib/useReferenceBook";
import { daysUntilExam } from "@/lib/aiPlanner";
import { getStreakMeta } from "@/lib/streak";
import { getRankStatus } from "@/lib/rank";
import {
  buildCheckpointComparison,
  buildCheckpointGate,
  CHECKPOINTS,
  getCheckpoint,
  getCheckpointProgress,
} from "@/lib/checkpoints";
import { BADGES, buildBadgeStatuses } from "@/lib/badges";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import { getLessonHref } from "@/lib/learningCatalog";
import {
  getMochitGrowthStage,
  MOCHIT_GROWTH_STAGE_LABELS,
  nextMochitGrowthStageInfo,
} from "@/lib/mochit";
import {
  primaryImprovementLabel,
  readinessBandLabel,
} from "@/lib/examReadiness/presentation";
import { overallStatusLabel, type OverallStatus } from "@/types/integratedStatus";
import type { ExamReadinessResult } from "@/types/examReadiness";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";
import ProgressOverview, { type OverviewKpis } from "@/components/progress/ProgressOverview";
import ProgressGateCard from "@/components/progress/ProgressGateCard";
import {
  ReadinessBreakdownCard,
  RowListCard,
  StudyDaysCard,
  TopicReachCard,
  type UnlockRow,
} from "@/components/progress/ProgressDetailCards";
import t from "@/components/today/todayView.module.css";
import p from "@/components/progress/progressDashboard.module.css";

const PACE_TONE: Record<OverallStatus, "good" | "neutral" | "warn"> = {
  on_track: "good",
  slightly_delayed: "neutral",
  delayed: "warn",
  recovery_needed: "warn",
  consultation_needed: "warn",
};

function paceNote(delta: number | null): string {
  if (delta === null) return "試験日を決めると予定と比べます";
  if (delta > 0) return "予定より先を進んでいます";
  if (delta === 0) return "ほぼ予定どおりです";
  if (delta === -1) return "予定より少し後ろです";
  return "予定より後ろにいます";
}

/** いちばん伸ばせるところの取り組み先。判定の種類ごとに、既存の学習導線へつなぐ。 */
function improvementHref(result: ExamReadinessResult): string {
  const improvement = result.primaryImprovement;
  if (!improvement) return "/learn";
  switch (improvement.code) {
    case "take_summative_assessment":
      return "/mock-exam";
    case "review_weak_topic":
    case "improve_retention":
      return improvement.topicId
        ? getLessonHref(improvement.topicId, {
            from: "progress",
            activity: "review",
            anchor: "lesson-quiz",
          })
        : "/review";
    default:
      return "/learn";
  }
}

// 進捗画面。上から「合格までの道のり（全体像）→ いまの目標と合格準備度の内訳 → 詳細」の順に読む。
// 今日やること・所要時間・今日のミッションは /today に任せ、ここには置かない。
export default function ProgressPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  const { book: referenceBook } = useReferenceBook();
  // 前回のサーバー応答があれば即表示し（スケルトンを出さない）、最新値は背景で差し替える。
  // 初回描画は LoadingScreen（state===undefined）のため、遅延初期化でも hydration は一致する。
  const [bootstrap, setBootstrap] = useState<ProgressBootstrapCache | null>(() =>
    loadCachedProgressBootstrap(),
  );
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const bootstrappedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (state === undefined) return;

    let alive = true;
    const userId = getUserId();
    const key = userId ?? "session";
    if (bootstrappedKeyRef.current === key) return;
    bootstrappedKeyRef.current = key;
    setBootstrapLoading(true);

    void fetchProgressBootstrap(userId)
      .then((data) => {
        if (!alive) return;
        if (data) {
          setBootstrap({
            integratedStatus: data.integratedStatus,
            examReadiness: data.examReadiness,
            planAdjustmentProposal: data.planAdjustmentProposal,
          });
        }
        if (data?.userId) bootstrappedKeyRef.current = data.userId;

        if (data?.appState) {
          const next = state ? mergeAppState(state, data.appState) : data.appState;
          if (JSON.stringify(next) !== JSON.stringify(state)) {
            saveAppState(next);
            setState(next);
          }
        }
      })
      .finally(() => {
        if (alive) setBootstrapLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [state, setState]);

  useEffect(() => {
    if (state === null && !bootstrapLoading) router.replace("/onboarding");
  }, [state, bootstrapLoading, router]);

  if (state === undefined || state === null) {
    return <LoadingScreen />;
  }

  const { profile, progress } = state;
  const topics = getAllTopics();
  const readiness = bootstrap?.examReadiness ?? null;
  const status = bootstrap?.integratedStatus ?? null;
  const proposal = bootstrap?.planAdjustmentProposal ?? null;

  // ── 道のり ──
  const cpProgress = getCheckpointProgress(state);
  const current = getCheckpoint(cpProgress.currentCheckpointId);
  const gate = buildCheckpointGate(state, current.id);
  const comparison = buildCheckpointComparison(state);
  const expectedOrder = comparison ? getCheckpoint(comparison.expectedId).order : null;
  const gateRatio =
    gate.requiredBadgeCount > 0
      ? Math.min(1, gate.earnedRequiredCount / gate.requiredBadgeCount)
      : gate.finalExamUnlocked
        ? 1
        : 0;
  const nextCheckpoint = CHECKPOINTS.find((cp) => cp.order === current.order + 1) ?? null;

  const badgeStatuses = buildBadgeStatuses(state, getClientBadgeSignals(), current.id);
  const requiredStatuses = badgeStatuses.filter((status) => status.def.requiredForGate);
  const earnedRequired = requiredStatuses.filter((s) => s.earned).map((s) => s.def);
  const conditionMetIds = new Set(
    requiredStatuses.filter((s) => !s.earned && s.conditionMet).map((s) => s.def.id),
  );

  // ── 主要指標 ──
  const examDays = daysUntilExam(profile);
  const examDateLabel = profile?.examDate
    ? (() => {
        const d = new Date(`${profile.examDate}T00:00:00`);
        return `${d.getMonth() + 1}月${d.getDate()}日`;
      })()
    : null;
  const kpis: OverviewKpis = {
    readiness: {
      score: readiness?.score ?? null,
      bandLabel: readiness
        ? readiness.score === null
          ? "判定材料を集めています"
          : readinessBandLabel(readiness.band)
        : bootstrapLoading
          ? "読み込んでいます"
          : "問題に答えると判定します",
    },
    exam: { daysLeft: examDays, dateLabel: examDateLabel },
    pace: status
      ? {
          label: overallStatusLabel(status.overallStatus),
          note: paceNote(comparison?.delta ?? null),
          tone: PACE_TONE[status.overallStatus],
        }
      : comparison
        ? { label: paceNote(comparison.delta), note: "チェックポイントの予定と比べて", tone: "neutral" }
        : null,
    gate: {
      earned: Math.min(gate.earnedRequiredCount, gate.requiredBadgeCount),
      required: gate.requiredBadgeCount,
      checkpointOrder: current.order,
    },
    // 立て直し提案の本体は /plan に置く。ここでは提案があるときだけ導線にする。
    proposalHref: proposal && proposal.status !== "accepted" ? "/plan" : null,
  };

  const improvementLabel = readiness
    ? primaryImprovementLabel(readiness.primaryImprovement, readiness)
    : null;
  const improvement =
    readiness && improvementLabel
      ? { label: improvementLabel, href: improvementHref(readiness) }
      : null;

  // ── 次の解放・くわしく見る ──
  const rank = getRankStatus(progress.exp);
  const growthStage = getMochitGrowthStage(state);
  const nextGrowth = nextMochitGrowthStageInfo(state);
  const unlocks: UnlockRow[] = [];
  if (!rank.isMax && rank.next) {
    unlocks.push({
      id: "rank",
      title: `次のランク「${rank.next.name}」`,
      detail: `あと ${rank.remaining} XP（いまは「${rank.current.name}」）`,
      ratio: rank.ratio,
      href: "/rank",
    });
  }
  unlocks.push(
    nextGrowth
      ? {
          id: "mochit",
          title: `モチットの成長段階${nextGrowth.stage}「${MOCHIT_GROWTH_STAGE_LABELS[nextGrowth.stage]}」`,
          detail: nextGrowth.conditionLabel,
          ratio: cpProgress.clearedCheckpointIds.length / (nextGrowth.stage === 2 ? 2 : 4),
          href: "/avatar",
        }
      : {
          id: "mochit",
          title: `モチットは成長段階${growthStage}「${MOCHIT_GROWTH_STAGE_LABELS[growthStage]}」`,
          detail: "いちばん上の段階まで育ちました",
          href: "/avatar",
        },
  );
  const links: UnlockRow[] = [
    { id: "mock", title: "本番形式 100問模試", detail: "3分野の実力をまとめて確かめる", href: "/mock-exam" },
    { id: "report", title: "週間レポート", detail: "直近7日の積み上げを見る", href: "/report" },
    {
      id: "badges",
      title: "バッジ図鑑",
      detail: `${cpProgress.earnedBadges.length}/${BADGES.length} 獲得`,
      href: "/badges",
    },
    { id: "plan", title: "ロードマップ", detail: "チェックポイントの条件を見る", href: "/plan" },
  ];

  // 参考書インプットの内訳（未設定なら出さない）。
  const bookProgress =
    referenceBook && hasUsableReferenceBook(referenceBook)
      ? referenceBookProgress(referenceBook)
      : null;
  const referenceInput = bookProgress
    ? {
        percent: Math.round(bookProgress.ratio * 100),
        doneChapters: bookProgress.doneChapters,
        totalChapters: bookProgress.totalChapters,
      }
    : null;

  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日（${"日月火水木金土"[now.getDay()]}）`;

  return (
    <main className={t.view}>
      <div className={`${t.inner} ${p.dashboard}`}>
        <ProgressOverview
          dateLabel={dateLabel}
          checkpoints={CHECKPOINTS}
          clearedIds={cpProgress.clearedCheckpointIds}
          currentId={current.id}
          gateRatio={gateRatio}
          expectedOrder={expectedOrder}
          examDateLabel={examDateLabel}
          kpis={kpis}
        />

        <ProgressGateCard
          gate={gate}
          earnedBadges={earnedRequired}
          conditionMetIds={conditionMetIds}
          nextCheckpointTitle={nextCheckpoint?.title ?? null}
          className={p.spanGate}
        />
        <ReadinessBreakdownCard
          result={readiness}
          loading={bootstrapLoading}
          improvement={improvement}
          className={p.spanReadiness}
        />

        <TopicReachCard
          status={status}
          totalTopicCount={topics.length}
          loading={bootstrapLoading}
          referenceInput={referenceInput}
          className={p.spanTopics}
        />
        <StudyDaysCard
          answers={state.answers}
          streak={progress.streakCount}
          longestStreak={Math.max(getStreakMeta(progress).longestStreak, progress.streakCount)}
          className={p.spanHistory}
        />

        <RowListCard title="次の解放" rows={unlocks} className={p.spanUnlocks} />
        <RowListCard title="くわしく見る" rows={links} grid className={p.spanLinks} />
      </div>
      <BottomNav />
    </main>
  );
}
