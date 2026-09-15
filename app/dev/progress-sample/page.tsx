"use client";

// /progress 改善デザインのサンプル（ダッシュボード）。テスト環境専用。
//
// 上から「全体像 → 内訳 → 詳細」の順に読めるようにする:
//   1. 合格までの道のり（CP0〜試験日の道と、いまいる場所）＋主要指標4つ
//   2. いまの目標（向かっている CP の突破条件）と 合格準備度の内訳
//   3. トピックの到達度・学習した日・次の解放・くわしく見る
// 今日やること・所要時間・今日のミッションは /today に任せ、ここには置かない。

import Link from "next/link";
import { notFound } from "next/navigation";
import { useState } from "react";
import Mochit from "@/components/mochit/Mochit";
import Icon from "@/components/ui/Icon";
import AppNav from "../today-sample/nav";
import t from "../today-sample/today.module.css";
import {
  CHECKPOINTS,
  CLEARED_COUNT,
  EXAM,
  EXPECTED_IN_SEGMENT,
  FIELDS,
  GATE_BADGES,
  DAILY_ANSWERS,
  LINKS,
  NEXT_CHECKPOINT_TITLE,
  PACE,
  READINESS,
  READINESS_BANDS,
  STATS,
  TOPICS,
  TOP_RISK,
  UNLOCKS,
} from "./data";
import p from "./progress.module.css";

const BAND_EDGES = [60, 75, 85];
/** 道の列数: CP0〜CP6 の7つ ＋ 試験日 */
const ROAD_COLUMNS = CHECKPOINTS.length + 1;

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];
/** 表示する週数。隣のタイルと高さが揃う範囲で、新しい週から見せる。 */
const HEAT_WEEKS = 8;
const DAY_MS = 86_400_000;

/** 解答数 → 濃さの段階。0 は解いていない日（警告色にはしない）。 */
function heatLevel(answers: number): 0 | 1 | 2 | 3 | 4 {
  if (answers === 0) return 0;
  if (answers < 10) return 1;
  if (answers < 20) return 2;
  if (answers < 30) return 3;
  return 4;
}

type HeatDay = { date: Date; answers: number } | null;

/**
 * 直近 HEAT_WEEKS 週をカレンダーと同じ「行=週（月曜はじまり・上が古い）× 列=曜日」に並べる。
 * 今日より先のマスは null（描かない）。解答数は DAILY_ANSWERS の末尾を今日として割り当てる。
 */
function buildHeatWeeks(today: Date): HeatDay[][] {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekdayIndex = (base.getDay() + 6) % 7;
  const firstMonday = new Date(
    base.getTime() - (weekdayIndex + (HEAT_WEEKS - 1) * 7) * DAY_MS,
  );
  const weeks: HeatDay[][] = [];
  for (let w = 0; w < HEAT_WEEKS; w++) {
    const week: HeatDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(
        firstMonday.getFullYear(),
        firstMonday.getMonth(),
        firstMonday.getDate() + w * 7 + d,
      );
      const daysAgo = Math.round((base.getTime() - date.getTime()) / DAY_MS);
      if (daysAgo < 0) {
        week.push(null);
        continue;
      }
      const index = DAILY_ANSWERS.length - 1 - daysAgo;
      week.push({ date, answers: index >= 0 ? DAILY_ANSWERS[index] : 0 });
    }
    weeks.push(week);
  }
  return weeks;
}

function dayLabel(date: Date) {
  return `${date.getMonth() + 1}月${date.getDate()}日（${"日月火水木金土"[date.getDay()]}）`;
}

/** 道の上での位置（%）。index は列番号、within はその列から次の列までの進み具合。 */
function roadPosition(index: number, within = 0) {
  return ((index + 0.5 + within) / ROAD_COLUMNS) * 100;
}

export default function ProgressSamplePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ProgressSample />;
}

