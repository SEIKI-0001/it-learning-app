"use client";

// 参考書の進み具合を1日1回記録するカード（旧 DailyProgressReport を置き換え）。
// 保存先・値は従来どおり daily_progress_reports の selected_level（all/half/little/none/rest）。
// 合格準備度の「インプット進捗」に使われる（参考書の章消化率と高い方が採用される）。
//
// 入力の迷いを減らすために:
//   - 何を答えるのか: 今日のレッスンのトピックを先に見せ、その範囲を参考書でどこまで読んだかだけを聞く
//     （ページはサービス側で分からないため出さない）
//   - どの値を選ぶか: 4段階それぞれに量のゲージを付け、数字を見積もらなくても目で選べるようにする
//   - 選んだら即記録。理由は「少し」「まだ」のときだけ、記録のあとに任意で聞く
//   - 休む日は選択肢の外に置き、4つの段階と混ざらないようにする

import { useEffect, useState } from "react";
import RecordingLockNotice from "@/components/billing/RecordingLockNotice";
import { getUserId, reportDailyProgress } from "@/lib/userSession";
import { useBillingStatus } from "@/lib/useBillingStatus";
import type { ProgressLevel, ProgressReason } from "@/types/studyProgress";
import r from "./readingCheck.module.css";

type ReadLevel = Exclude<ProgressLevel, "rest">;

const OPTIONS: { level: ReadLevel; label: string; fill: number }[] = [
  { level: "none", label: "まだ", fill: 0 },
  { level: "little", label: "少し", fill: 0.25 },
  { level: "half", label: "半分", fill: 0.5 },
  { level: "all", label: "全部", fill: 1 },
];

const REASONS: { value: ProgressReason; label: string }[] = [
  { value: "no_time", label: "時間がなかった" },
  { value: "difficult", label: "難しかった" },
  { value: "tired", label: "疲れていた" },
  { value: "forgot", label: "忘れていた" },
  { value: "other", label: "その他" },
];

type Saved = { level: ProgressLevel; reason: ProgressReason | null };

// 端末に控えを残し、再訪時に前回の選択を反映する（旧カードと同じキー）。
function storageKey(date: string): string {
  return `fequest:dailyReport:${date}`;
}

function readSaved(date: string): Saved | null {
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
  try {
    window.localStorage.setItem(storageKey(date), JSON.stringify(saved));
  } catch {
    /* 保存できなくても記録APIには送る */
  }
}

export default function ReadingCheck({ date, topics }: { date: string; topics: string[] }) {
  const { status: billingStatus } = useBillingStatus();
  const [saved, setSaved] = useState<Saved | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [reasonAnswered, setReasonAnswered] = useState(false);

  // setState はネストした init() 経由で呼ぶ（プロジェクト既存の読込パターン）。
  useEffect(() => {
    function init() {
      const stored = readSaved(date);
      setSaved(stored);
      setReasonAnswered(stored !== null);
    }
    init();
  }, [date]);

  const persist = (next: Saved) => {
    setSaved(next);
    writeSaved(date, next);
    const userId = getUserId();
    if (userId) {
      // fire-and-forget（保存に失敗しても UI は止めない）
      void reportDailyProgress(userId, date, next.level, next.reason);
    }
  };

  const picked = saved && saved.level !== "rest" ? saved.level : null;
  const pickedIndex = picked ? OPTIONS.findIndex((o) => o.level === picked) : -1;
  const previewIndex = hovered ?? pickedIndex;
  const showReasons = (picked === "none" || picked === "little") && !reasonAnswered;

  const choose = (level: ReadLevel) => {
    persist({ level, reason: null });
    setReasonAnswered(false);
  };

  const answerReason = (reason: ProgressReason | null) => {
    if (!picked) return;
    persist({ level: picked, reason });
    setReasonAnswered(true);
  };

  // 記録専用のため、無料記録期間が終了していたらロック表示に差し替える。
  if (billingStatus?.entitlements && !billingStatus.entitlements.canRecordStudy) {
    return <RecordingLockNotice />;
  }

  const summary = (() => {
    if (!saved) return null;
    if (saved.level === "rest") return "今日は読まない日として記録しました";
    if (saved.level === "none") return "「まだ」で記録しました";
    const option = OPTIONS.find((o) => o.level === saved.level);
    return `「${option?.label ?? ""}」読んだ、で記録しました`;
  })();

  return (
    <section className={r.card} aria-labelledby="reading-heading">
      <div className={r.head}>
        <h2 id="reading-heading" className={r.title}>
          参考書の進み具合
        </h2>
        <span className={r.meta}>1日1回・あとから変更できます</span>
      </div>

      <div className={r.range}>
        <span className={r.rangeLabel}>今日のレッスンの範囲</span>
        {topics.length > 0 ? (
          <ul className={r.topics}>
            {topics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        ) : (
          <p className={r.topicsEmpty}>今日読んだ範囲</p>
        )}
      </div>

      <p className={r.question} id="reading-question">
        この範囲を、参考書でどこまで読みましたか？
      </p>

      <div
        className={r.steps}
        role="radiogroup"
        aria-labelledby="reading-question"
        onPointerLeave={() => setHovered(null)}
      >
        {OPTIONS.map((option, index) => (
          <button
            key={option.level}
            type="button"
            role="radio"
            aria-checked={picked === option.level}
            className={r.step}
            data-reached={previewIndex >= 1 && index >= 1 && index <= previewIndex}
            data-picked={picked === option.level}
            onPointerEnter={() => setHovered(index)}
            onClick={() => choose(option.level)}
          >
            <span className={r.gauge} aria-hidden>
              <span style={{ width: `${option.fill * 100}%` }} />
            </span>
            <span className={r.stepLabel}>{option.label}</span>
          </button>
        ))}
      </div>

      {showReasons && (
        <div className={r.reason}>
          <p className={r.reasonQuestion}>よければ理由をひとつ（任意）</p>
          <div className={r.reasonChips}>
            {REASONS.map((reason) => (
              <button
                key={reason.value}
                type="button"
                className={r.chip}
                onClick={() => answerReason(reason.value)}
              >
                {reason.label}
              </button>
            ))}
            <button
              type="button"
              className={`${r.chip} ${r.skip}`}
              onClick={() => answerReason(null)}
            >
              答えない
            </button>
          </div>
        </div>
      )}

      <div className={r.foot}>
        {summary ? (
          <p className={r.saved} aria-live="polite">
            <svg viewBox="0 0 20 20" aria-hidden>
              <path d="M5.5 10.5l3 3 6-7" />
            </svg>
            {summary}
          </p>
        ) : (
          <p className={r.hint}>選ぶとそのまま記録されます</p>
        )}
        {saved?.level !== "rest" && (
          <button
            type="button"
            className={r.rest}
            onClick={() => {
              persist({ level: "rest", reason: null });
              setReasonAnswered(true);
            }}
          >
            今日は読まない
          </button>
        )}
      </div>
    </section>
  );
}
