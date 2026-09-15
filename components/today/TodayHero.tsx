"use client";

// /today のヒーロー。「あと何分で今日のぶんが終わるか」と、分の定規で今日の予定を示す。
// 区間の長さ＝所要時間、塗り＝完了。学習量（おまかせ／5／15／30分）もここで選ぶ。
// 試験日・合格準備度・ストリークなどの進捗情報は /progress に任せ、ここには置かない。

import { STUDY_AMOUNT_OPTIONS, type StudyAmountOption } from "@/lib/studyAmount";
import type { TodaySlot } from "./todaySlots";
import s from "./todayView.module.css";

export default function TodayHero({
  dateLabel,
  slots,
  selectedMinutes,
  defaultMinutes,
  onSelectMinutes,
  onClearMinutes,
}: {
  dateLabel: string;
  slots: TodaySlot[];
  /** 選択中の学習量。おまかせなら null。 */
  selectedMinutes: number | null;
  /** おまかせのときに使われる分量。 */
  defaultMinutes: number;
  onSelectMinutes: (minutes: StudyAmountOption) => void;
  onClearMinutes: () => void;
}) {
  const total = slots.reduce((sum, slot) => sum + slot.minutes, 0);
  const doneSlots = slots.filter((slot) => slot.state === "done");
  const doneMinutes = doneSlots.reduce((sum, slot) => sum + slot.minutes, 0);
  const remaining = total - doneMinutes;
  const current = slots.find((slot) => slot.state === "now") ?? null;
  const hasPlan = slots.length > 0 && total > 0;
  const allDone = hasPlan && remaining === 0;

  // 目盛りラベル: 5分おき＋終点。終点と近すぎる目盛りは省く。
  const tickLabels: number[] = [];
  for (let m = 0; m < total; m += 5) {
    if (m === 0 || total - m >= 3) tickLabels.push(m);
  }
  if (hasPlan) tickLabels.push(total);

  return (
    <header className={s.inner}>
      <div className={s.hero}>
        {/* ページの見出しは「今日の学習」。大きな一文は状況を伝える本文として置く */}
        <div className={s.eyebrow}>
          <h1 className={s.eyebrowTitle}>今日の学習</h1>
          <span className={s.eyebrowDate}>{dateLabel}</span>
        </div>

        <p className={s.headline} aria-live="polite">
          {!hasPlan ? (
            <>今日の新しい学習は、ひと段落です。</>
          ) : allDone ? (
            <>今日のぶんは、ぜんぶ終わりました。</>
          ) : (
            <>
              あと<span className={s.headlineNum}>{remaining}</span>分で、
              <br className={s.mobileBreak} />
              今日のぶんが終わります。
            </>
          )}
        </p>
        <p className={s.subline}>
          {hasPlan ? (
            <>
              <span className={s.mono}>{slots.length}</span>件のうち
              <span className={s.mono}>{doneSlots.length}</span>件完了
              <span className={s.dot} aria-hidden>
                ・
              </span>
              予定 <span className={s.mono}>{total}</span>分
            </>
          ) : (
            "復習やテーマ一覧から、気になるレッスンを選べます。"
          )}
        </p>

        {hasPlan && (
          <figure className={s.ruler} aria-label={`予定${total}分のうち${doneMinutes}分完了`}>
            <div className={s.track} style={{ ["--total" as string]: total }}>
              {slots.map((slot, i) => (
                <div
                  key={slot.id}
                  className={s.segment}
                  data-kind={slot.kind}
                  data-state={slot.state}
                  style={{
                    left: `${(slot.start / total) * 100}%`,
                    width: `${(slot.minutes / total) * 100}%`,
                    ["--i" as string]: i,
                  }}
                  title={`${slot.title}（${slot.minutes}分）`}
                >
                  <span className={s.segmentFill} />
                  <span className={s.segmentLabel}>{slot.title}</span>
                </div>
              ))}
              {current && (
                <span
                  className={s.caret}
                  style={{ left: `${(current.start / total) * 100}%` }}
                  aria-hidden
                >
                  いまここ
                </span>
              )}
            </div>
            <div className={s.ticks} aria-hidden>
              {tickLabels.map((m) => (
                <span
                  key={m}
                  className={s.tickLabel}
                  style={{ left: `${(m / total) * 100}%` }}
                  data-edge={m === 0 ? "start" : m === total ? "end" : undefined}
                >
                  {m}
                </span>
              ))}
            </div>
            <figcaption className={s.legend}>
              <span className={s.legendItem} data-kind="new">
                新規
              </span>
              <span className={s.legendItem} data-kind="review">
                復習
              </span>
            </figcaption>
          </figure>
        )}

        {/* 学習量は任意。既定の「おまかせ」が最初から選ばれている。 */}
        <div className={s.budget} role="group" aria-label="今日の学習量">
          <span className={s.budgetLabel}>学習量</span>
          <span className={s.budgetTrack}>
            <button
              type="button"
              className={s.chip}
              aria-pressed={selectedMinutes === null}
              onClick={onClearMinutes}
            >
              おまかせ <span className={s.mono}>{defaultMinutes}</span>分
            </button>
            {STUDY_AMOUNT_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={s.chip}
                aria-pressed={selectedMinutes === minutes}
                onClick={() => onSelectMinutes(minutes)}
              >
                <span className={s.mono}>{minutes}</span>分
              </button>
            ))}
          </span>
        </div>
      </div>
    </header>
  );
}
