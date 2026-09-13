"use client";

// A7 Calm Light: /today 改善デザインのサンプル（テスト環境専用）。
// 淡い光の上に半透明のガラス面。色はティール1色（濃淡）＋ 目印のくすんだアンバーだけ。
// 情報は「今日のフォーカス」1枚に集約し、残りは一目で読める小タイルに絞る。

import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/Icon";
import {
  EXAM,
  FOCUS,
  MILESTONE,
  MISSION_REWARD_XP,
  MISSIONS,
  READINESS,
  ROUTE,
  STREAK,
  TODAY,
  WEEKDAYS,
  doneCount,
  missionsDone,
  remainingMinutes,
} from "./data";
import { Gauge, Ring } from "./parts";
import s from "./calm-light.module.css";

type Palette = {
  meter: string;
  track: string;
  missionDone: string;
  missionActive: string;
};

const PALETTE: Palette = {
  meter: "#3FA196",
  track: "rgba(30, 60, 58, 0.08)",
  missionDone: "#3FA196",
  missionActive: "#8CCBC3",
};

const NAV: { label: string; icon: IconName; active?: boolean }[] = [
  { label: "今日", icon: "book-open", active: true },
  { label: "学ぶ", icon: "library" },
  { label: "復習", icon: "rotate" },
  { label: "進捗", icon: "chart" },
  { label: "その他", icon: "ellipsis" },
];

