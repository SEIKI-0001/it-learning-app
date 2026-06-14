"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetAppState } from "@/lib/storage";
import { useAppState } from "@/lib/useAppState";
import { getLevelName } from "@/lib/game";

// プロトタイプ検証用の簡易管理画面（本番管理画面ではありません）。
// TODO(本番公開前): この画面と /api/admin/summary は現在「認証なし」で誰でも閲覧できる。
// 個人の回答・フィードバックを含むため、本番公開前には必ず認証/認可を追加すること
// （例: Basic 認証 / Vercel パスワード保護 / 管理者ロール）。

type Summary = {
  ok: boolean;
  funnel: {
    totalUsers: number;
    day1Started: number;
    day1Completed: number;
    day3Reached: number;
    day7Completed: number;
  };
  accuracy: { averageAccuracy: number; correctAnswers: number; totalAnswers: number };
  weakTagRanking: { tag: string; count: number }[];
  users: {
    userId: string;
    lineUserId: string;
    displayName: string | null;
    currentDay: number;
    exp: number;
    level: number;
    completedDays: number[];
    createdAt: string;
  }[];
  feedback: {
    user_id: string;
    day_no: number | null;
    q1_service: string | null;
    q2_tedious: string | null;
    q3_unclear: string | null;
    q4_onemore: string | null;
    q5_easier: string | null;
    created_at: string;
  }[];
};

export default function AdminPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  const [summary, setSummary] = useState<Summary | null | undefined>(undefined);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/summary")
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
  }, []);

  function handleReset() {
    if (!window.confirm("この端末の localStorage を初期化します。よろしいですか？")) return;
    resetAppState();
    setState(null);
    router.push("/");
  }

  const localTotal = state?.answers.length ?? 0;
  const localCorrect = state?.answers.filter((a) => a.isCorrect).length ?? 0;
  const localAccuracy = localTotal > 0 ? Math.round((localCorrect / localTotal) * 100) : 0;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-gray-800">管理ビュー（検証用）</h1>
          <Link href="/map" className="text-sm font-medium text-indigo-500">
            マップへ →
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
              {/* ファネル */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "総ユーザー数", value: summary.funnel.totalUsers },
                  { label: "Day1 開始", value: summary.funnel.day1Started },
                  { label: "Day1 完了", value: summary.funnel.day1Completed },
                  { label: "Day3 到達", value: summary.funnel.day3Reached },
                  { label: "Day7 完了", value: summary.funnel.day7Completed },
                  { label: "平均正答率", value: `${summary.accuracy.averageAccuracy}%` },
                ].map((c) => (
                  <div key={c.label} className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs text-gray-500">{c.label}</p>
                    <p className="mt-1 text-2xl font-extrabold text-gray-800">{c.value}</p>
                  </div>
                ))}
              </div>

              {/* 苦手タグランキング */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700">苦手タグランキング</h3>
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

              {/* ユーザー別 */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700">
                  ユーザー別（{summary.users.length}人）
                </h3>
                {summary.users.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-400">まだユーザーがいません</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400">
                          <th className="py-1 text-left font-medium">User</th>
                          <th className="py-1 text-right font-medium">Day</th>
                          <th className="py-1 text-right font-medium">Lv</th>
                          <th className="py-1 text-right font-medium">EXP</th>
                          <th className="py-1 text-right font-medium">完了</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.users.map((u) => (
                          <tr key={u.userId} className="border-b border-gray-50">
                            <td className="py-1.5 text-left font-mono text-gray-600">
                              {u.displayName ?? u.lineUserId.slice(0, 8)}
                            </td>
                            <td className="py-1.5 text-right text-gray-700">{u.currentDay}</td>
                            <td className="py-1.5 text-right text-gray-700">{u.level}</td>
                            <td className="py-1.5 text-right text-gray-700">{u.exp}</td>
                            <td className="py-1.5 text-right text-gray-500">
                              {u.completedDays.length > 0 ? u.completedDays.join(",") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* フィードバック一覧 */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700">
                  フィードバック（{summary.feedback.length}件）
                </h3>
                {summary.feedback.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-400">まだありません</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {summary.feedback.map((f, i) => (
                      <li key={i} className="rounded-xl bg-gray-50 p-3 text-xs text-gray-700">
                        <p className="mb-1 text-gray-400">
                          Day{f.day_no ?? "?"}・{new Date(f.created_at).toLocaleString("ja-JP")}
                        </p>
                        {f.q1_service && <p>① {f.q1_service}</p>}
                        {f.q2_tedious && <p>② {f.q2_tedious}</p>}
                        {f.q3_unclear && <p>③ {f.q3_unclear}</p>}
                        {f.q4_onemore && <p>④ もう1日: {f.q4_onemore}</p>}
                        {f.q5_easier && <p>⑤ 楽そう: {f.q5_easier}</p>}
                      </li>
                    ))}
                  </ul>
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
                { label: "現在のDay", value: String(state.progress.currentDay) },
                {
                  label: "完了済みDay",
                  value:
                    state.progress.completedDays.length > 0
                      ? state.progress.completedDays.join(", ")
                      : "なし",
                },
                { label: "EXP", value: String(state.progress.exp) },
                {
                  label: "レベル",
                  value: `Lv.${state.progress.level}（${getLevelName(state.progress.level)}）`,
                },
                { label: "総回答数", value: String(localTotal) },
                { label: "正答率", value: `${localAccuracy}%（${localCorrect}/${localTotal}）` },
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
