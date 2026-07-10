"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetAppState } from "@/lib/storage";
import { useAppState } from "@/lib/useAppState";

// 検証用の簡易管理画面（ITパスポート学習コーチ）。
// アクセス制御は proxy.ts の Basic 認証で前段に実施（ADMIN_PASSWORD）。
// 7日固定モデル(Day funnel / current_day)の指標は撤去済み。

type TopicMastery = {
  topicId: string;
  title: string;
  fieldLabel: string;
  learners: number;
  avgMastery: number;
};

type Summary = {
  ok: boolean;
  overview: {
    totalUsers: number;
    examDateUsers: number;
    todayStudyUsers: number;
    todayAnswers: number;
    reviewQueueUsers: number;
  };
  accuracy: { averageAccuracy: number; correctAnswers: number; totalAnswers: number };
  topicMastery: TopicMastery[];
  weakFields: { field: string; label: string; count: number }[];
  weakTagRanking: { tag: string; count: number }[];
  recentAnswers: {
    userId: string;
    displayName: string;
    topicId: string | null;
    topicTitle: string | null;
    isCorrect: boolean;
    answeredAt: string;
  }[];
  users: {
    userId: string;
    lineUserId: string | null;
    displayName: string;
    examDate: string | null;
    completedTopics: number;
    reviewQueue: number;
    exp: number;
    level: number;
    streakCount: number;
    lastPlayedAt: string | null;
    createdAt: string;
  }[];
  pagination: {
    page: number;
    perPage: number;
    totalUsers: number;
    totalPages: number;
  };
};