function ProgressSample() {
  const [pickedDay, setPickedDay] = useState<NonNullable<HeatDay> | null>(null);
  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日（${"日月火水木金土"[now.getDay()]}）`;

  const goal = CHECKPOINTS[CLEARED_COUNT];
  const remainingCheckpoints = CHECKPOINTS.length - CLEARED_COUNT;
  const earnedBadges = GATE_BADGES.filter((badge) => badge.earned).length;
  const gateRatio = earnedBadges / GATE_BADGES.length;

  // いまいる場所 = 最後に突破した CP から、次の CP までの区間を必須バッジの割合だけ進んだところ
  const lastCleared = CLEARED_COUNT - 1;
  const nowAt = roadPosition(lastCleared, gateRatio);
  const expectedAt = roadPosition(lastCleared, EXPECTED_IN_SEGMENT);

  const score = READINESS.score;
  const notStarted =
    TOPICS.total - TOPICS.examReady - TOPICS.basic - TOPICS.needsWork;
  const topicShare = (n: number) => `${(n / TOPICS.total) * 100}%`;

  const remainingBadges = GATE_BADGES.filter((badge) => !badge.earned);
  const doneBadges = GATE_BADGES.filter((badge) => badge.earned);

  const weeks = buildHeatWeeks(now);
  const heatDays = weeks
    .flat()
    .filter((day): day is NonNullable<HeatDay> => day !== null);
  const studyDays = heatDays.filter((day) => day.answers > 0).length;
  const totalAnswers = heatDays.reduce((sum, day) => sum + day.answers, 0);
  let streak = 0;
  for (let i = heatDays.length - 1; i >= 0 && heatDays[i].answers > 0; i--)
    streak++;
  let longestStreak = 0;
  let run = 0;
  for (const day of heatDays) {
    run = day.answers > 0 ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }
  // 月の見出し: その週に1日を含む行（先頭行は必ず）の左に月を出す
  const monthLabels = weeks.map((week, wi) => {
    const days = week.filter(
      (day): day is NonNullable<HeatDay> => day !== null,
    );
    const first = days.find((day) => day.date.getDate() === 1);
    if (first) return `${first.date.getMonth() + 1}月`;
    return wi === 0 && days[0] ? `${days[0].date.getMonth() + 1}月` : "";
  });

  return (
    <div className={t.shell}>
      <AppNav active="progress" />

      <main className={t.page}>
        <div className={`${t.inner} ${p.dashboard}`}>
          {/* ───── 1. 全体像: 合格までの道のり ───── */}
          <section className={p.overview} aria-labelledby="overview-heading">
            <p className={t.eyebrow}>
              <span className={t.eyebrowTitle}>進捗</span>
              <span className={t.eyebrowDate}>{dateLabel} 時点</span>
              <span className={t.sampleTag}>サンプル：数値はダミーです</span>
            </p>

            <div className={p.overviewHead}>
              <h1 id="overview-heading" className={p.overviewTitle}>
                合格までの道のり
              </h1>
              <p className={p.overviewLead}>
                いまは{" "}
                <strong>
                  CP{goal.order}「{goal.title}」
                </strong>{" "}
                に向かう途中。残り
                <span className={t.mono}>{remainingCheckpoints}</span>
                つのチェックポイントを越えると、試験本番です。
              </p>
            </div>

            <div className={p.road}>
              <div className={p.roadLine} aria-hidden>
                <span
                  className={p.roadDone}
                  style={{
                    left: `${roadPosition(0)}%`,
                    width: `${roadPosition(lastCleared) - roadPosition(0)}%`,
                  }}
                />
                <span
                  className={p.roadNow}
                  style={{
                    left: `${roadPosition(lastCleared)}%`,
                    width: `${nowAt - roadPosition(lastCleared)}%`,
                  }}
                />
              </div>

              <div className={p.here} style={{ left: `${nowAt}%` }}>
                <Mochit
                  size="xs"
                  screenContext="progress"
                  className={p.hereMochit}
                />
                <span className={p.hereLabel}>いまここ</span>
              </div>
              <span className={p.expected} style={{ left: `${expectedAt}%` }}>
                予定
              </span>

              <ol className={p.roadStops}>
                {CHECKPOINTS.map((cp) => {
                  const state =
                    cp.order < CLEARED_COUNT
                      ? "done"
                      : cp.order === CLEARED_COUNT
                        ? "goal"
                        : "next";
                  return (
                    <li key={cp.order} className={p.stop} data-state={state}>
                      <span className={p.stopDot} aria-hidden>
                        {state === "done" && (
                          <svg viewBox="0 0 20 20">
                            <path d="M5.5 10.5l3 3 6-7" />
                          </svg>
                        )}
                      </span>
                      <span className={p.stopCode}>CP{cp.order}</span>
                      <span className={p.stopTitle}>{cp.title}</span>
                    </li>
                  );
                })}
                <li className={p.stop} data-state="exam">
                  <span className={p.stopDot} aria-hidden>
                    <Icon name="target" className={p.flag} />
                  </span>
                  <span className={p.stopCode}>試験</span>
                  <span className={p.stopTitle}>{EXAM.dateLabel}</span>
                </li>
              </ol>
            </div>

            <dl className={p.kpis}>
              <div className={p.kpi}>
                <dt>合格準備度</dt>
                <dd>
                  <span className={p.kpiNum}>{score}</span>
                  <span className={p.kpiUnit}>/100</span>
                </dd>
                <p className={p.kpiNote}>{READINESS.bandLabel}</p>
              </div>
              <div className={p.kpi}>
                <dt>試験まで</dt>
                <dd>
                  <span className={p.kpiNum}>{EXAM.daysLeft}</span>
                  <span className={p.kpiUnit}>日</span>
                </dd>
                <p className={p.kpiNote}>{EXAM.dateLabel}</p>
              </div>
              <div className={p.kpi}>
                <dt>学習ペース</dt>
                <dd className={p.kpiWord} data-tone="good">
                  {PACE.label}
                </dd>
                <p className={p.kpiNote}>{PACE.detail}</p>
              </div>
              <a href="#gate" className={`${p.kpi} ${p.kpiLink}`}>
                <dt>突破試験まで</dt>
                <dd>
                  <span className={p.kpiNum}>{earnedBadges}</span>
                  <span className={p.kpiUnit}>
                    /{GATE_BADGES.length} バッジ
                  </span>
                </dd>
                <p className={p.kpiNote}>
                  CP{goal.order}の必須バッジ
                  <Icon name="chevron-right" className={p.kpiChev} />
                </p>
              </a>
            </dl>
          </section>

          {/* ───── 2. いまの目標: CP の突破条件（このページで唯一の強調ブロック） ───── */}
          <section
            id="gate"
            className={`${p.card} ${p.gate} ${p.spanGate}`}
            aria-labelledby="gate-heading"
          >
            <div className={p.gateHead}>
              <span className={p.gateTag}>いまの目標</span>
              <span className={p.gateCp}>
                CP{goal.order}「{goal.title}」の突破
              </span>
              <span className={p.gateCount}>
                <span className={t.mono}>{earnedBadges}</span>/
                {GATE_BADGES.length}
              </span>
            </div>

            <h2 id="gate-heading" className={p.gateTitle}>
              あと<span className={p.gateNum}>{remainingBadges.length}</span>
              つそろえば、突破試験に挑戦できます
            </h2>

            <div className={p.gateBar} aria-hidden>
              {[...doneBadges, ...remainingBadges].map((badge) => (
                <span key={badge.id} data-earned={badge.earned} />
              ))}
            </div>

            <ol className={p.todo}>
              {remainingBadges.map((badge) => (
                <li key={badge.id} className={p.todoItem}>
                  <span className={p.todoMark} aria-hidden />
                  <div className={p.todoBody}>
                    <p className={p.todoTitle}>{badge.title}</p>
                    <div className={p.todoProgress}>
                      <span className={p.todoBar} aria-hidden>
                        <span style={{ width: `${badge.ratio * 100}%` }} />
                      </span>
                      <span className={p.todoValue}>{badge.progressLabel}</span>
                    </div>
                  </div>
                  {badge.action && (
                    <Link href={badge.action.href} className={p.todoAction}>
                      {badge.action.label}
                      <Icon name="chevron-right" className={p.chev} />
                    </Link>
                  )}
                </li>
              ))}
            </ol>

            <div className={p.gateDone}>
              <span className={p.gateDoneLabel}>獲得済み</span>
              {doneBadges.map((badge) => (
                <span key={badge.id} className={p.gateDoneItem}>
                  <svg viewBox="0 0 20 20" aria-hidden>
                    <path d="M5.5 10.5l3 3 6-7" />
                  </svg>
                  {badge.title}
                </span>
              ))}
            </div>

            <p className={p.gateNote}>
              突破試験に合格すると、CP{goal.order + 1}「{NEXT_CHECKPOINT_TITLE}
              」へ進みます。
              <Link href="/plan" className={p.textLink}>
                ロードマップ
                <Icon name="chevron-right" className={p.chev} />
              </Link>
            </p>
          </section>

          {/* ───── 2. 内訳: 合格準備度 ───── */}
          <section
            className={`${p.card} ${p.spanReadiness}`}
            aria-labelledby="readiness-heading"
          >
            <div className={t.sheetHead}>
              <h2 id="readiness-heading" className={t.sectionTitle}>
                合格準備度の内訳
              </h2>
              <span className={t.sectionMeta}>実際の回答と定着から判定</span>
            </div>

            <ul className={p.fieldList}>
              {FIELDS.map((field) => {
                const band = READINESS_BANDS.find(
                  (b) => field.score >= b.from && field.score < b.to,
                );
                return (
                  <li key={field.id} className={p.field}>
                    <span className={p.fieldName}>
                      {field.label}
                      <span className={p.fieldMeta}>
                        出題 <span className={t.mono}>{field.questions}</span>問
                      </span>
                    </span>
                    <span className={p.fieldBar} aria-hidden>
                      <span
                        className={p.fieldFill}
                        style={{ width: `${field.score}%` }}
                      />
                      {BAND_EDGES.map((edge) => (
                        <span
                          key={edge}
                          className={p.fieldEdge}
                          style={{ left: `${edge}%` }}
                        />
                      ))}
                    </span>
                    <span className={p.fieldScore}>
                      <span className={t.mono}>{field.score}</span>
                      <span className={p.fieldBand}>{band?.label}</span>
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className={p.improve}>
              <div className={p.improveText}>
                <p className={p.improveLabel}>いちばん伸ばせるところ</p>
                <p className={p.improveMain}>{READINESS.improvement}</p>
                <p className={p.improveReason}>{READINESS.improvementReason}</p>
              </div>
              <Link href="/learn" className={p.textLink}>
                テクノロジの問題を解く
                <Icon name="chevron-right" className={p.chev} />
              </Link>
            </div>
          </section>

          {/* ───── 3. 詳細: トピックの到達度 ───── */}
          <section
            className={`${p.card} ${p.spanTopics}`}
            aria-labelledby="topics-heading"
          >
            <div className={t.sheetHead}>
              <h2 id="topics-heading" className={t.sectionTitle}>
                トピックの到達度
              </h2>
              <span className={t.sectionMeta}>
                全<span className={t.mono}>{TOPICS.total}</span>トピック
              </span>
            </div>
            <div className={p.stack} aria-hidden>
              <span
                data-tone="ready"
                style={{ width: topicShare(TOPICS.examReady) }}
              />
              <span
                data-tone="basic"
                style={{ width: topicShare(TOPICS.basic) }}
              />
              <span
                data-tone="work"
                style={{ width: topicShare(TOPICS.needsWork) }}
              />
            </div>
            <dl className={p.legend}>
              {[
                { tone: "ready", label: "本番対応OK", value: TOPICS.examReady },
                { tone: "basic", label: "基礎理解OK", value: TOPICS.basic },
                { tone: "work", label: "要復習", value: TOPICS.needsWork },
                { tone: "rest", label: "これから", value: notStarted },
              ].map((item) => (
                <div
                  key={item.tone}
                  className={p.legendItem}
                  data-tone={item.tone}
                >
                  <dt>{item.label}</dt>
                  <dd className={p.legendNum}>{item.value}</dd>
                </div>
              ))}
            </dl>
            <Link href="/review" className={p.risk}>
              <Icon name="alert" className={p.riskIcon} />
              <span className={p.riskText}>
                {TOP_RISK.label}（
                <span className={t.mono}>{TOP_RISK.count}</span>件）
              </span>
              <span className={p.riskAction}>
                復習する
                <Icon name="chevron-right" className={p.chev} />
              </span>
            </Link>
          </section>

          {/* ───── 3. 詳細: 学習した日 ───── */}
          <section
            className={`${p.card} ${p.spanHistory}`}
            aria-labelledby="history-heading"
          >
            <div className={t.sheetHead}>
              <h2 id="history-heading" className={t.sectionTitle}>
                学習した日
              </h2>
              <span className={t.sectionMeta}>
                直近{HEAT_WEEKS}週で <span className={t.mono}>{studyDays}</span>
                日
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
                        if (!day)
                          return <span key={di} className={p.heatEmpty} />;
                        const picked =
                          pickedDay?.date.getTime() === day.date.getTime();
                        return (
                          <span
                            key={di}
                            className={p.heatDay}
                            data-level={heatLevel(day.answers)}
                            data-picked={picked}
                            title={`${dayLabel(day.date)} ${day.answers}問`}
                            onPointerEnter={() => setPickedDay(day)}
                            onClick={() => setPickedDay(day)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className={p.heatFoot}>
                  <p className={p.heatReadout} aria-live="polite">
                    {pickedDay ? (
                      <>
                        {dayLabel(pickedDay.date)}{" "}
                        <strong>
                          <span className={t.mono}>{pickedDay.answers}</span>問
                        </strong>
                      </>
                    ) : (
                      "マスにふれると解答数が出ます"
                    )}
                  </p>
                  <div className={p.heatLegend} aria-hidden>
                    0問
                    {[0, 1, 2, 3, 4].map((level) => (
                      <span
                        key={level}
                        className={p.heatDay}
                        data-level={level}
                      />
                    ))}
                    30問〜
                  </div>
                </div>
              </div>
              <dl className={p.stats}>
                <div>
                  <dt>連続学習</dt>
                  <dd>
                    <span className={p.statNum}>{streak}</span>日
                    <small>
                      {HEAT_WEEKS}週のベスト {longestStreak}日
                    </small>
                  </dd>
                </div>
                <div>
                  <dt>学習した日</dt>
                  <dd>
                    <span className={p.statNum}>{studyDays}</span>日
                    <small>{heatDays.length}日のうち</small>
                  </dd>
                </div>
                <div>
                  <dt>解いた問題</dt>
                  <dd>
                    <span className={p.statNum}>{totalAnswers}</span>問
                    <small>{HEAT_WEEKS}週の合計</small>
                  </dd>
                </div>
                <div>
                  <dt>正答率</dt>
                  <dd>
                    <span className={p.statNum}>{STATS.accuracy}</span>%
                    <small>{HEAT_WEEKS}週の平均</small>
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* ───── 3. 詳細: 次の解放 ───── */}
          <section
            className={`${p.card} ${p.spanUnlocks}`}
            aria-labelledby="unlock-heading"
          >
            <div className={t.sheetHead}>
              <h2 id="unlock-heading" className={t.sectionTitle}>
                次の解放
              </h2>
            </div>
            <ul className={p.rows}>
              {UNLOCKS.map((unlock) => (
                <li key={unlock.id}>
                  <Link href={unlock.href} className={p.row}>
                    <span className={p.rowBody}>
                      <span className={p.rowTitle}>{unlock.title}</span>
                      <span className={p.rowDetail}>{unlock.detail}</span>
                      <span className={p.rowBar} aria-hidden>
                        <span style={{ width: `${unlock.ratio * 100}%` }} />
                      </span>
                    </span>
                    <Icon name="chevron-right" className={p.chev} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* ───── 3. 詳細: くわしく見る ───── */}
          <nav
            className={`${p.card} ${p.spanLinks}`}
            aria-labelledby="links-heading"
          >
            <div className={t.sheetHead}>
              <h2 id="links-heading" className={t.sectionTitle}>
                くわしく見る
              </h2>
            </div>
            <ul className={`${p.rows} ${p.linkGrid}`}>
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={p.row}>
                    <span className={p.rowBody}>
                      <span className={p.rowTitle}>{link.label}</span>
                      <span className={p.rowDetail}>{link.detail}</span>
                    </span>
                    <Icon name="chevron-right" className={p.chev} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>
    </div>
  );
}
