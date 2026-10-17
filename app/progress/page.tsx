"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { hasUsableReferenceBook, referenceReadingOverview } from "@/lib/referenceBook";
import { useReferenceBook } from "@/lib/useReferenceBook";
import { daysUntilExam } from "@/lib/aiPlanner";
import { getStreakMeta } from "@/lib/streak";
import { getRankStatus } from "@/lib/rank";
import {
  buildCheckpointGate,
  CHECKPOINTS,
  getCheckpoint,
  getCheckpointProgress,
  getCheckpointStage,
  type CheckpointStage,
} from "@/lib/checkpoints";
import { buildCheckpointDetail } from "@/lib/checkpointDetail";
import type { CheckpointId } from "@/types/checkpoint";
import { computeStudyPace, getPinnedPace, paceSummary } from "@/lib/studyPace";
import { buildBadgeStatuses } from "@/lib/badges";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import { getLessonHref } from "@/lib/learningCatalog";
import {
  primaryImprovementLabel,
  readinessBandLabel,
} from "@/lib/examReadiness/presentation";
import type { ExamReadinessResult } from "@/types/examReadiness";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";
import type { OverviewKpis } from "@/components/progress/ProgressOverview";
import CheckpointDetailSheet from "@/components/progress/CheckpointDetailSheet";
import FirstRunGuide from "@/components/guide/FirstRunGuide";
import {
  ReadingDetailCard,
  recentStudySummary,
  StudyDaysCard,
  TopicReachCard,
} from "@/components/progress/ProgressDetailCards";
import {
  LinkRow,
  MetricTiles,
  MiniBar,
  MiniStack,
  RoadCard,
  SummaryCard,
  WeekDots,
  type MetricTile,
} from "@/components/progress/ProgressCompact";
import c from "@/components/progress/progressCompact.module.css";
import t from "@/components/today/todayView.module.css";

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
  // 詳細シートで開いている CP（閉じているときは null）。
  const [openCheckpointId, setOpenCheckpointId] = useState<CheckpointId | null>(null);
  const closeCheckpoint = useCallback(() => setOpenCheckpointId(null), []);
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
  const stages = Object.fromEntries(
    CHECKPOINTS.map((cp) => [cp.id, getCheckpointStage(cpProgress, cp.id)]),
  ) as Record<CheckpointId, CheckpointStage>;

  const badgeSignals = getClientBadgeSignals();
  const badgeStatuses = buildBadgeStatuses(state, badgeSignals, current.id);
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
          : "確認問題に答えると、100点満点で判定が始まります",
    },
    exam: { daysLeft: examDays, dateLabel: examDateLabel },
    // 学習ペースは Today と同じ物差し（試験日からの逆算）。総合ステータスは立て直し提案の判定に、
    // CP予定との差はロードマップに使う。
    pace: paceSummary(
      getPinnedPace(state) ??
        (() => {
          const computed = computeStudyPace({ profile, progress, topics });
          return computed ? { status: computed.status, minutes: computed.todayMinutes } : null;
        })(),
    ),
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

  // 参考書の読了状況（未設定なら出さない）。
  const reading =
    referenceBook && hasUsableReferenceBook(referenceBook)
      ? referenceReadingOverview(referenceBook)
      : null;

  const openDetail = openCheckpointId
    ? buildCheckpointDetail(state, openCheckpointId, badgeSignals)
    : null;
  const openIndex = openCheckpointId ? CHECKPOINTS.findIndex((cp) => cp.id === openCheckpointId) : -1;

  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}/${now.getDate()} 時点`;

  // ── 指標タイル（押すと下に詳細を開く） ──
  const study = recentStudySummary(state.answers, now);
  const totalTopics = topics.length;
  const share = (n: number) => (totalTopics > 0 ? (n / totalTopics) * 100 : 0);
  const tiles: MetricTile[] = [
    {
      id: "topics",
      label: "理解したトピック",
      value: status ? (
        <>
          {status.basicUnderstoodTopicCount}
          <small>/{totalTopics}</small>
        </>
      ) : (
        "—"
      ),
      sub:
        status && status.weakTopicCount > 0 ? (
          <span className={c.tileWarn}>苦手 {status.weakTopicCount}件</span>
        ) : status ? (
          `本番対応OK ${status.examReadyTopicCount}`
        ) : (
          "問題に答えると出ます"
        ),
      visual: status ? (
        <MiniStack
          parts={[
            { value: share(status.examReadyTopicCount), tone: "ready" },
            {
              value: share(Math.max(0, status.basicUnderstoodTopicCount - status.examReadyTopicCount)),
              tone: "basic",
            },
            { value: share(status.reviewNeededTopicCount + status.weakTopicCount), tone: "work" },
          ]}
        />
      ) : null,
      detail: <TopicReachCard status={status} totalTopicCount={totalTopics} loading={bootstrapLoading} />,
    },
    {
      id: "days",
      label: "学習した日",
      value: (
        <>
          {study.studyDays}
          <small>日</small>
        </>
      ),
      sub: progress.streakCount > 0 ? `${progress.streakCount}日連続` : "直近8週",
      visual: <WeekDots days={study.last7} />,
      detail: (
        <StudyDaysCard
          answers={state.answers}
          streak={progress.streakCount}
          longestStreak={Math.max(getStreakMeta(progress).longestStreak, progress.streakCount)}
        />
      ),
    },
    ...(reading && referenceBook
      ? [
          {
            id: "book",
            label: "参考書",
            value: (
              <>
                {Math.round(reading.progress.ratio * 100)}
                <small>%</small>
              </>
            ),
            sub: (() => {
              const next = reading.chapters.find((ch) => ch.id === reading.nextChapterId);
              return next ? `次 ${next.title}` : "読了";
            })(),
            visual: <MiniBar percent={Math.round(reading.progress.ratio * 100)} />,
            detail: <ReadingDetailCard bookTitle={referenceBook.title} overview={reading} />,
          },
        ]
      : []),
  ];

  const compactLinks = [
    { id: "journal", title: "学習の記録", href: "/journal" },
    { id: "report", title: "週間レポート", href: "/report" },
    { id: "mock", title: "100問模試", href: "/mock-exam" },
    { id: "plan", title: "ロードマップ", href: "/plan" },
    { id: "mochit", title: "モチット", meta: `Lv.${rank.level}`, href: "/avatar#growth" },
  ];

  return (
    <main className={t.view}>
      <div className={`${t.inner} ${c.layout}`}>
        <h1 className="sr-only">進捗</h1>
        <SummaryCard
          dateLabel={dateLabel}
          readiness={readiness}
          readinessNote={
            readiness?.score != null ? kpis.readiness.bandLabel : "問題に答えると判定が始まります"
          }
          improvement={improvement}
          exam={kpis.exam}
          pace={kpis.pace}
          proposalHref={kpis.proposalHref}
          className={c.spanSummary}
        />
        <RoadCard
          checkpoints={CHECKPOINTS}
          stages={stages}
          current={current}
          gate={gate}
          earnedBadges={earnedRequired}
          conditionMetIds={conditionMetIds}
          examDateLabel={profile?.examDate ? (() => {
            const d = new Date(`${profile.examDate}T00:00:00`);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          })() : null}
          onSelectCheckpoint={setOpenCheckpointId}
          className={c.spanRoad}
        />
        <MetricTiles tiles={tiles} className={c.spanFull} />
        <LinkRow links={compactLinks} className={c.spanFull} />
      </div>
      {openDetail && (
        <CheckpointDetailSheet
          detail={openDetail}
          onClose={closeCheckpoint}
          onPrev={openIndex > 0 ? () => setOpenCheckpointId(CHECKPOINTS[openIndex - 1].id) : null}
          onNext={
            openIndex >= 0 && openIndex < CHECKPOINTS.length - 1
              ? () => setOpenCheckpointId(CHECKPOINTS[openIndex + 1].id)
              : null
          }
        />
      )}
      <BottomNav />
      <FirstRunGuide guide="progress" />
    </main>
  );
}
