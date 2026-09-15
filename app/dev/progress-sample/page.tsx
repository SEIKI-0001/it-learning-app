"use client";

// /progress 改善デザインのサンプル。テスト環境専用。
//
// このページが答えるのは「合格に対して、いまどこにいるか」だけ:
//   1. 合格準備度と、いちばん伸ばせるところ（ヒーローの目盛り）
//   2. その内訳（分野別・トピックの到達度）
//   3. 道のり（チェックポイント・次の解放）
//   4. 積み上げ（学習した日・累計）
// 今日やること・所要時間・今日のミッションは /today に任せ、ここには置かない。

import Link from "next/link";
import { notFound } from "next/navigation";
import Mochit from "@/components/mochit/Mochit";
import Icon from "@/components/ui/Icon";
import AppNav from "../today-sample/nav";
import { PaletteBar, usePalette } from "../today-sample/palette";
import t from "../today-sample/today.module.css";
import {
  CHECKPOINTS,
  CURRENT_CHECKPOINT,
  EXAM,
  FIELDS,
  GATE,
  HEATMAP_MINUTES,
  LINKS,
  PACE,
  READINESS,
  READINESS_BANDS,
  SCORED_QUESTIONS,
  STATS,
  TOPICS,
  TOP_RISK,
  UNLOCKS,
} from "./data";
import p from "./progress.module.css";

const BAND_EDGES = [60, 75, 85];

function heatLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes === 0) return 0;
  if (minutes < 12) return 1;
  if (minutes < 18) return 2;
  if (minutes < 24) return 3;
  return 4;
}

export default function ProgressSamplePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ProgressSample />;
}

