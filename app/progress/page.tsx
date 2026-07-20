"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { daysUntilExam } from "@/lib/aiPlanner";
import { fieldMastery } from "@/lib/study";
import { getStreakMeta, shieldsAvailable } from "@/lib/streak";
import { computeProgressSummary } from "@/lib/progressSummary";
import { getRankStatus } from "@/lib/rank";
import { getCheckpointProgress } from "@/lib/checkpoints";
import { BADGES } from "@/lib/badges";
import Mochit from "@/components/mochit/Mochit";
import { getMochitGrowthStage } from "@/lib/mochit";
import { getMochitProgressPresentation } from "@/lib/mochitPresentation";
import FieldMasteryBars from "@/components/FieldMasteryBars";
import BottomNav from "@/components/BottomNav";
import Icon from "@/components/ui/Icon";
import IntegratedStatusCard from "@/components/progress/IntegratedStatusCard";
import NextGoalCard from "@/components/today/NextGoalCard";
import LoadingScreen from "@/components/LoadingScreen";
import LogoutLink from "@/components/auth/LogoutLink";

// 最後の学習からの経過日数(暦日ベース)。lastPlayedAtが無ければnull。
function daysSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  const startOfThen = new Date(
    then.getFullYear(),
    then.getMonth(),
    then.getDate(),
  ).getTime();
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const diff = Math.floor((startOfToday - startOfThen) / 86_400_000);
  return diff < 0 ? 0 : diff;
}

// 最後の学習からの状態ラベル(ストリーク切れは強調しない)。
function comebackLabel(gap: number | null): string {
  if (gap === null) return "これから";
  if (gap <= 1) return "継続中";
  if (gap <= 6) return "おかえりなさい";
  return "ゆっくり再開";
}