export default function TodayCalmLight() {
  const palette = PALETTE;
  return (
    <div className={s.root}>
      <div className={s.aurora} aria-hidden>
        <span className={s.blobA} />
        <span className={s.blobB} />
        <span className={s.blobC} />
      </div>

      <main className={s.main}>
        <header className={s.header}>
          <div>
            <p className={s.date}>{TODAY.dateLabel}</p>
            <h1 className={s.title}>{TODAY.greeting}</h1>
          </div>
          <div className={s.streakChip}>
            <Icon name="flame" className={s.streakIcon} />
            <span className={s.num}>{STREAK.days}</span>
          </div>
        </header>

        <div className={s.grid}>
          {/* ヒーロー: 今日のフォーカス */}
          <section className={`${s.card} ${s.hero}`} aria-labelledby="glass-focus">
            <div className={s.heroTop}>
              <span className={s.pill}>今日のフォーカス</span>
              <span className={s.pillQuiet}>
                <Icon name="clock" className={s.pillIcon} />
                {FOCUS.minutes}分
              </span>
              <span className={s.pillQuiet}>{FOCUS.kind}</span>
            </div>

            <div className={s.heroBody}>
              <div className={s.heroText}>
                <p className={s.field}>{FOCUS.field}</p>
                <h2 id="glass-focus" className={s.heroTitle}>
                  {FOCUS.title}
                </h2>
                <p className={s.reason}>{FOCUS.reason}</p>
              </div>
              <Ring
                value={doneCount / ROUTE.length}
                size={104}
                stroke={10}
                track={palette.track}
                color={palette.meter}
                className={s.heroRing}
              >
                <div className={s.ringLabel}>
                  <span className={s.num}>
                    {doneCount}
                    <small>/{ROUTE.length}</small>
                  </span>
                  <span>今日のルート</span>
                </div>
              </Ring>
            </div>

            <div className={s.heroActions}>
              <Link href="#" className={s.cta}>
                <span className={s.ctaIcon}>
                  <Icon name="arrow-right" className={s.ctaArrow} strokeWidth={2.4} />
                </span>
                レッスンを始める
              </Link>
              <p className={s.xp}>
                全問正解で <b>+{FOCUS.xp} XP</b>
              </p>
            </div>
          </section>

          {/* 試験まで */}
          <section className={`${s.card} ${s.tile} ${s.exam}`}>
            <p className={s.tileLabel}>試験まで</p>
            <p className={s.bigNum}>
              {EXAM.daysLeft}
              <small>日</small>
            </p>
            <div className={s.bar}>
              <span style={{ width: `${EXAM.elapsed * 100}%` }} />
            </div>
            <p className={s.tileFoot}>{EXAM.dateLabel} 本番</p>
          </section>

          {/* 合格準備度 */}
          <section className={`${s.card} ${s.tile} ${s.readiness}`}>
            <p className={s.tileLabel}>合格準備度</p>
            <div className={s.gaugeWrap}>
              <Gauge
                value={READINESS.score / 100}
                width={132}
                stroke={12}
                track={palette.track}
                gradient={[palette.meter, palette.meter]}
              />
              <p className={s.gaugeNum}>
                {READINESS.score}
                <small>%</small>
              </p>
            </div>
            <p className={s.delta}>
              <Icon name="chart" className={s.deltaIcon} />
              今週 +{READINESS.weekDelta}
            </p>
          </section>

          {/* ストリーク */}
          <section className={`${s.card} ${s.tile} ${s.week}`}>
            <div className={s.tileHead}>
              <p className={s.tileLabel}>今週の学習</p>
              <p className={s.tileMeta}>{STREAK.days}日連続</p>
            </div>
            <ol className={s.days}>
              {STREAK.week.map((done, i) => {
                const today = i === 6;
                return (
                  <li key={WEEKDAYS[i]} data-done={done} data-today={today}>
                    <span className={s.dayDot}>
                      {done && <Icon name="check" className={s.dayCheck} strokeWidth={3} />}
                    </span>
                    <span className={s.dayLabel}>{today ? "今日" : WEEKDAYS[i]}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* ミッション */}
          <section className={`${s.card} ${s.tile} ${s.missions}`}>
            <div className={s.tileHead}>
              <p className={s.tileLabel}>デイリーミッション</p>
              <p className={s.tileMeta}>
                {missionsDone}/{MISSIONS.length}
              </p>
            </div>
            <ul className={s.missionList}>
              {MISSIONS.map((m) => {
                const done = m.progress >= m.goal;
                return (
                  <li key={m.label} data-done={done}>
                    <Ring
                      value={m.progress / m.goal}
                      size={26}
                      stroke={4}
                      track={palette.track}
                      color={done ? palette.missionDone : palette.missionActive}
                    />
                    <span className={s.missionLabel}>{m.label}</span>
                    <span className={s.missionCount}>
                      {m.progress}/{m.goal}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className={s.reward}>
              <Icon name="gift" className={s.rewardIcon} />
              全部そろうと +{MISSION_REWARD_XP} XP
            </p>
          </section>

          {/* 次の目標 */}
          <section className={`${s.card} ${s.tile} ${s.milestone}`}>
            <p className={s.tileLabel}>次の目標</p>
            <p className={s.milestoneTitle}>
              <span>{MILESTONE.code}</span>
              {MILESTONE.title}
            </p>
            <div className={s.segments}>
              {Array.from({ length: MILESTONE.total }, (_, i) => (
                <span key={i} data-on={i < MILESTONE.earned} />
              ))}
            </div>
            <p className={s.tileFoot}>
              必須バッジ {MILESTONE.earned}/{MILESTONE.total}・今日「{MILESTONE.badge}」が進みます
            </p>
          </section>
        </div>

        {/* 今日のルート */}
        <section className={s.routeSection} aria-labelledby="glass-route">
          <div className={s.sectionHead}>
            <h2 id="glass-route">今日のルート</h2>
            <p>残り約{remainingMinutes}分</p>
          </div>
          <ol className={s.route}>
            {ROUTE.map((lesson, i) => (
              <li key={lesson.code} className={s.routeItem} data-status={lesson.status}>
                <Link href="#" className={`${s.card} ${s.routeCard}`}>
                  <div className={s.routeTop}>
                    <span className={s.routeStep}>{String(i + 1).padStart(2, "0")}</span>
                    {lesson.status === "done" ? (
                      <span className={s.routeDone}>
                        <Icon name="check" className={s.routeDoneIcon} strokeWidth={3} />
                      </span>
                    ) : lesson.status === "now" ? (
                      <span className={s.routeNow}>いまここ</span>
                    ) : null}
                  </div>
                  <p className={s.routeTitle}>{lesson.title}</p>
                  <p className={s.routeMeta}>
                    <span data-kind={lesson.kind}>{lesson.kind}</span>
                    {lesson.minutes}分
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <nav className={s.tabbar} aria-label="メインナビゲーション">
        {NAV.map((item) => (
          <Link
            key={item.label}
            href="#"
            className={s.tab}
            aria-current={item.active ? "page" : undefined}
          >
            <Icon name={item.icon} className={s.tabIcon} strokeWidth={item.active ? 2.2 : 1.8} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
