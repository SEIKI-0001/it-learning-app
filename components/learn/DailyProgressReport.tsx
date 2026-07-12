"use client";

import { useEffect, useState } from "react";
import RecordingLockNotice from "@/components/billing/RecordingLockNotice";
import { getUserId, reportDailyProgress } from "@/lib/userSession";
import { useBillingStatus } from "@/lib/useBillingStatus";
import type { ProgressLevel, ProgressReason } from "@/types/studyProgress";

// 今日の学習の達成度を1日1回、低入力で報告するカード。
// - 学習を止めない・ユーザーを責めない文言のみ。
// - 「少しだけ」「できなかった」のときだけ任意で理由を選べる（スキップ可）。
// - 選択は同日上書き。端末に控えを残し、再訪時に前回の選択を反映する。

const LEVELS: { value: ProgressLevel; label: string; emoji: string }[] = [
  { value: "all", label: "全部できた", emoji: "💯" },
  { value: "half", label: "半分くらいできた", emoji: "🙂" },
  { value: "little", label: "少しだけできた", emoji: "🌱" },
  { value: "none", label: "できなかった", emoji: "🌙" },
  { value: "rest", label: "今日は休む", emoji: "☕️" },
];

const REASONS: { value: ProgressReason; label: string }[] = [
  { value: "no_time", label: "時間がなかった" },
  { value: "difficult", label: "難しかった" },
  { value: "tired", label: "疲れていた" },
  { value: "forgot", label: "忘れていた" },
  { value: "other", label: "その他" },
];

// 「少しだけ / できなかった」のときだけ理由を尋ねる。
function asksReason(level: ProgressLevel): boolean {
  return level === "little" || level === "none";
}

function storageKey(date: string): string {
  return `fequest:dailyReport:${date}`;
}

type Saved = { level: ProgressLevel; reason: ProgressReason | null };

function readSaved(date: string): Saved | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Saved;
    return parsed && parsed.level ? parsed : null;
  } catch {
    return null;
  }
}

function writeSaved(date: string, saved: Saved): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(date), JSON.stringify(saved));
  } catch {
    /* ignore */
  }
}

export default function DailyProgressReport({ date }: { date: string }) {
  const [level, setLevel] = useState<ProgressLevel | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { status: billingStatus } = useBillingStatus();

  // 再訪時に前回の選択を反映する（date が変わったら読み直す）。
  // setState はネストした init() 経由で呼び、effect 直下の同期 setState を避ける
  // （プロジェクト既存の読込パターンに合わせる）。
  useEffect(() => {
    function init() {
      const saved = readSaved(date);
      setLevel(saved ? saved.level : null);
      setSubmitted(saved !== null);
    }
    init();
  }, [date]);

  function persist(nextLevel: ProgressLevel, nextReason: ProgressReason | null) {
    const saved: Saved = { level: nextLevel, reason: nextReason };
    writeSaved(date, saved);
    setSubmitted(true);
    const userId = getUserId();
    if (userId) {
      // fire-and-forget（保存に失敗しても UI は止めない）。
      void reportDailyProgress(userId, date, nextLevel, nextReason);
    }
  }

  function handleSelectLevel(next: ProgressLevel) {
    setLevel(next);
    // 理由を尋ねないレベルは即確定。尋ねるレベルは理由選択（スキップ含む）まで待つ。
    if (!asksReason(next)) {
      persist(next, null);
    } else {
      setSubmitted(false);
    }
  }

  function handleSelectReason(next: ProgressReason | null) {
    if (!level) return;
    persist(level, next);
  }

  const showReasons = level !== null && asksReason(level) && !submitted;

  // このカードは記録専用のため、無料記録期間が終了していたらロック表示に差し替える。
  if (billingStatus?.entitlements && !billingStatus.entitlements.canRecordStudy) {
    return <RecordingLockNotice />;
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <p className="text-sm font-extrabold text-gray-800">
        今日の学習はどこまでできましたか？
      </p>
      <p className="mt-0.5 text-xs text-gray-500">
        ボタンをひとつ選ぶだけでOK。あとから変えられます。
      </p>

      <div className="mt-3 grid gap-2">
        {LEVELS.map((l) => {
          const active = level === l.value;
          return (
            <button
              key={l.value}
              type="button"
              onClick={() => handleSelectLevel(l.value)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition active:scale-[0.99] ${
                active
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-gray-50 text-gray-700 ring-1 ring-gray-100"
              }`}
            >
              <span aria-hidden>{l.emoji}</span>
              <span>{l.label}</span>
              {active && <span className="ml-auto">✓</span>}
            </button>
          );
        })}
      </div>

      {showReasons && (
        <div className="mt-3 rounded-xl bg-gray-50 px-3 py-3">
          <p className="text-xs font-bold text-gray-600">
            よかったら理由も教えてください（任意）
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => handleSelectReason(r.value)}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 ring-1 ring-gray-200 transition active:scale-[0.98]"
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleSelectReason(null)}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-400 ring-1 ring-gray-200 transition active:scale-[0.98]"
            >
              スキップ
            </button>
          </div>
        </div>
      )}

      {submitted && (
        <p className="mt-3 animate-pop-in text-center text-xs font-bold text-emerald-600">
          記録しました。今日もおつかれさま！
        </p>
      )}
    </section>
  );
}
