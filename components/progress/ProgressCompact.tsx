"use client";

// /progress のダッシュボード。ひと目で次の4つが分かるように組む:
//   1. いまの実力と、次にやること（HeroCard）
//   2. どこにいるか（RoadCard: CP の道のり・試験日・ペース）
//   3. どこができていて、どこが課題か（StatusCard: 分野・トピック・苦手・参考書）
//   4. 伸びていること（GrowthCard: 週ごとの積み上げ・先週比・次の区切り）
// 判定・数値は既存のロジックから受け取り、ここでは見せ方だけを決める。

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { badgeActionHref } from "@/components/badges/BadgeList";
import { STAGE_LABELS } from "@/lib/checkpointDetail";
import { saveColorSchemePreference, type ColorSchemePreference } from "@/lib/colorScheme";
import type { CheckpointStage } from "@/lib/checkpoints";
import type { WeekBucket } from "@/lib/progressGrowth";
import type { ReferenceReadingOverview } from "@/lib/referenceBook";
import type { BadgeDef, CheckpointDef, CheckpointGate, CheckpointId } from "@/types/checkpoint";
import type { ExamReadinessResult } from "@/types/examReadiness";
import type { IntegratedLearningStatus } from "@/types/integratedStatus";
import { ReadingDetailBody } from "./ProgressDetailCards";
import t from "@/components/today/todayView.module.css";
import c from "./progressCompact.module.css";

// 合格準備度の段階（lib/examReadiness/calculator の readinessBand と同じ境界）
const BANDS = [
  { from: 0, label: "要強化" },
  { from: 60, label: "あと一歩" },
  { from: 75, label: "準備良好" },
  { from: 85, label: "安定" },
] as const;

/** 分野・スコアの状態（得意 / まずまず / 要強化）。 */
function scoreTone(score: number | null): { tone: "good" | "ok" | "weak" | "none"; label: string } {
  if (score === null) return { tone: "none", label: "判定中" };
  if (score >= 75) return { tone: "good", label: "得意" };
  if (score >= 60) return { tone: "ok", label: "まずまず" };
  return { tone: "weak", label: "要強化" };
}

function Delta({ value, unit = "", label }: { value: number | null; unit?: string; label: string }) {
  if (value === null) return null;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  return (
    <span className={c.delta} data-dir={value > 0 ? "up" : value < 0 ? "down" : "flat"}>
      {label} {sign}
      {Math.abs(value)}
      {unit}
    </span>
  );
}

// ───────────────────────── 1. いまの実力と、次にやること ─────────────────────────

export type NextAction = { label: string; sub: string | null; href: string };

export function HeroCard({
  dateLabel,
  readiness,
  weekDelta,
  series,
  nextAction,
  className,
}: {
  dateLabel: string;
  readiness: ExamReadinessResult | null;
  weekDelta: number | null;
  series: number[];
  nextAction: NextAction;
  className?: string;
}) {
  const score = readiness?.score ?? null;
  const band = score === null ? null : [...BANDS].reverse().find((b) => score >= b.from)!;
  const nextBand = score === null ? null : BANDS.find((b) => b.from > score) ?? null;

  return (
    <section className={`${c.card} ${c.hero} ${className ?? ""}`} aria-labelledby="hero-heading">
      <div data-guide="progress-readiness">
        <p className={c.label}>
          <span id="hero-heading">合格準備度</span>
          <span className={c.date}>{dateLabel}</span>
        </p>
        <div className={c.heroRow}>
          {score === null ? (
            <div>
              <p className={c.scorePending}>判定前</p>
              <p className={c.scoreNote}>問題に答えると、100点満点で判定が始まります</p>
            </div>
          ) : (
            <div>
              <p className={c.score}>
                <span className={t.mono}>{score}</span>
                <span className={c.scoreUnit}>/100</span>
              </p>
              <p className={c.scoreMeta}>
                <span className={c.bandChip} data-tone={scoreTone(score).tone}>
                  {band?.label}
                </span>
                <Delta value={weekDelta} label="先週比" />
              </p>
            </div>
          )}
          {series.length >= 2 && <Sparkline values={series} />}
        </div>

        {score !== null && (
          <div className={c.gauge}>
            <div className={c.gaugeTrack} aria-hidden>
              <span className={c.gaugeFill} style={{ width: `${score}%` }} />
              {BANDS.slice(1).map((b) => (
                <span key={b.from} className={c.gaugeTick} style={{ left: `${b.from}%` }} />
              ))}
              <span className={c.gaugeMarker} style={{ left: `${score}%` }} />
            </div>
            {/* 段階の境目の点数だけを目盛りに出す（いまの段階名は上のチップ） */}
            <div className={c.gaugeScale} aria-hidden>
              {BANDS.slice(1).map((b) => (
                <span key={b.from} style={{ left: `${b.from}%` }}>
                  {b.from}
                </span>
              ))}
            </div>
            {nextBand && (
              <p className={c.gaugeNote}>
                「{nextBand.label}」まであと<span className={t.mono}> {nextBand.from - score} </span>点
              </p>
            )}
          </div>
        )}
      </div>

      <Link href={nextAction.href} className={c.next}>
        <span className={c.nextBody}>
          <span className={c.nextLabel}>次にやること</span>
          <span className={c.nextTitle}>{nextAction.label}</span>
          {nextAction.sub && <span className={c.nextSub}>{nextAction.sub}</span>}
        </span>
        <Icon name="chevron-right" className={c.nextChev} />
      </Link>
    </section>
  );
}

