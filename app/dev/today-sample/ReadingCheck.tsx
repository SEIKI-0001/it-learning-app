"use client";

// 参考書の進み具合を1日1回記録するカード（旧 DailyProgressReport のサンプル版）。
//
// 入力の迷いを減らすために:
//   - 何を答えるのか: 「今日の範囲（章・ページ）」を先に見せ、そこをどこまで読んだかだけを聞く
//   - どの値を選ぶか: 「半分くらい」を自分で見積もらせず、読み終えたページで選ばせる
//   - 選んだら即記録。理由は「4分の1」「まだ」のときだけ、記録のあとに任意で聞く（答えなくてよい）
//   - 休む日は選択肢の外に置き、4つの段階と混ざらないようにする

import { useState } from "react";
import { READING } from "./data";
import r from "./reading.module.css";

type Level = "none" | "little" | "half" | "all";
type Reason = "no_time" | "difficult" | "tired" | "forgot" | "other";

const span = READING.to - READING.from + 1;
const pageAt = (ratio: number) => READING.from + Math.round(span * ratio) - 1;

const OPTIONS: { level: Level; page: string; label: string }[] = [
  { level: "none", page: "まだ", label: "読めていない" },
  { level: "little", page: `p.${pageAt(0.25)}`, label: "4分の1" },
  { level: "half", page: `p.${pageAt(0.5)}`, label: "半分" },
  { level: "all", page: `p.${READING.to}`, label: "最後まで" },
];

const REASONS: { value: Reason; label: string }[] = [
  { value: "no_time", label: "時間がなかった" },
  { value: "difficult", label: "難しかった" },
  { value: "tired", label: "疲れていた" },
  { value: "forgot", label: "忘れていた" },
  { value: "other", label: "その他" },
];

type Saved = { level: Level | "rest"; reason: Reason | null };

export default function ReadingCheck() {
  const [picked, setPicked] = useState<Level | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [reasonAnswered, setReasonAnswered] = useState(false);

  const pickedIndex = picked
    ? OPTIONS.findIndex((o) => o.level === picked)
    : -1;
  const previewIndex = hovered ?? pickedIndex;
  const asksReason = picked === "none" || picked === "little";
  const showReasons = asksReason && saved?.level === picked && !reasonAnswered;

  // 選んだ時点で記録する。理由はそのあとに任意で足すだけ。
  const choose = (level: Level) => {
    setPicked(level);
    setSaved({ level, reason: null });
    setReasonAnswered(false);
  };

  const answerReason = (reason: Reason | null) => {
    if (!picked) return;
    setSaved({ level: picked, reason });
    setReasonAnswered(true);
  };

  const summary = (() => {
    if (!saved) return null;
    if (saved.level === "rest") return "今日は読まない日として記録しました";
    const option = OPTIONS.find((o) => o.level === saved.level)!;
    if (saved.level === "none") return "まだ読めていない、で記録しました";
    return `${option.page}まで（${option.label}）で記録しました`;
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
        <span className={r.rangeLabel}>今日の範囲</span>
        <span className={r.rangeBody}>
          {READING.chapter}
          <span className={r.pages}>
            p.{READING.from}〜{READING.to}
          </span>
        </span>
      </div>

      <p className={r.question} id="reading-question">
        どのページまで読みましたか？
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
            data-reached={
              previewIndex >= 1 && index >= 1 && index <= previewIndex
            }
            data-picked={picked === option.level}
            onPointerEnter={() => setHovered(index)}
            onClick={() => choose(option.level)}
          >
            <span className={r.stepPage}>{option.page}</span>
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
              setPicked(null);
              setSaved({ level: "rest", reason: null });
            }}
          >
            今日は読まない
          </button>
        )}
      </div>
    </section>
  );
}