function ProgressSample() {
  const [palette, setPalette] = usePalette();
  const withMochit = palette === "mochit";

  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日（${"日月火水木金土"[now.getDay()]}）`;

  const score = READINESS.score;
  const basicOnly = TOPICS.basic;
  const notStarted =
    TOPICS.total - TOPICS.examReady - TOPICS.basic - TOPICS.needsWork;
  const topicShare = (n: number) => `${(n / TOPICS.total) * 100}%`;

  // 12週 × 7日。列が週、行が曜日。最後の列の今日より後ろは描かない。
  const weeks: number[][] = [];
  for (let i = 0; i < HEATMAP_MINUTES.length; i += 7) {
    weeks.push(HEATMAP_MINUTES.slice(i, i + 7));
  }

  return (
    <div className={t.shell} data-palette={palette}>
      <AppNav active="progress" />
      <PaletteBar palette={palette} onChange={setPalette} />

      <main className={t.page}>
        <header className={t.inner}>
          <div className={`${t.hero} ${p.hero}`}>
            <p className={t.eyebrow}>
              <span className={t.eyebrowTitle}>進捗</span>
              <span className={t.eyebrowDate}>{dateLabel} 時点</span>
              <span className={t.sampleTag}>サンプル：数値はダミーです</span>
            </p>

            <h1 className={t.headline}>
              合格準備度は<span className={t.headlineNum}>{score}</span>。
              <br className={t.mobileBreak} />
              {READINESS.bandLabel}のところです。
            </h1>

            <p className={`${t.subline} ${p.pace}`}>
              学習ペース <span className={p.paceLabel}>{PACE.label}</span>
              <span className={t.dot} aria-hidden>
                ・
              </span>
              {PACE.message}
            </p>

            <div className={p.exam}>
              <span className={p.examLabel}>試験まで</span>
              <span className={p.examDays}>
                あと<span className={t.mono}>{EXAM.daysLeft}</span>日
              </span>
              <span className={p.examDate}>{EXAM.dateLabel}</span>
            </div>

            {/* 署名要素: 準備度の目盛り。today の「分の定規」と同じ語彙で、段階と現在地を示す */}
            <figure
              className={`${t.ruler} ${p.scale}`}
              aria-label={`合格準備度 ${score}/100（${READINESS.bandLabel}）`}
            >
              <div className={p.track}>
                {READINESS_BANDS.map((band, i) => {
                  const width = band.to - band.from;
                  const fill = Math.min(
                    1,
                    Math.max(0, (score - band.from) / width),
                  );
                  const current = score >= band.from && score < band.to;
                  return (
                    <div
                      key={band.id}
                      className={p.zone}
                      data-current={current}
                      data-full={fill === 1}
                      style={{
                        left: `${band.from}%`,
                        width: `${width}%`,
                        ["--i" as string]: i,
                        ["--fill" as string]: fill,
                      }}
                    >
                      <span className={p.zoneFill} />
                      <span className={p.zoneLabel}>{band.label}</span>
                    </div>
                  );
                })}
                <span
                  className={t.caret}
                  style={{ left: `${score}%` }}
                  aria-hidden
                >
                  いま {score}
                </span>
              </div>
              <div className={`${t.ticks} ${p.ticks}`} aria-hidden>
                {[0, ...BAND_EDGES, 100].map((m) => (
                  <span
                    key={m}
                    className={t.tickLabel}
                    style={{ left: `${m}%` }}
                    data-edge={
                      m === 0 ? "start" : m === 100 ? "end" : undefined
                    }
                  >
                    {m}
                  </span>
                ))}
              </div>
            </figure>

            <div className={p.improve}>
              {withMochit ? (
                <div className={t.mochitSay}>
                  <Mochit
                    size="small"
                    screenContext="progress"
                    className={t.mochitFigure}
                  />
                  <p className={t.bubble}>
                    {READINESS.improvement}。{READINESS.improvementReason}
                  </p>
                </div>
              ) : (
                <div className={p.improveText}>
                  <p className={p.improveLabel}>いちばん伸ばせるところ</p>
                  <p className={p.improveMain}>{READINESS.improvement}</p>
                  <p className={p.improveReason}>
                    {READINESS.improvementReason}
                  </p>
                </div>
              )}
              <Link href="/learn" className={p.improveAction}>
                テクノロジの問題を解く
                <Icon name="chevron-right" className={p.chev} />
              </Link>
            </div>
          </div>
        </header>

        <div className={`${t.inner} ${p.body}`}>
          {/* 内訳: 分野別 */}
          <section className={p.card} aria-labelledby="fields-heading">
            <div className={t.sheetHead}>
              <h2 id="fields-heading" className={t.sectionTitle}>
                分野別の準備度
              </h2>
              <span className={t.sectionMeta}>
                出題数は採点対象{SCORED_QUESTIONS}問のうち
              </span>
            </div>
            <ul className={p.fieldList}>
              {FIELDS.map((field) => {
                const band = READINESS_BANDS.find(
                  (b) => field.score >= b.from && field.score < b.to,
                );
                return (
                  <li key={field.id} className={p.field}>
                    <div className={p.fieldHead}>
                      <span className={p.fieldName}>{field.label}</span>
                      <span className={p.fieldMeta}>
                        出題 <span className={t.mono}>{field.questions}</span>問
                      </span>
                      <span className={p.fieldScore}>
                        <span className={t.mono}>{field.score}</span>
                        <span className={p.fieldBand}>{band?.label}</span>
                      </span>
                    </div>
                    <div className={p.fieldBar} aria-hidden>
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
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 内訳: トピックの到達度 */}
          <section className={p.card} aria-labelledby="topics-heading">
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
                style={{ width: topicShare(basicOnly) }}
              />
              <span
                data-tone="work"
                style={{ width: topicShare(TOPICS.needsWork) }}
              />
            </div>
            <dl className={p.legend}>
              {[
                { tone: "ready", label: "本番対応OK", value: TOPICS.examReady },
                { tone: "basic", label: "基礎理解OK", value: basicOnly },
                { tone: "work", label: "要復習", value: TOPICS.needsWork },
                { tone: "rest", label: "これから", value: notStarted },
              ].map((item) => (
                <div
                  key={item.tone}
                  className={p.legendItem}
                  data-tone={item.tone}
                >
                  <dt>{item.label}</dt>
                  <dd>
                    <span className={t.mono}>{item.value}</span>
                  </dd>
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

          {/* 道のり: チェックポイント */}
          <section
            className={`${p.card} ${p.wide}`}
            aria-labelledby="cp-heading"
          >
            <div className={t.sheetHead}>
              <h2 id="cp-heading" className={t.sectionTitle}>
                合格までの道のり
              </h2>
              <span className={t.sectionMeta}>
                最終ゴールまで あと
                <span className={t.mono}>
                  {CHECKPOINTS.length - CURRENT_CHECKPOINT}
                </span>
                CP
              </span>
            </div>
            <ol className={p.steps}>
              {CHECKPOINTS.map((cp) => {
                const state =
                  cp.order < CURRENT_CHECKPOINT
                    ? "done"
                    : cp.order === CURRENT_CHECKPOINT
                      ? "now"
                      : "next";
                return (
                  <li key={cp.order} className={p.step} data-state={state}>
                    <span className={p.stepDot} aria-hidden>
                      {state === "done" && (
                        <svg viewBox="0 0 20 20">
                          <path d="M5.5 10.5l3 3 6-7" />
                        </svg>
                      )}
                    </span>
                    <span className={p.stepCode}>CP{cp.order}</span>
                    <span className={p.stepTitle}>{cp.title}</span>
                  </li>
                );
              })}
            </ol>
            <p className={p.stepNote}>
              いまは{" "}
              <strong>
                CP{CURRENT_CHECKPOINT}「{CHECKPOINTS[CURRENT_CHECKPOINT].title}
                」
              </strong>
              。 必須バッジ{" "}
              <span className={t.mono}>
                {GATE.earned}/{GATE.required}
              </span>{" "}
              をそろえると突破試験に挑戦できます。
            </p>
          </section>

          {/* 道のり: 次の解放 */}
          <section className={p.card} aria-labelledby="unlock-heading">
            <div className={t.sheetHead}>
              <h2 id="unlock-heading" className={t.sectionTitle}>
                次の解放
              </h2>
            </div>
            <ul className={p.unlocks}>
              {UNLOCKS.map((unlock) => (
                <li key={unlock.id}>
                  <Link href={unlock.href} className={p.unlock}>
                    {withMochit && unlock.id === "mochit" && (
                      <Mochit
                        size="xs"
                        screenContext="progress"
                        className={p.unlockMochit}
                      />
                    )}
                    <span className={p.unlockBody}>
                      <span className={p.unlockTitle}>{unlock.title}</span>
                      <span className={p.unlockDetail}>{unlock.detail}</span>
                      <span className={p.unlockBar} aria-hidden>
                        <span style={{ width: `${unlock.ratio * 100}%` }} />
                      </span>
                    </span>
                    <Icon name="chevron-right" className={p.chev} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* 積み上げ */}
          <section className={p.card} aria-labelledby="history-heading">
            <div className={t.sheetHead}>
              <h2 id="history-heading" className={t.sectionTitle}>
                積み上げ
              </h2>
              <span className={t.sectionMeta}>直近12週</span>
            </div>
            <div className={p.history}>
              <div className={p.heatBlock}>
                <div
                  className={p.heat}
                  role="img"
                  aria-label="直近12週の学習した日"
                >
                  {weeks.map((week, wi) => (
                    <div key={wi} className={p.heatWeek}>
                      {week.map((minutes, di) => (
                        <span
                          key={di}
                          className={p.heatDay}
                          data-level={heatLevel(minutes)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <div className={p.heatLegend} aria-hidden>
                  少ない
                  {[0, 1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className={p.heatDay}
                      data-level={level}
                    />
                  ))}
                  多い
                </div>
              </div>
              <dl className={p.stats}>
                <div>
                  <dt>連続学習</dt>
                  <dd>
                    <span className={p.statNum}>{STATS.streak}</span>日
                    <small>ベスト{STATS.longestStreak}日</small>
                  </dd>
                </div>
                <div>
                  <dt>学習した日</dt>
                  <dd>
                    <span className={p.statNum}>{STATS.studyDays}</span>日
                  </dd>
                </div>
                <div>
                  <dt>解いた問題</dt>
                  <dd>
                    <span className={p.statNum}>{STATS.totalAnswers}</span>問
                  </dd>
                </div>
                <div>
                  <dt>正答率</dt>
                  <dd>
                    <span className={p.statNum}>{STATS.accuracy}</span>%
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <nav className={`${p.links} ${p.wide}`} aria-label="くわしく見る">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={p.linkItem}>
                {link.label}
                <Icon name="chevron-right" className={p.chev} />
              </Link>
            ))}
          </nav>
        </div>
      </main>
    </div>
  );
}