/** 合格準備度の推移（1系列なので凡例なし。最後の点だけ強調）。 */
function Sparkline({ values }: { values: number[] }) {
  const w = 120;
  const h = 40;
  // 変化が見える縦幅にする（ただし最低20点幅。小さな揺れを大げさにしない）
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(0, 20 - (hi - lo)) / 2;
  const min = Math.max(0, lo - pad);
  const max = Math.min(100, hi + pad);
  const x = (i: number) => (i / (values.length - 1)) * (w - 6) + 3;
  const y = (v: number) => h - 4 - ((v - min) / (max - min || 1)) * (h - 8);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  return (
    <svg className={c.spark} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`合格準備度の推移 ${values[0]}点から${values[last]}点`}>
      <path d={d} fill="none" />
      <circle cx={x(last)} cy={y(values[last])} r={4} />
    </svg>
  );
}

// ───────────────────────── 2. どこにいるか ─────────────────────────

export function RoadCard({
  checkpoints,
  stages,
  current,
  gate,
  earnedBadges,
  conditionMetIds,
  examDateShort,
  exam,
  pace,
  proposalHref,
  onSelectCheckpoint,
  className,
}: {
  checkpoints: CheckpointDef[];
  stages: Record<CheckpointId, CheckpointStage>;
  current: CheckpointDef;
  gate: CheckpointGate;
  earnedBadges: BadgeDef[];
  conditionMetIds: Set<string>;
  examDateShort: string | null;
  exam: { daysLeft: number | null; dateLabel: string | null };
  pace: { label: string; tone: "good" | "neutral" | "warn" } | null;
  proposalHref: string | null;
  onSelectCheckpoint: (id: CheckpointId) => void;
  className?: string;
}) {
  const needed = Math.max(gate.requiredBadgeCount, 1);
  const earned = Math.min(gate.earnedRequiredCount, needed);
  const allCleared = checkpoints.every((cp) => stages[cp.id] === "cleared");
  const remaining = checkpoints.filter((cp) => stages[cp.id] !== "cleared").length;

  return (
    <section id="gate" className={`${c.card} ${c.roadCard} ${className ?? ""}`} aria-labelledby="road-heading">
      <p className={c.label}>
        <span>いまいる場所</span>
        {!allCleared && (
          <span className={c.date}>
            試験まで残り <span className={t.mono}>{remaining}</span> CP
          </span>
        )}
      </p>
      <h2 id="road-heading" className={c.goal}>
        {allCleared ? (
          "すべてのCPを突破しました"
        ) : (
          <>
            <span className={c.goalCode}>CP{current.order}</span>
            {current.title}
            <span className={c.goalMeta}>
              突破まで <span className={t.mono}>{`${earned}/${gate.requiredBadgeCount}`}</span>
            </span>
          </>
        )}
      </h2>

      <ol className={c.road} data-guide="progress-road" style={{ gridTemplateColumns: `repeat(${checkpoints.length + 1}, minmax(0, 1fr))` }}>
        {checkpoints.map((cp) => {
          const stage = stages[cp.id];
          const state = stage === "cleared" ? "done" : stage === "current" ? "now" : "next";
          return (
            <li key={cp.id} className={c.stop} data-state={state}>
              <button
                type="button"
                className={c.stopButton}
                onClick={() => onSelectCheckpoint(cp.id)}
                aria-label={`CP${cp.order}「${cp.title}」（${STAGE_LABELS[stage]}）の完了条件を見る`}
                aria-haspopup="dialog"
              >
                <span className={c.dot} aria-hidden />
                <span className={c.stopCode}>CP{cp.order}</span>
              </button>
            </li>
          );
        })}
        <li className={c.stop} data-state="exam">
          <span className={c.stopButton}>
            <span className={c.dot} aria-hidden />
            <span className={c.stopCode}>{examDateShort ?? "試験"}</span>
          </span>
        </li>
      </ol>

      {gate.finalExamUnlocked && !gate.finalExamPassed ? (
        <p className={c.roadReady}>条件がそろいました。突破試験に挑戦できます。</p>
      ) : (
        (earnedBadges.length > 0 || gate.missingBadges.length > 0) && (
          <ul className={c.todo}>
            {earnedBadges.map((badge) => (
              <li key={badge.id} className={c.todoRow} data-done>
                <span className={c.check} aria-hidden />
                <span className={c.todoTitle}>{badge.label}</span>
                <span className={c.todoSub}>達成</span>
              </li>
            ))}
            {gate.missingBadges.map((badge) => (
              <li key={badge.id}>
                <Link href={badgeActionHref(badge)} className={c.todoRow}>
                  <span className={c.check} aria-hidden />
                  <span className={c.todoTitle}>{badge.label}</span>
                  <span className={c.todoSub}>
                    {conditionMetIds.has(badge.id) ? "まもなく達成" : badge.conditionLabel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )
      )}

      <dl className={c.roadStats} data-guide="progress-kpis">
        <div>
          <dt>試験まで</dt>
          <dd>
            {exam.daysLeft === null ? (
              <Link href="/settings" className={c.inlineLink}>
                日付を決める
              </Link>
            ) : (
              <>
                <span className={c.statNum}>{exam.daysLeft}</span>日
                {exam.dateLabel && <span className={c.statSub}>{exam.dateLabel}</span>}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>ペース</dt>
          <dd className={c.paceWord} data-tone={pace?.tone ?? "neutral"}>
            {proposalHref ? (
              <Link href={proposalHref} className={c.inlineLink}>
                {pace?.label ?? "確認中"}・立て直し案
              </Link>
            ) : (
              pace?.label ?? "確認中"
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

// ───────────────────────── 3. できている / 課題 ─────────────────────────

export function StatusCard({
  readiness,
  status,
  totalTopicCount,
  reading,
  bookTitle,
  className,
}: {
  readiness: ExamReadinessResult | null;
  status: IntegratedLearningStatus | null;
  totalTopicCount: number;
  reading: ReferenceReadingOverview | null;
  bookTitle: string | null;
  className?: string;
}) {
  const [bookOpen, setBookOpen] = useState(false);
  const fields = readiness?.score != null ? readiness.fields : null;

  const examReady = status?.examReadyTopicCount ?? 0;
  const basicOnly = status ? Math.max(0, status.basicUnderstoodTopicCount - examReady) : 0;
  const needsWork = status ? status.reviewNeededTopicCount + status.weakTopicCount : 0;
  const notStarted = Math.max(0, totalTopicCount - examReady - basicOnly - needsWork);
  const share = (n: number) => `${totalTopicCount > 0 ? (n / totalTopicCount) * 100 : 0}%`;
  const weak = status?.weakTopics.slice(0, 3) ?? [];
  const bookPercent = reading ? Math.round(reading.progress.ratio * 100) : 0;
  const nextChapter = reading?.chapters.find((ch) => ch.id === reading.nextChapterId) ?? null;

  return (
    <section className={`${c.card} ${className ?? ""}`} aria-labelledby="status-heading">
      <p className={c.label}>
        <span id="status-heading">できていること・課題</span>
      </p>

      {fields && (
        <ul className={c.fields} data-guide="progress-breakdown">
          {fields.map((field) => {
            const tone = scoreTone(field.score);
            return (
              <li key={field.fieldId} className={c.field}>
                <span className={c.fieldName}>{field.label}</span>
                <span className={c.bar} data-tone={tone.tone} aria-hidden>
                  <span style={{ width: `${field.score ?? 0}%` }} />
                </span>
                <span className={`${t.mono} ${c.fieldScore}`}>{field.score ?? "—"}</span>
                <span className={c.toneTag} data-tone={tone.tone}>
                  {tone.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className={c.topics}>
        <p className={c.subhead}>
          トピック
          <span className={c.subheadMeta}>
            全<span className={t.mono}>{totalTopicCount}</span>
          </span>
        </p>
        {status ? (
          <>
            <div className={c.stack} aria-hidden>
              <span data-tone="good" style={{ width: share(examReady) }} />
              <span data-tone="ok" style={{ width: share(basicOnly) }} />
              <span data-tone="weak" style={{ width: share(needsWork) }} />
            </div>
            <ul className={c.legend}>
              <li data-tone="good">
                本番対応OK<b>{examReady}</b>
              </li>
              <li data-tone="ok">
                基礎理解<b>{basicOnly}</b>
              </li>
              <li data-tone="weak">
                要復習・苦手<b>{needsWork}</b>
              </li>
              <li data-tone="none">
                これから<b>{notStarted}</b>
              </li>
            </ul>
          </>
        ) : (
          <p className={c.muted}>確認問題に答えると、トピックごとの到達度が出ます。</p>
        )}
      </div>

      {weak.length > 0 && (
        <Link href="/review" className={c.weak}>
          <span className={c.weakLabel}>苦手</span>
          <span className={c.weakList}>{weak.map((w) => w.title).join("・")}</span>
          <span className={c.weakAction}>
            復習する
            <Icon name="chevron-right" className={c.chev} />
          </span>
        </Link>
      )}

      {reading && bookTitle && (
        <div className={c.book}>
          <button
            type="button"
            className={c.bookRow}
            aria-expanded={bookOpen}
            aria-controls="book-detail"
            onClick={() => setBookOpen((v) => !v)}
          >
            <span className={c.bookLabel}>参考書</span>
            <span className={c.bar} aria-hidden>
              <span style={{ width: `${bookPercent}%` }} />
            </span>
            <span className={`${t.mono} ${c.fieldScore}`}>{bookPercent}%</span>
            <Icon name="chevron-down" className={`${c.chev} ${bookOpen ? c.chevOpen : ""}`} />
          </button>
          {!bookOpen && nextChapter && <p className={c.bookNext}>次に読む {nextChapter.title}</p>}
          {bookOpen && (
            <div id="book-detail" className={c.bookDetail}>
              <ReadingDetailBody bookTitle={bookTitle} overview={reading} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ───────────────────────── 4. 伸びていること ─────────────────────────

export function GrowthCard({
  weeks,
  streak,
  longestStreak,
  understoodGrowth,
  milestone,
  days,
  className,
}: {
  weeks: WeekBucket[];
  streak: number;
  longestStreak: number;
  understoodGrowth: { delta: number; since: string } | null;
  /** 次の区切り（理解したトピック数の10刻み）。判定前は null */
  milestone: { target: number; remaining: number } | null;
  /** 開くと出す日ごとの記録 */
  days: ReactNode;
  className?: string;
}) {
  const [daysOpen, setDaysOpen] = useState(false);
  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks[weeks.length - 2] ?? null;
  const answerDelta = lastWeek ? thisWeek.answers - lastWeek.answers : null;
  const accuracyDelta =
    lastWeek && thisWeek.accuracy !== null && lastWeek.accuracy !== null
      ? thisWeek.accuracy - lastWeek.accuracy
      : null;
  const maxAnswers = Math.max(1, ...weeks.map((w) => w.answers));
  const previousBest = Math.max(0, ...weeks.slice(0, -1).map((w) => w.answers));
  const bestWeek = thisWeek.answers > 0 && thisWeek.answers > previousBest;
  const total = weeks.reduce((s, w) => s + w.answers, 0);

  return (
    <section className={`${c.card} ${className ?? ""}`} aria-labelledby="growth-heading">
      <p className={c.label}>
        <span id="growth-heading">伸びていること</span>
        {bestWeek && <span className={c.best}>今週は直近8週でいちばん</span>}
      </p>

      <dl className={c.growthStats}>
        <div>
          <dt>今週解いた問題</dt>
          <dd>
            <span className={c.statNum}>{thisWeek.answers}</span>問
          </dd>
          <Delta value={answerDelta} label="先週比" />
        </div>
        <div>
          <dt>今週の正答率</dt>
          <dd>
            {thisWeek.accuracy === null ? (
              "—"
            ) : (
              <>
                <span className={c.statNum}>{thisWeek.accuracy}</span>%
              </>
            )}
          </dd>
          <Delta value={accuracyDelta} unit="pt" label="先週比" />
        </div>
        <div>
          <dt>連続学習</dt>
          <dd>
            <span className={c.statNum}>{streak}</span>日
          </dd>
          <span className={c.deltaMuted}>最長 {longestStreak}日</span>
        </div>
      </dl>

      <div className={c.weeks} role="img" aria-label={`直近8週の解いた問題 合計${total}問`}>
        {weeks.map((week, i) => {
          const isThis = i === weeks.length - 1;
          const [, m, d] = week.start.split("-").map(Number);
          return (
            <div key={week.start} className={c.week} title={`${m}/${d}の週 ${week.answers}問${week.accuracy !== null ? `・正答率${week.accuracy}%` : ""}`}>
              <span className={c.weekValue}>{isThis || week.answers === maxAnswers ? week.answers : ""}</span>
              <span className={c.weekTrack}>
                <span
                  className={c.weekBar}
                  data-this={isThis || undefined}
                  style={{ height: `${week.answers > 0 ? Math.max(6, (week.answers / maxAnswers) * 100) : 0}%` }}
                />
              </span>
              <span className={c.weekLabel}>{isThis ? "今週" : i === 0 ? `${m}/${d}` : ""}</span>
            </div>
          );
        })}
      </div>

      {(understoodGrowth || milestone) && (
        <ul className={c.wins}>
          {understoodGrowth && understoodGrowth.delta > 0 && (
            <li>
              理解したトピックが
              <b>
                <span className={t.mono}> +{understoodGrowth.delta} </span>
              </b>
              {(() => {
                const [, m, d] = understoodGrowth.since.split("-").map(Number);
                return `（${m}/${d}から）`;
              })()}
            </li>
          )}
          {milestone && (
            <li>
              あと<b><span className={t.mono}> {milestone.remaining} </span></b>トピックで{milestone.target}トピック理解
            </li>
          )}
        </ul>
      )}

      <button
        type="button"
        className={c.moreButton}
        aria-expanded={daysOpen}
        onClick={() => setDaysOpen((v) => !v)}
      >
        {daysOpen ? "閉じる" : "日ごとの記録を見る"}
        <Icon name="chevron-down" className={`${c.chev} ${daysOpen ? c.chevOpen : ""}`} />
      </button>
      {daysOpen && <div className={c.daysDetail}>{days}</div>}
    </section>
  );
}

// ───────────────────────── くわしく見る ─────────────────────────

export function LinkRow({
  links,
  className,
}: {
  links: { id: string; title: string; meta?: string; href: string }[];
  className?: string;
}) {
  return (
    <nav className={`${c.links} ${className ?? ""}`} aria-label="くわしく見る" data-guide="progress-links">
      {links.map((link) => (
        <Link key={link.id} href={link.href} className={c.link}>
          <span>{link.title}</span>
          {link.meta && <span className={c.linkMeta}>{link.meta}</span>}
          <Icon name="chevron-right" className={c.chev} />
        </Link>
      ))}
    </nav>
  );
}

// ───────────────────────── 画面の色 ─────────────────────────

const SCHEME_OPTIONS: { value: ColorSchemePreference; label: string }[] = [
  { value: "system", label: "自動" },
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
];

/** ライト / ダーク / 端末に合わせる の切り替え（この端末に保存）。 */
export function SchemeToggle({
  preference,
  className,
}: {
  preference: ColorSchemePreference;
  className?: string;
}) {
  return (
    <div className={`${c.scheme} ${className ?? ""}`}>
      <span id="scheme-label">画面の色</span>
      <div role="radiogroup" aria-labelledby="scheme-label" className={c.schemeOptions}>
        {SCHEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={preference === option.value}
            className={c.schemeOption}
            onClick={() => saveColorSchemePreference(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
