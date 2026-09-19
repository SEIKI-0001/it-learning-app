"use client";

// /progress の内訳・詳細タイル。
//   - 合格準備度の内訳（分野別と、いちばん伸ばせるところ）
//   - トピックの到達度（全トピックの内訳と、いちばん大きなリスク）
//   - 学習した日（直近8週をカレンダーと同じ並びで。解答数の濃淡）
//   - 次の解放（ランク・モチットの成長）
// 数値の計算は既存の判定（ExamReadiness / IntegratedLearningStatus / answers）をそのまま使う。

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { EXAM_READINESS_CONFIG } from "@/lib/examReadiness/config";
import type { ExamReadinessResult } from "@/types/examReadiness";
import type { IntegratedLearningStatus } from "@/types/integratedStatus";
import type { UserAnswer } from "@/types";
import t from "@/components/today/todayView.module.css";
import p from "./progressDashboard.module.css";

/** 段階の境界。lib/examReadiness/calculator.ts と同じ（安定は信頼度も必要なので分野では 85 以上を目安にする）。 */
const BAND_EDGES = [60, 75, 85] as const;
const SCORED_QUESTIONS = 92;

function fieldBandLabel(score: number | null): string {
  if (score === null) return "測定中";
  if (score >= 85) return "安定";
  if (score >= 75) return "準備良好";
  if (score >= 60) return "あと一歩";
  return "要強化";
}

// ───────────────────────── 合格準備度の内訳 ─────────────────────────

