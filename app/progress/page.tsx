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
import { getAllTopics, getTopic } from "@/lib/content";
import { daysUntilExam } from "@/lib/aiPlanner";
import { fieldMastery } from "@/lib/study";
import { getStreakMeta, shieldsAvailable } from "@/lib/streak";
import { computeProgressSummary } from "@/lib/progressSummary";
import { getRankStatus } from "@/lib/rank";
import { getCheckpointProgress } from "@/lib/checkpoints";
import { BADGES } from "@/lib/badges";
import { getAvatarGrowthStage } from "@/lib/avatarGrowth";
import { getAvatarProfile, sanitizedEquipped } from "@/lib/avatarUnlocks";
import type { ReviewItem } from "@/types";
import AvatarRenderer from "@/components/avatar/AvatarRenderer";
import FieldMasteryBars from "@/components/FieldMasteryBars";
import BottomNav from "@/components/BottomNav";
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

// 短い日付("M/D")。不正な値は空文字。
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

type NextAction = {
  label: string;
  description: string;
  emoji: string;
  tone: string; // カードの配色
  href: string;
};

// 次に取るべき最小行動と、その行動に対応する遷移先を決める。
function decideNextAction(
  reviewCount: number,
  gap: number | null,
): NextAction {
  if (reviewCount > 0) {
    return {
      label: "復習",
      description: `リベンジ対象が${reviewCount}件。まず1件やっつけましょう。`,
      emoji: "🔁",
      tone: "from-amber-500 to-orange-500",
      href: "/review",
    };
  }
  if (gap !== null && gap >= 2) {
    return {
      label: "復帰",
      description: "少し空きました。1テーマだけ軽く戻りましょう。",
      emoji: "🌱",
      tone: "from-emerald-500 to-teal-500",
      href: "/today",
    };
  }
  return {
    label: "新規学習",
    description: "今日のテーマに進みましょう。1つだけでOKです。",
    emoji: "✨",
    tone: "from-indigo-500 to-violet-500",
    href: "/today",
  };
}

// 最後の学習からの状態ラベル(ストリーク切れは強調しない)。
function comebackLabel(gap: number | null): string {
  if (gap === null) return "これから";
  if (gap <= 1) return "継続中";
  if (gap <= 6) return "おかえりなさい";
  return "ゆっくり再開";
}