// 進捗画面。合格に対する現在地と数値サマリ/習熟度に絞る（復習の実行は /review に集約）。
export default function ProgressPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
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

    void fetchProgressBootstrap(userId).then((data) => {
      if (!alive) return;
      if (data) {
        setBootstrap({
          integratedStatus: data.integratedStatus,
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
    }).finally(() => {
      if (alive) setBootstrapLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [state, setState]);

  useEffect(() => {
    if (state === null && !bootstrapLoading) router.replace("/onboarding");
  }, [state, bootstrapLoading, router]);

  if (state === undefined || (state === null && bootstrapLoading)) {
    return <LoadingScreen />;
  }

  if (state === null) {
    return <LoadingScreen />;
  }

  const { profile, progress } = state;
  const rank = getRankStatus(progress.exp);
  const topics = getAllTopics();
  const remaining = daysUntilExam(profile);
  const mastery = fieldMastery(progress, topics, state.answers);
  const summary = computeProgressSummary(topics, progress, state.answers);
  const completedCount = summary.completedCount;
  // 合格準備度は統合進捗(readinessScore)を正とする。
  // 未取得（未ログイン・Supabase未設定・読込中失敗）のときだけローカル推定にフォールバック。
  const overall = bootstrap?.integratedStatus?.readinessScore ?? summary.readinessPct;
  const earnedBadgeCount = getCheckpointProgress(state).earnedBadges.length;
  const proposal = bootstrap?.planAdjustmentProposal ?? null;

  const reviewQueue = progress.reviewQueue ?? [];
  const reviewCount = reviewQueue.length;
  const gap = daysSince(progress.lastPlayedAt);
  const mochit = getMochitProgressPresentation({ readinessScore: overall, currentCheckpointId: getCheckpointProgress(state).currentCheckpointId, reviewCount, planAdjustmentProposal: !!proposal, lastPlayedAt: progress.lastPlayedAt });

  const gapText =
    gap === null
      ? "学習はこれから"
      : gap === 0
        ? "今日学習しました"
        : `最後の学習から${gap}日`;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="border-b border-gray-200 bg-white px-4 pb-5 pt-5">
        <div className="mx-auto w-full max-w-md md:max-w-4xl">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">進捗</h1>
            <p className="text-xs text-gray-500">
              {comebackLabel(gap)}・{gapText}
            </p>
          </div>

          {/* 学習手帳: /today と同じ台帳ブロックで現在地を示す */}
          <dl className="mt-4 grid grid-cols-3 divide-x divide-gray-200 border-y border-gray-200">
            <div className="py-3 pr-3">
              <dt className="text-xs text-gray-500">試験まで</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {remaining === null ? (
                  <span className="text-base font-normal text-gray-500">未設定</span>
                ) : (
                  <>
                    あと{remaining}
                    <span className="ml-0.5 text-sm font-normal text-gray-500">日</span>
                  </>
                )}
              </dd>
            </div>
            <div className="px-3 py-3">
              <dt className="text-xs text-gray-500">合格準備度</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {overall}
                <span className="ml-0.5 text-sm font-normal text-gray-500">%</span>
              </dd>
              <div
                className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-label="合格準備度"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={overall}
              >
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${overall}%` }} />
              </div>
            </div>
            <div className="py-3 pl-3">
              <dt className="text-xs text-gray-500">連続学習</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {progress.streakCount}
                <span className="ml-0.5 text-sm font-normal text-gray-500">日</span>
              </dd>
              <p className="mt-1 text-[11px] text-gray-500">
                {shieldsAvailable(getStreakMeta(progress)) > 0 && (
                  <span title="1日休んでも自動でストリークを守ります">
                    おまもり ×{shieldsAvailable(getStreakMeta(progress))}
                  </span>
                )}
                {getStreakMeta(progress).longestStreak > progress.streakCount && (
                  <span className="ml-1">ベスト{getStreakMeta(progress).longestStreak}日</span>
                )}
              </p>
            </div>
          </dl>

          {/* モチット: 現在地への一言。タップでアバター管理へ */}
          <Link
            href="/avatar"
            className="mt-3 flex items-center gap-1 transition active:scale-[0.99]"
          >
            <Mochit
              state={mochit.state}
              animation={mochit.animation}
              size="small"
              growthStage={getMochitGrowthStage(state)}
              message={mochit.message}
              className="min-w-0 flex-1"
            />
            <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-gray-300" />
            <span className="sr-only">モチットを見る</span>
          </Link>

          {/* ランク進捗(次のランクまで)。EXP/レベル表示はランクに統合した。 */}
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
              <span>
                ランク <span className="font-semibold text-gray-900">{rank.current.name}</span>
                {!rank.isMax && ` ─ 次は${rank.next!.name}`}
              </span>
              <span className="tabular-nums">
                {rank.isMax ? `${progress.exp} XP（MAX）` : `あと ${rank.remaining} XP`}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-500"
                style={{ width: `${Math.round(rank.ratio * 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <Link
                href="/rank"
                className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
              >
                ランクの全体像をみる
              </Link>
              <Link
                href="/badges"
                className="tabular-nums text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
              >
                バッジ図鑑 {earnedBadgeCount}/{BADGES.length}
              </Link>
            </div>
          </div>

          {/* アカウント: ログアウト（ローカルデータ消去 → Google / LINE セッション破棄 → /login） */}
          <div className="mt-3 text-right">
            <LogoutLink className="text-[11px] text-gray-400 underline underline-offset-4" />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-4 px-4 py-4 md:max-w-4xl">
        {/* 統合進捗カード（合格に対する現在地・主なリスク・今週の推奨配分） */}
        <IntegratedStatusCard
          status={bootstrap?.integratedStatus ?? null}
          totalTopicCount={topics.length}
          loading={bootstrapLoading && !bootstrap}
        />

        {/* あと少しのゴール（目標勾配の可視化） */}
        <NextGoalCard state={state} />

        {/* 計画の立て直し提案への導線（提案の本体は /plan に置く） */}
        {proposal && (
          <Link
            href="/plan"
            className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition active:scale-[0.99] ${
              proposal.status === "accepted"
                ? "border-emerald-200 bg-emerald-50"
                : "border-accent-200 bg-accent-50"
            }`}
          >
            <div>
              <p
                className={`text-sm font-semibold ${
                  proposal.status === "accepted" ? "text-emerald-800" : "text-accent-800"
                }`}
              >
                {proposal.status === "accepted"
                  ? "立て直しプランで進行中"
                  : "計画の立て直し提案があります"}
              </p>
              <p
                className={`mt-0.5 text-xs ${
                  proposal.status === "accepted" ? "text-emerald-700" : "text-accent-700"
                }`}
              >
                {proposal.status === "accepted"
                  ? "内容はロードマップで確認できます"
                  : "ロードマップで立て直し案を選べます"}
              </p>
            </div>
            <Icon
              name="chevron-right"
              className={`h-4 w-4 shrink-0 ${
                proposal.status === "accepted" ? "text-emerald-600" : "text-accent-600"
              }`}
            />
          </Link>
        )}

        {/* 数値サマリ */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="学習済み" value={`${completedCount}/${topics.length}`} />
          <StatCard label="復習待ち" value={`${reviewCount}`} href="/review" />
          <StatCard label="累計XP" value={`${progress.exp}`} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
        {/* 3分野習熟度 */}
        <section className="rounded-xl bg-white p-4 border border-gray-200">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            3分野別の習熟度
          </h2>
          <FieldMasteryBars mastery={mastery} />
        </section>

        <Link
          href="/mock-exam"
          className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50 active:scale-[0.99]"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">本番形式 100問模試</p>
            <p className="mt-0.5 text-xs text-gray-500">3分野の実力をまとめて確認する</p>
          </div>
          <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-gray-300" />
        </Link>

        {/* 今週の積み上げは別ページ(週間レポート)へ */}
        <Link
          href="/report"
          className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50 active:scale-[0.99]"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">週間レポート</p>
            <p className="mt-0.5 text-xs text-gray-500">直近7日間の積み上げをみる</p>
          </div>
          <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-gray-300" />
        </Link>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-xl font-semibold tabular-nums text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </>
  );
  const className =
    "rounded-xl bg-white p-3 text-center border border-gray-200";
  if (href) {
    return (
      <Link href={href} className={`${className} block transition active:scale-[0.98]`}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