export function ReadinessBreakdownCard({
  result,
  loading,
  improvement,
  className,
}: {
  result: ExamReadinessResult | null;
  loading: boolean;
  /** いちばん伸ばせるところ（文言と取り組み先）。判定できなければ null。 */
  improvement: { label: string; href: string } | null;
  className?: string;
}) {
  const questionsFor = (fieldId: string) => {
    const ratio = EXAM_READINESS_CONFIG.fields.find((f) => f.fieldId === fieldId)?.scoredQuestionRatio;
    return ratio ? Math.round(ratio * SCORED_QUESTIONS) : null;
  };

  return (
    <section className={`${p.card} ${className ?? ""}`} aria-labelledby="readiness-heading">
      <div className={t.sheetHead}>
        <h2 id="readiness-heading" className={t.sectionTitle}>
          合格準備度の内訳
        </h2>
        <span className={t.sectionMeta}>実際の回答と定着から判定</span>
      </div>

      {!result ? (
        <p className={p.emptyNote}>
          {loading ? "合格準備度を読み込んでいます" : "判定材料を集めています。問題に答えると分野ごとの準備度が出ます。"}
        </p>
      ) : (
        <ul className={p.fieldList}>
          {result.fields.map((field) => {
            const questions = questionsFor(field.fieldId);
            return (
              <li key={field.fieldId} className={p.field}>
                <span className={p.fieldName}>
                  {field.label}
                  {questions !== null && (
                    <span className={p.fieldMeta}>
                      出題 <span className={t.mono}>{questions}</span>問
                    </span>
                  )}
                </span>
                <span className={p.fieldBar} aria-hidden>
                  <span className={p.fieldFill} style={{ width: `${field.score ?? 0}%` }} />
                  {BAND_EDGES.map((edge) => (
                    <span key={edge} className={p.fieldEdge} style={{ left: `${edge}%` }} />
                  ))}
                </span>
                <span className={p.fieldScore}>
                  <span className={`${t.mono} ${p.mono}`}>{field.score ?? "—"}</span>
                  <span className={p.fieldBand}>{fieldBandLabel(field.score)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {improvement && (
        <div className={p.improve}>
          <div className={p.improveText}>
            <p className={p.improveLabel}>いちばん伸ばせるところ</p>
            <p className={p.improveMain}>{improvement.label}</p>
          </div>
          <Link href={improvement.href} className={p.textLink}>
            取り組む
            <Icon name="chevron-right" className={p.chev} />
          </Link>
        </div>
      )}
    </section>
  );
}

// ───────────────────────── トピックの到達度 ─────────────────────────

/** 参考書インプットの内訳（参考書未設定なら null で出さない）。 */
export type ReferenceInputSummary = {
  percent: number;
  doneChapters: number;
  totalChapters: number;
};

export function TopicReachCard({
  status,
  totalTopicCount,
  loading,
  referenceInput = null,
  className,
}: {
  status: IntegratedLearningStatus | null;
  totalTopicCount: number;
  loading: boolean;
  referenceInput?: ReferenceInputSummary | null;
  className?: string;
}) {
  return (
    <section className={`${p.card} ${className ?? ""}`} aria-labelledby="topics-heading">
      <div className={t.sheetHead}>
        <h2 id="topics-heading" className={t.sectionTitle}>
          トピックの到達度
        </h2>
        <span className={t.sectionMeta}>
          全<span className={t.mono}>{totalTopicCount}</span>トピック
        </span>
      </div>

      {!status ? (
        <p className={p.emptyNote}>
          {loading ? "到達度を読み込んでいます" : "確認問題に答えると、トピックごとの到達度が出ます。"}
        </p>
      ) : (
        <TopicReachBody status={status} totalTopicCount={totalTopicCount} />
      )}
      {/* インプット進捗の内訳。主役は到達度なので、1行の補足にとどめる */}
      {referenceInput && (
        <Link href="/plan" className={p.referenceInput}>
          <span>参考書インプット</span>
          <span className={p.referenceInputValue}>
            <span className={t.mono}>{referenceInput.percent}%</span>
            （<span className={t.mono}>{referenceInput.doneChapters}</span>/
            <span className={t.mono}>{referenceInput.totalChapters}</span>章読了）
          </span>
        </Link>
      )}
    </section>
  );
}

function TopicReachBody({
  status,
  totalTopicCount,
}: {
  status: IntegratedLearningStatus;
  totalTopicCount: number;
}) {
  // 全トピックを重複なく4区分に分ける（basicUnderstood は exam_ready を含むため差し引く）。
  const examReady = status.examReadyTopicCount;
  const basicOnly = Math.max(0, status.basicUnderstoodTopicCount - examReady);
  const needsWork = status.reviewNeededTopicCount + status.weakTopicCount;
  const notStarted = Math.max(0, totalTopicCount - examReady - basicOnly - needsWork);
  const share = (n: number) => `${totalTopicCount > 0 ? (n / totalTopicCount) * 100 : 0}%`;
  const topRisk = status.mainRisks[0] ?? null;

  return (
    <>
      <div className={p.stack} aria-hidden>
        <span data-tone="ready" style={{ width: share(examReady) }} />
        <span data-tone="basic" style={{ width: share(basicOnly) }} />
        <span data-tone="work" style={{ width: share(needsWork) }} />
      </div>
      <dl className={p.legend}>
        {[
          { tone: "ready", label: "本番対応OK", value: examReady },
          { tone: "basic", label: "基礎理解OK", value: basicOnly },
          { tone: "work", label: "要復習", value: needsWork },
          { tone: "rest", label: "これから", value: notStarted },
        ].map((item) => (
          <div key={item.tone} className={p.legendItem} data-tone={item.tone}>
            <dt>{item.label}</dt>
            <dd className={p.legendNum}>{item.value}</dd>
          </div>
        ))}
      </dl>
      {topRisk && (
        <Link href="/review" className={p.risk}>
          <Icon name="alert" className={p.riskIcon} />
          <span className={p.riskText}>
            {topRisk.label}
            {typeof topRisk.count === "number" && (
              <>
                （<span className={t.mono}>{topRisk.count}</span>件）
              </>
            )}
          </span>
          <span className={p.riskAction}>
            復習する
            <Icon name="chevron-right" className={p.chev} />
          </span>
        </Link>
      )}
    </>
  );
}

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
  className,
}: {
  answers: UserAnswer[];
  streak: number;
  longestStreak: number;
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
      <div className={p.history}>
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

// ───────────────────────── 次の解放・くわしく見る ─────────────────────────

export type UnlockRow = { id: string; title: string; detail: string; ratio?: number; href: string };

export function RowListCard({
  title,
  rows,
  grid = false,
  className,
}: {
  title: string;
  rows: UnlockRow[];
  grid?: boolean;
  className?: string;
}) {
  const headingId = `${title}-heading`;
  return (
    <section className={`${p.card} ${className ?? ""}`} aria-labelledby={headingId}>
      <div className={t.sheetHead}>
        <h2 id={headingId} className={t.sectionTitle}>
          {title}
        </h2>
      </div>
      <ul className={`${p.rows} ${grid ? p.linkGrid : ""}`}>
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={row.href} className={p.row}>
              <span className={p.rowBody}>
                <span className={p.rowTitle}>{row.title}</span>
                <span className={p.rowDetail}>{row.detail}</span>
                {row.ratio !== undefined && (
                  <span className={p.rowBar} aria-hidden>
                    <span style={{ width: `${Math.min(1, Math.max(0, row.ratio)) * 100}%` }} />
                  </span>
                )}
              </span>
              <Icon name="chevron-right" className={p.chev} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