// 進捗画面。サマリ/習熟度の下に「次のアクション」「リベンジ対象」を配置した学習ホーム。
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
  const avatar = getAvatarProfile(state);
  const proposal = bootstrap?.planAdjustmentProposal ?? null;

  const reviewQueue = progress.reviewQueue ?? [];
  const reviewCount = reviewQueue.length;
  const gap = daysSince(progress.lastPlayedAt);

  const nextAction = decideNextAction(reviewCount, gap);
  const gapText =
    gap === null
      ? "学習はこれから"
      : gap === 0
        ? "今日学習しました"
        : `最後の学習から${gap}日`;

  // リベンジ対象: dueAtが近い順に最大3件。
  const revengeItems: ReviewItem[] = [...reviewQueue]
    .sort((a, b) => (a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : 0))
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-4 pt-5 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-4xl">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold">進捗</h1>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              {comebackLabel(gap)} · {gapText}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-4">
            {/* 合格準備度リング（統合進捗の readinessScore を正とする） */}
            <div className="shrink-0 text-center">
              <div
                className="grid h-20 w-20 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#fbbf24 ${overall * 3.6}deg, rgba(255,255,255,0.2) 0deg)`,
                }}
              >
                <div className="grid h-[66px] w-[66px] place-items-center rounded-full bg-indigo-600">
                  <span className="text-lg font-extrabold">{overall}%</span>
                </div>
              </div>
              <p className="mt-1 text-[10px] font-bold text-white/80">合格準備度</p>
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-white/70">試験日まで </span>
                <span className="font-extrabold">
                  {remaining === null ? "未設定" : `あと${remaining}日`}
                </span>
              </p>
              <p>
                <span className="text-white/70">連続学習 </span>
                <span className="font-extrabold">🔥 {progress.streakCount}日</span>
                {shieldsAvailable(getStreakMeta(progress)) > 0 && (
                  <span
                    className="ml-1.5 text-xs font-bold text-sky-200"
                    title="1日休んでも自動でストリークを守ります"
                  >
                    🛡️×{shieldsAvailable(getStreakMeta(progress))}
                  </span>
                )}
                {getStreakMeta(progress).longestStreak > progress.streakCount && (
                  <span className="ml-1.5 text-[10px] font-semibold text-white/60">
                    ベスト{getStreakMeta(progress).longestStreak}日
                  </span>
                )}
              </p>
              <p>
                <span className="text-white/70">ランク </span>
                <span className="font-extrabold">
                  {rank.current.emoji} {rank.current.name}
                </span>
              </p>
            </div>
            {/* 分身アイコン（アバター管理へ）。未作成でも作成導線として出す */}
            <Link
              href="/avatar"
              aria-label="アバター管理へ"
              className="ml-auto shrink-0 text-center transition active:scale-[0.97]"
            >
              <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-white/15 ring-2 ring-white/30">
                {avatar ? (
                  <AvatarRenderer
                    presetId={avatar.presetId}
                    equipped={sanitizedEquipped(state)}
                    stage={getAvatarGrowthStage(state)}
                    size={60}
                  />
                ) : (
                  <span className="text-2xl" aria-hidden>
                    🧑‍🎓
                  </span>
                )}
              </span>
              <span className="mt-1 block text-[10px] font-bold text-white/80">
                {avatar ? "分身をみる" : "分身を作る"}
              </span>
            </Link>
          </div>

          {/* ランク進捗(次のランクまで)。EXP/レベル表示はランクに統合した。 */}
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-indigo-100">
              <span>{rank.isMax ? "最高ランク" : `次は ${rank.next!.emoji} ${rank.next!.name}`}</span>
              <span className="font-semibold">
                {rank.isMax ? `${progress.exp} XP（MAX）` : `あと ${rank.remaining} XP`}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 transition-all duration-500"
                style={{ width: `${Math.round(rank.ratio * 100)}%` }}
              />
            </div>
            <Link
              href="/rank"
              className="mt-1.5 inline-block text-[11px] font-bold text-white/80"
            >
              ランクの全体像をみる →
            </Link>
          </div>

          {/* バッジ獲得状況(ロードマップのバッジ体系に一本化) */}
          <Link
            href="/badges"
            className="mt-3 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/90 transition active:scale-[0.99]"
          >
            <span>🏅 バッジ {earnedBadgeCount}/{BADGES.length}</span>
            <span>バッジ図鑑をみる →</span>
          </Link>

          {/* アカウント: ログアウト（ローカルデータ消去 → Google / LINE セッション破棄 → /login） */}
          <div className="mt-3 text-right">
            <LogoutLink className="text-[11px] font-semibold text-white/70 underline underline-offset-4" />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-4 px-4 py-4 md:max-w-4xl">
        {/* 統合進捗カード（合格に対する現在地・主なリスク・今週の推奨配分） */}
        <IntegratedStatusCard
          status={bootstrap?.integratedStatus ?? null}
          loading={bootstrapLoading && !bootstrap}
        />

        {/* あと少しのゴール（目標勾配の可視化） */}
        <NextGoalCard state={state} />

        {/* 計画の立て直し提案への導線（提案の本体は /plan に置く） */}
        {proposal && (
          <Link
            href="/plan"
            className={`flex items-center justify-between rounded-2xl p-4 shadow-sm ring-1 transition active:scale-[0.99] ${
              proposal.status === "accepted"
                ? "bg-emerald-50 ring-emerald-200"
                : "bg-amber-50 ring-amber-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden>
                🛠️
              </span>
              <div>
                <p className="text-sm font-extrabold text-gray-800">
                  {proposal.status === "accepted"
                    ? "立て直しプランで進行中"
                    : "計画の立て直し提案があります"}
                </p>
                <p className="text-xs text-gray-500">
                  {proposal.status === "accepted"
                    ? "内容はロードマップで確認できます"
                    : "ロードマップで立て直し案を選べます"}
                </p>
              </div>
            </div>
            <span className="text-lg font-extrabold text-amber-600">→</span>
          </Link>
        )}

        {/* 数値サマリ */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="学習済み" value={`${completedCount}/${topics.length}`} />
          <StatCard label="復習待ち" value={`${reviewCount}`} />
          <StatCard label="累計XP" value={`${progress.exp}`} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
        {/* 3分野習熟度 */}
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-3 text-base font-extrabold text-gray-800">
            3分野別の習熟度
          </h2>
          <FieldMasteryBars mastery={mastery} />
        </section>

        {/* 次のアクション（カード全体が行動に対応するCTA） */}
        <Link
          href={nextAction.href}
          className={`block rounded-2xl bg-gradient-to-r ${nextAction.tone} p-4 text-white shadow-md transition active:scale-[0.99]`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{nextAction.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/80">
                次のアクション · 2〜5分
              </p>
              <p className="text-lg font-extrabold leading-tight">
                {nextAction.label}
              </p>
            </div>
            <span className="text-xl font-extrabold">→</span>
          </div>
          <p className="mt-2 text-sm text-white/90">{nextAction.description}</p>
        </Link>

        <Link
          href="/mock-exam"
          className="block rounded-2xl border border-violet-200 bg-violet-50 p-4 transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>🧪</span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold text-violet-900">本番形式 100問模試</p>
              <p className="mt-0.5 text-xs font-semibold text-violet-700">3分野の実力をまとめて確認する</p>
            </div>
            <span className="text-lg font-extrabold text-violet-700">→</span>
          </div>
        </Link>

        {/* リベンジ対象 */}
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-800">
              リベンジ対象
            </h2>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              {reviewCount}件
            </span>
          </div>

          {reviewCount === 0 ? (
            <p className="mt-2 text-sm text-gray-400">
              いまリベンジ対象はありません。間違えた問題はここに集まります。
            </p>
          ) : (
            <>
              <ul className="mt-2 space-y-2">
                {revengeItems.map((item, i) => {
                  const topic = getTopic(item.topicId);
                  const due = shortDate(item.dueAt);
                  return (
                    <li
                      key={`${item.topicId}-${i}`}
                      className="rounded-xl bg-amber-50/60 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-gray-800">
                          {topic?.title ?? "確認問題"}
                        </span>
                        {due && (
                          <span className="shrink-0 text-xs text-amber-700">
                            期限 {due}
                          </span>
                        )}
                      </div>
                      {item.reason && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {item.reason}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/review"
                className="mt-3 block rounded-xl bg-amber-500 px-6 py-2.5 text-center text-sm font-extrabold text-white shadow transition active:scale-[0.98]"
              >
                リベンジする
              </Link>
            </>
          )}
        </section>

        {/* 今週の積み上げは別ページ(週間レポート)へ */}
        <Link
          href="/report"
          className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>
              📊
            </span>
            <div>
              <p className="text-base font-extrabold text-gray-800">週間レポート</p>
              <p className="text-xs text-gray-500">直近7日間の積み上げをみる</p>
            </div>
          </div>
          <span className="text-lg font-extrabold text-emerald-500">→</span>
        </Link>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-gray-100">
      <p className="text-xl font-extrabold text-gray-800">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  );
}
