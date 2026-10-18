"use client";

// /progress で開く詳細（components/progress/ProgressCompact から使う）。
//   - 参考書の読了状況（章ごと）
//   - 学習した日（直近8週をカレンダーと同じ並びで。解答数の濃淡）

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import type { ReferenceReadingOverview } from "@/lib/referenceBook";
import type { UserAnswer } from "@/types";
import t from "@/components/today/todayView.module.css";
import p from "./progressDashboard.module.css";

// ───────────────────────── 参考書の読了状況 ─────────────────────────

const READING_STATE_LABEL = { read: "読了", reading: "読みかけ", unread: "未読" } as const;

function monthDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 参考書の読了状況（参考書が未設定なら出さない）。数え方は /plan・学習ペース判定と同じ節単位。
 * ふだんは読了率と次に読む章だけの1枚にし、押すと章ごとの内訳を開く。
 */
export function ReadingDetailBody({
  bookTitle,
  overview,
}: {
  bookTitle: string;
  overview: ReferenceReadingOverview;
}) {
  const { progress, chapters, lastReadAt, nextChapterId } = overview;
  return (
    <>
      <p className={p.readingBook}>
        {bookTitle}
        <span className={p.readingSep}>・</span>
        節 <span className={t.mono}>{`${progress.done}/${progress.total}`}</span> 読了
        {lastReadAt && (
          <>
            <span className={p.readingSep}>・</span>
            最後の記録 <span className={t.mono}>{monthDay(lastReadAt)}</span>
          </>
        )}
      </p>
      {/* PC の2列は上から下へ読む順に並べる */}
      <ol
        className={p.readingChapters}
        style={{ "--reading-rows": Math.ceil(chapters.length / 2) } as CSSProperties}
      >
        {chapters.map((chapter) => (
          <li
            key={chapter.id}
            className={`${p.readingChapter} ${chapter.id === nextChapterId ? p.readingNext : ""}`}
          >
            <span className={p.readingMark} data-state={chapter.state} aria-hidden />
            <span className={p.readingTitle}>{chapter.title}</span>
            <span className={p.readingCount}>
              {chapter.state === "read" ? (
                "読了"
              ) : chapter.total > 1 ? (
                <>
                  <span className={t.mono}>{`${chapter.done}/${chapter.total}`}</span>節
                </>
              ) : (
                READING_STATE_LABEL[chapter.state]
              )}
              {chapter.id === nextChapterId && <span className={p.readingNextTag}>次に読む</span>}
            </span>
          </li>
        ))}
      </ol>
      <div className={p.readingFoot}>
        <p className={p.readingNote}>
          今日の学習の「参考書でどこまで読みましたか？」で「全部」を選ぶと、その節が読了になります。合格準備度は問題の結果だけで判定し、読了は学習ペース（順調・遅れ）の判定に使います。
        </p>
        <Link href="/settings/reference-book" className={p.textLink}>
          まとめて読了・修正
          <Icon name="chevron-right" className={p.chev} />
        </Link>
      </div>
    </>
  );
}

/** 参考書の読了状況の詳細だけのカード（/progress の指標タイルから開く）。 */
// ───────────────────────── 学習した日 ─────────────────────────

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];
/** 表示する週数。隣のタイルと高さが揃う範囲で、新しい週から見せる。 */
const HEAT_WEEKS = 8;

type HeatDay = { date: Date; answers: number; correct: number } | null;

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** 解答数 → 濃さの段階。0 は解いていない日（警告色にはしない）。 */
function heatLevel(answers: number): 0 | 1 | 2 | 3 | 4 {
  if (answers === 0) return 0;
  if (answers < 10) return 1;
  if (answers < 20) return 2;
  if (answers < 30) return 3;
  return 4;
}

/** 直近 HEAT_WEEKS 週を「行=週（月曜はじまり・上が古い）× 列=曜日」に並べる。今日より先は null。 */
function buildHeatWeeks(answers: UserAnswer[], today: Date): HeatDay[][] {
  const counts = new Map<string, { answers: number; correct: number }>();
  for (const answer of answers) {
    const at = new Date(answer.answeredAt);
    if (Number.isNaN(at.getTime())) continue;
    const key = localDayKey(at);
    const entry = counts.get(key) ?? { answers: 0, correct: 0 };
    entry.answers += 1;
    if (answer.isCorrect) entry.correct += 1;
    counts.set(key, entry);
  }

  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekdayIndex = (base.getDay() + 6) % 7;
  const weeks: HeatDay[][] = [];
  for (let w = 0; w < HEAT_WEEKS; w++) {
    const week: HeatDay[] = [];
    for (let d = 0; d < 7; d++) {
      const offset = (HEAT_WEEKS - 1 - w) * 7 + weekdayIndex - d;
      if (offset < 0) {
        week.push(null);
        continue;
      }
      const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() - offset);
      const entry = counts.get(localDayKey(date));
      week.push({ date, answers: entry?.answers ?? 0, correct: entry?.correct ?? 0 });
    }
    weeks.push(week);
  }
  return weeks;
}