type FailedBillingWebhook = {
  event_id: string;
  event_type: string | null;
  attempt_count: number | null;
  last_error: string | null;
  updated_at: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  const [summary, setSummary] = useState<Summary | null | undefined>(undefined);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [failedWebhooks, setFailedWebhooks] = useState<FailedBillingWebhook[]>([]);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [retryingEventId, setRetryingEventId] = useState<string | null>(null);

  async function loadFailedWebhooks() {
    try {
      const response = await fetch("/api/admin/billing-webhooks");
      const data = (await response.json()) as {
        ok?: boolean;
        events?: FailedBillingWebhook[];
        error?: string;
      };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "query failed");
      setFailedWebhooks(data.events ?? []);
      setWebhookError(null);
    } catch (error) {
      setWebhookError(error instanceof Error ? error.message : "query failed");
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/summary?page=${page}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        return (await res.json()) as Summary;
      })
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setSummary(null);
          setSummaryError(e.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/billing-webhooks")
      .then(async (response) => {
        const data = (await response.json()) as {
          ok?: boolean;
          events?: FailedBillingWebhook[];
          error?: string;
        };
        if (!response.ok || !data.ok) throw new Error(data.error ?? "query failed");
        return data.events ?? [];
      })
      .then((events) => {
        if (!cancelled) {
          setFailedWebhooks(events);
          setWebhookError(null);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setWebhookError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function retryWebhook(eventId: string) {
    setRetryingEventId(eventId);
    try {
      const response = await fetch(`/api/admin/billing-webhooks/${eventId}/retry`, {
        method: "POST",
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "retry failed");
      await loadFailedWebhooks();
    } catch (error) {
      setWebhookError(error instanceof Error ? error.message : "retry failed");
    } finally {
      setRetryingEventId(null);
    }
  }

  function handleReset() {
    if (!window.confirm("この端末の localStorage を初期化します。よろしいですか？")) return;
    resetAppState();
    setState(null);
    router.push("/");
  }

  // この端末(localStorage)の指標
  const mastValues = state ? Object.values(state.progress.topicMastery) : [];
  const localAvgMastery =
    mastValues.length > 0
      ? Math.round(mastValues.reduce((s, v) => s + v, 0) / mastValues.length)
      : 0;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md md:max-w-5xl">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-gray-800">管理ビュー（検証用）</h1>
          <Link href="/" className="text-sm font-medium text-indigo-500">
            ダッシュボードへ →
          </Link>
        </div>
        <p className="mb-6 text-xs text-gray-400">
          Supabase の集計（全ユーザー）と、この端末の localStorage 状態を表示します。
        </p>

        {/* ============ Supabase 集計 ============ */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-extrabold text-gray-700">📊 全体集計（Supabase）</h2>

          {summary === undefined && (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
              集計を取得中…
            </div>
          )}

          {summary === null && (
            <div className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-700 shadow-sm">
              集計を取得できませんでした（{summaryError ?? "unknown"}）。
              <br />
              Supabase の環境変数が未設定の可能性があります。
            </div>
          )}

          {summary && summary.ok && (
            <div className="space-y-4">
              {/* 概況 */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "登録ユーザー数", value: summary.overview.totalUsers },
                  { label: "試験日 登録済み", value: summary.overview.examDateUsers },
                  { label: "今日の学習ユーザー", value: summary.overview.todayStudyUsers },
                  { label: "今日の回答数", value: summary.overview.todayAnswers },
                  { label: "復習キュー保有", value: summary.overview.reviewQueueUsers },
                  { label: "平均正答率", value: `${summary.accuracy.averageAccuracy}%` },
                ].map((c) => (
                  <div key={c.label} className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs text-gray-500">{c.label}</p>
                    <p className="mt-1 text-2xl font-extrabold text-gray-800">{c.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700">課金Webhookの失敗イベント</h3>
                {webhookError && (
                  <p className="mt-2 text-xs font-semibold text-rose-600">取得・再処理エラー: {webhookError}</p>
                )}
                {failedWebhooks.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-400">再処理が必要なイベントはありません。</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {failedWebhooks.map((event) => (
                      <li key={event.event_id} className="rounded-xl bg-rose-50 p-3 ring-1 ring-rose-100">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs font-bold text-gray-700">{event.event_id}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {event.event_type ?? "unknown"}・{event.attempt_count ?? 0}回試行
                            </p>
                            {event.last_error && (
                              <p className="mt-1 line-clamp-2 text-xs text-rose-700">{event.last_error}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void retryWebhook(event.event_id)}
                            disabled={retryingEventId === event.event_id}
                            className="shrink-0 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:bg-rose-300"
                          >
                            {retryingEventId === event.event_id ? "再処理中…" : "再処理"}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* トピック別 習熟度 */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-bold text-gray-700">トピック別の習熟度</h3>
                <ul className="space-y-2.5">
                  {summary.topicMastery.map((t) => (
                    <li key={t.topicId}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-gray-700">
                          {t.title}
                          <span className="ml-1 text-gray-400">({t.fieldLabel})</span>
                        </span>
                        <span className="text-gray-500">
                          {t.avgMastery}%・{t.learners}人
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${t.avgMastery}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 苦手分野（申告） */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700">苦手分野（オンボーディング申告）</h3>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {summary.weakFields.map((w) => (
                    <div key={w.field} className="rounded-xl bg-gray-50 p-3">
                      <p className="text-lg font-extrabold text-gray-800">{w.count}</p>
                      <p className="text-xs text-gray-500">{w.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 苦手タグ（不正解の多い順） */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700">苦手タグ（不正解が多い順）</h3>
                {summary.weakTagRanking.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-400">データなし</p>
                ) : (
                  <ol className="mt-3 space-y-1.5">
                    {summary.weakTagRanking.map((w, i) => (
                      <li key={w.tag} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          {i + 1}. {w.tag}
                        </span>
                        <span className="font-bold text-rose-600">{w.count}回</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* 回答履歴（直近30件） */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700">
                  回答履歴（直近 {summary.recentAnswers.length} 件）
                </h3>
                {summary.recentAnswers.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-400">まだありません</p>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {summary.recentAnswers.map((a, i) => (
                      <li
                        key={`${a.userId}-${i}`}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate text-gray-600">
                          {a.displayName}・{a.topicTitle ?? "—"}
                        </span>
                        <span className="shrink-0 text-gray-400">
                          {a.isCorrect ? "⭕️" : "❌"}{" "}
                          {new Date(a.answeredAt).toLocaleString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* LINE経由ユーザーの進捗 */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700">
                  ユーザーの進捗（{summary.pagination.totalUsers}人）
                </h3>
                {summary.users.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-400">まだユーザーがいません</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400">
                          <th className="py-1 text-left font-medium">User</th>
                          <th className="py-1 text-right font-medium">試験日</th>
                          <th className="py-1 text-right font-medium">学習</th>
                          <th className="py-1 text-right font-medium">復習</th>
                          <th className="py-1 text-right font-medium">🔥</th>
                          <th className="py-1 text-right font-medium">最終</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.users.map((u) => (
                          <tr key={u.userId} className="border-b border-gray-50">
                            <td className="py-1.5 text-left font-mono text-gray-600">
                              {u.displayName}
                            </td>
                            <td className="py-1.5 text-right text-gray-700">
                              {u.examDate ?? "—"}
                            </td>
                            <td className="py-1.5 text-right text-gray-700">
                              {u.completedTopics}
                            </td>
                            <td className="py-1.5 text-right text-gray-700">{u.reviewQueue}</td>
                            <td className="py-1.5 text-right text-gray-500">{u.streakCount}</td>
                            <td className="py-1.5 text-right text-gray-400">
                              {u.lastPlayedAt
                                ? new Date(u.lastPlayedAt).toLocaleDateString("ja-JP", {
                                    month: "numeric",
                                    day: "numeric",
                                  })
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {summary.pagination.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={summary.pagination.page === 1}
                      className="rounded-lg px-3 py-2 font-bold text-indigo-600 ring-1 ring-indigo-200 disabled:cursor-not-allowed disabled:text-gray-300 disabled:ring-gray-200"
                    >
                      前へ
                    </button>
                    <span className="text-gray-500">
                      {summary.pagination.page} / {summary.pagination.totalPages} ページ
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((current) =>
                          Math.min(summary.pagination.totalPages, current + 1),
                        )
                      }
                      disabled={summary.pagination.page === summary.pagination.totalPages}
                      className="rounded-lg px-3 py-2 font-bold text-indigo-600 ring-1 ring-indigo-200 disabled:cursor-not-allowed disabled:text-gray-300 disabled:ring-gray-200"
                    >
                      次へ
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ============ この端末の localStorage ============ */}
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-gray-700">📱 この端末の状態（localStorage）</h2>
          {state === undefined ? (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
              読み込み中…
            </div>
          ) : !state ? (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
              この端末には保存データがありません。
            </div>
          ) : (
            <dl className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-sm">
              {[
                { label: "試験予定日", value: state.profile?.examDate ?? "未設定" },
                {
                  label: "学習済みトピック",
                  value: `${state.progress.completedTopics.length} 件`,
                },
                { label: "平均習熟度", value: `${localAvgMastery}%` },
                {
                  label: "復習キュー",
                  value: `${state.progress.reviewQueue.length} 件`,
                },
                { label: "連続学習日数", value: `${state.progress.streakCount} 日` },
                {
                  label: "苦手タグ",
                  value:
                    state.progress.weakTags.length > 0
                      ? state.progress.weakTags.join(", ")
                      : "なし",
                },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-4 px-4 py-3">
                  <dt className="text-sm text-gray-500">{r.label}</dt>
                  <dd className="text-right text-sm font-bold text-gray-800">{r.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <button
          type="button"
          onClick={handleReset}
          className="mt-8 w-full rounded-2xl border-2 border-rose-200 bg-white px-6 py-3.5 text-base font-bold text-rose-600 transition active:scale-[0.99]"
        >
          🗑️ この端末の localStorage を初期化する
        </button>
      </div>
    </main>
  );
}
