"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetAppState } from "@/lib/storage";
import { useAppState } from "@/lib/useAppState";
import { getLevelName } from "@/lib/game";

// プロトタイプ検証用の簡易管理画面（本番管理画面ではありません）。
export default function AdminPage() {
  const router = useRouter();
  const [state, setState] = useAppState();

  function handleReset() {
    if (!window.confirm("保存データをすべて初期化します。よろしいですか？")) return;
    resetAppState();
    setState(null);
    router.push("/");
  }

  if (state === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
        読み込み中…
      </main>
    );
  }

  const total = state?.answers.length ?? 0;
  const correct = state?.answers.filter((a) => a.isCorrect).length ?? 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const rows: { label: string; value: string }[] = state
    ? [
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
        { label: "連続日数(streak)", value: String(state.progress.streakCount) },
        { label: "総回答数", value: String(total) },
        { label: "正答率", value: `${accuracy}%（${correct}/${total}）` },
        {
          label: "苦手タグ",
          value:
            state.progress.weakTags.length > 0
              ? state.progress.weakTags.join(", ")
              : "なし",
        },
        {
          label: "最終プレイ",
          value: state.progress.lastPlayedAt
            ? new Date(state.progress.lastPlayedAt).toLocaleString("ja-JP")
            : "—",
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-gray-800">
            管理ビュー（検証用）
          </h1>
          <Link href="/map" className="text-sm font-medium text-indigo-500">
            マップへ →
          </Link>
        </div>
        <p className="mb-6 text-xs text-gray-400">
          localStorage に保存された現在のユーザー状態を表示しています。
        </p>

        {!state ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            保存データがありません。
            <br />
            <Link href="/onboarding" className="text-indigo-500 underline">
              診断から始める
            </Link>
          </div>
        ) : (
          <>
            <dl className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-sm">
              {rows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <dt className="text-sm text-gray-500">{r.label}</dt>
                  <dd className="text-right text-sm font-bold text-gray-800">
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>

            {state.profile && (
              <details className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                <summary className="cursor-pointer text-sm font-bold text-gray-700">
                  初回診断（プロフィール）
                </summary>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                  {JSON.stringify(state.profile, null, 2)}
                </pre>
              </details>
            )}
          </>
        )}

        <button
          type="button"
          onClick={handleReset}
          className="mt-8 w-full rounded-2xl border-2 border-rose-200 bg-white px-6 py-3.5 text-base font-bold text-rose-600 transition active:scale-[0.99]"
        >
          🗑️ localStorage を初期化する
        </button>
      </div>
    </main>
  );
}