function dayLabel(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日（${"日月火水木金土"[date.getDay()]}）`;
}

export function StudyDaysCard({
  answers,
  streak,
  longestStreak,
  stacked = false,
  className,
}: {
  answers: UserAnswer[];
  streak: number;
  longestStreak: number;
  /** 狭い枠に入れるとき、カレンダーと数字を縦に積む */
  stacked?: boolean;
  className?: string;
}) {
  const [picked, setPicked] = useState<NonNullable<HeatDay> | null>(null);
  const weeks = buildHeatWeeks(answers, new Date());
  const days = weeks.flat().filter((day): day is NonNullable<HeatDay> => day !== null);
  const studyDays = days.filter((day) => day.answers > 0).length;
  const totalAnswers = days.reduce((sum, day) => sum + day.answers, 0);
  const totalCorrect = days.reduce((sum, day) => sum + day.correct, 0);
  const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : null;
  const monthLabels = weeks.map((week, wi) => {
    const present = week.filter((day): day is NonNullable<HeatDay> => day !== null);
    const first = present.find((day) => day.date.getDate() === 1);
    if (first) return `${first.date.getMonth() + 1}月`;
    return wi === 0 && present[0] ? `${present[0].date.getMonth() + 1}月` : "";
  });

  return (
    <section className={`${p.card} ${className ?? ""}`} aria-labelledby="history-heading">
      <div className={t.sheetHead}>
        <h2 id="history-heading" className={t.sectionTitle}>
          学習した日
        </h2>
        <span className={t.sectionMeta}>
          直近{HEAT_WEEKS}週で <span className={t.mono}>{studyDays}</span>日
        </span>
      </div>
      <div className={`${p.history} ${stacked ? p.historyStacked : ""}`}>
        <div className={p.heatBlock}>
          <div
            className={p.heat}
            role="img"
            aria-label={`直近${HEAT_WEEKS}週の1日ごとの解答数。${studyDays}日学習し、合計${totalAnswers}問解きました。`}
          >
            <span className={p.heatCorner} aria-hidden />
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className={p.heatWeekday} aria-hidden>
                {weekday}
              </span>
            ))}
            {weeks.map((week, wi) => (
              <div key={wi} className={p.heatRow}>
                <span className={p.heatMonth} aria-hidden>
                  {monthLabels[wi]}
                </span>
                {week.map((day, di) => {
                  if (!day) return <span key={di} className={p.heatEmpty} />;
                  return (
                    <span
                      key={di}
                      className={p.heatDay}
                      data-level={heatLevel(day.answers)}
                      data-picked={picked?.date.getTime() === day.date.getTime()}
                      title={`${dayLabel(day.date)} ${day.answers}問`}
                      onPointerEnter={() => setPicked(day)}
                      onClick={() => setPicked(day)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className={p.heatFoot}>
            <p className={p.heatReadout} aria-live="polite">
              {picked ? (
                <>
                  {dayLabel(picked.date)}{" "}
                  <strong>
                    <span className={t.mono}>{picked.answers}</span>問
                  </strong>
                </>
              ) : (
                "マスにふれると解答数が出ます"
              )}
            </p>
            <div className={p.heatLegend} aria-hidden>
              0問
              {[0, 1, 2, 3, 4].map((level) => (
                <span key={level} className={p.heatDay} data-level={level} />
              ))}
              30問〜
            </div>
          </div>
        </div>
        <dl className={p.stats}>
          <div>
            <dt>連続学習</dt>
            <dd>
              <span className={p.statNum}>{streak}</span>日<small>ベスト {longestStreak}日</small>
            </dd>
          </div>
          <div>
            <dt>学習した日</dt>
            <dd>
              <span className={p.statNum}>{studyDays}</span>日<small>{days.length}日のうち</small>
            </dd>
          </div>
          <div>
            <dt>解いた問題</dt>
            <dd>
              <span className={p.statNum}>{totalAnswers}</span>問<small>{HEAT_WEEKS}週の合計</small>
            </dd>
          </div>
          <div>
            <dt>正答率</dt>
            <dd>
              {accuracy === null ? (
                <span className={p.statNum}>—</span>
              ) : (
                <>
                  <span className={p.statNum}>{accuracy}</span>%
                </>
              )}
              <small>{HEAT_WEEKS}週の平均</small>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
